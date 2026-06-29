import { browser } from "webextension-polyfill-ts";
import { XLogger } from "../lib/logger";
import { SyncService } from "./sync.service";
import { createSyncProvider } from "./sync-provider-factory";
import {
  CLAMP_MAX_SYNC_DEBOUNCE_MS,
  DEFAULT_SYNC_DEBOUNCE_MS,
} from "../constants/sync-config";
import type {
  AnySyncConfig,
  LegacyGitHubConfig,
} from "../interfaces/sync-config.interface";
import type { SyncProvider } from "../interfaces/sync.interface";
import { getDeviceHeaderValue } from "./git/shared";
import { IDrawing } from "../interfaces/drawing.interface";

const SYNC_CONFIG_KEY = "syncConfig";
const LEGACY_GITHUB_KEY = "githubConfig";
export class SyncConfigService {
  private static instance: SyncConfigService;
  private syncService: SyncService;

  private constructor() {
    this.syncService = SyncService.getInstance();
  }

  public static getInstance(): SyncConfigService {
    if (!SyncConfigService.instance) {
      SyncConfigService.instance = new SyncConfigService();
    }
    return SyncConfigService.instance;
  }

  private async migrateIfNeeded(): Promise<AnySyncConfig | null> {
    try {
      const current = await browser.storage.local.get(SYNC_CONFIG_KEY);
      if (current[SYNC_CONFIG_KEY]) {
        return current[SYNC_CONFIG_KEY] as AnySyncConfig;
      }

      const legacy = await browser.storage.local.get(LEGACY_GITHUB_KEY);
      if (legacy[LEGACY_GITHUB_KEY]) {
        const lg = legacy[LEGACY_GITHUB_KEY] as LegacyGitHubConfig;
        const migrated: AnySyncConfig = {
          provider: "github",
          token: lg.token,
          owner: lg.repoOwner,
          repo: lg.repoName,
          branch: "main",
        };
        await browser.storage.local.set({ [SYNC_CONFIG_KEY]: migrated });
        // Optionally leave the legacy key; do not delete to be safe.
        XLogger.log("Migrated legacy githubConfig to syncConfig");
        return migrated;
      }
    } catch (e) {
      XLogger.error("Migration error while loading sync config", e);
    }
    return null;
  }

  public async configureSyncProvider(
    config: AnySyncConfig,
    drawingsToSync?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Persist debounce if provided
      if (typeof config.debounceMs === "number") {
        const clamped = Math.max(
          0,
          Math.min(CLAMP_MAX_SYNC_DEBOUNCE_MS, Math.floor(config.debounceMs))
        );
        config.debounceMs = clamped;
        this.syncService.setDebounceMs(clamped);
      }
      // Persist autoSync if provided (default true)
      if (typeof config.autoSync === "boolean") {
        this.syncService.setAutoSync(config.autoSync);
      } else {
        // default on if not specified
        this.syncService.setAutoSync(true);
      }

      await browser.storage.local.set({ [SYNC_CONFIG_KEY]: config });

      const device = getDeviceHeaderValue();
      const provider = createSyncProvider(config, device);
      this.syncService.setProvider(provider);
      await this.syncService.initialize(drawingsToSync || []);

      return { success: true };
    } catch (error) {
      XLogger.error("Failed to configure sync provider", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  //convenience sync debounceMs
  public async getSyncDebounceMs(): Promise<{
    success: boolean;
    debounceMs: number;
    error?: string;
  }> {
    const { config, success, error } = await this.getSyncConfig();
    if (config && success) {
      return {
        success,
        debounceMs: config.debounceMs || DEFAULT_SYNC_DEBOUNCE_MS,
        error,
      };
    }
    return { success, error, debounceMs: DEFAULT_SYNC_DEBOUNCE_MS };
  }

  public async removeSyncProvider(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // If a provider is active, try to delete all currently-synced drawings from remote first
      const currentProvider: SyncProvider | null =
        (this.syncService as any).provider || null;
      if (currentProvider) {
        try {
          const storage = await browser.storage.local.get();
          const synced = (Object.values(storage) as any[]).filter(
            (v) =>
              v &&
              typeof v === "object" &&
              (v as any).id &&
              (v as any).id?.startsWith?.("drawing:") &&
              (v as any).sync === true
          ) as IDrawing[];
          for (const drawing of synced) {
            try {
              //remove sync fields, could resolve incorrect drawing status
              delete drawing.lastSyncAt;
              delete drawing.lastSyncError;
              delete drawing.lastSyncBy;
              delete drawing.sync;
            } catch {}
          }
        } catch {
          // best-effort: ignore remote cleanup failures
        }
      }

      await browser.storage.local.remove(SYNC_CONFIG_KEY);
      // Also clean legacy key if present
      await browser.storage.local.remove(LEGACY_GITHUB_KEY);
      this.syncService.setProvider(null);
      return { success: true };
    } catch (error) {
      XLogger.error("Failed to remove sync provider", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async getSyncConfig(): Promise<{
    success: boolean;
    config?: AnySyncConfig;
    error?: string;
  }> {
    try {
      // Migration path first
      const migrated = await this.migrateIfNeeded();
      if (migrated) {
        return { success: true, config: migrated };
      }

      const stored = await browser.storage.local.get(SYNC_CONFIG_KEY);
      const config = (stored[SYNC_CONFIG_KEY] as AnySyncConfig) || undefined;
      return { success: true, config };
    } catch (error) {
      XLogger.error("Failed to get sync config", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async checkSyncAuth(): Promise<{
    success: boolean;
    isAuthenticated?: boolean;
    error?: string;
  }> {
    try {
      const isAuthenticated = await this.syncService.isAuthenticated();
      return { success: true, isAuthenticated };
    } catch (error) {
      XLogger.error("Failed to check sync auth", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Ensure the in-memory provider on SyncService is populated from stored config.
   * This is needed because MV3 service workers can be suspended; on wake-up the
   * singletons start with no provider until configure runs again.
   */
  public async ensureProvider(opt?: {
    debounceMs?: number;
    autoSync?: boolean;
  }): Promise<void> {
    const s = this.syncService as any;
    if (s.provider) return;
    const res = await this.getSyncConfig();
    if (res.success && res.config) {
      try {
        const cfg: any = res.config;
        if (opt?.debounceMs && typeof opt.debounceMs === "number") {
          this.syncService.setDebounceMs(opt.debounceMs);
        } else {
          if (typeof cfg.debounceMs === "number") {
            this.syncService.setDebounceMs(cfg.debounceMs);
          }
        }
        if (opt?.autoSync && typeof opt.autoSync === "boolean") {
          this.syncService.setAutoSync(opt.autoSync);
        } else {
          if (typeof cfg.autoSync === "boolean") {
            this.syncService.setAutoSync(cfg.autoSync);
          } else {
            this.syncService.setAutoSync(true);
          }
        }
        const device = getDeviceHeaderValue();
        const provider = createSyncProvider(cfg, device);
        this.syncService.setProvider(provider);
      } catch (e) {
        XLogger.error("Failed to hydrate sync provider from config", e);
      }
    }
  }
}

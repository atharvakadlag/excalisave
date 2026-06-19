import { browser } from "webextension-polyfill-ts";
import { SyncProvider, ChangeHistoryItem } from "../interfaces/sync.interface";
import { XLogger } from "../lib/logger";
import { IDrawing } from "../interfaces/drawing.interface";
import {
  MessageType,
  ShowMergeConflictMessage,
} from "../constants/message.types";
import {
  classifyError,
  CircuitBreaker,
  isOnline,
  withBackoff,
} from "./sync/sync-resilience";
import { appendSyncLog, getSyncLog } from "./sync/sync-log";

export class SyncService {
  private static instance: SyncService;
  private provider: SyncProvider | null = null;
  private breaker: CircuitBreaker | null = null;
  private debounceMs = 60000; // default 60s
  private autoSync = true; // default: autosync on change detection
  private lastAttemptAtById = new Map<string, number>();
  private offlineMarkerKey = "syncWasOffline";

  private constructor() {}

  /**
   * Get the singleton instance of the SyncService
   */
  public static getInstance(): SyncService {
    if (!SyncService.instance) SyncService.instance = new SyncService();
    return SyncService.instance;
  }

  public setProvider(provider: SyncProvider | null): void {
    this.provider = provider;
  }

  public getProvider(): SyncProvider | null {
    return this.provider;
  }

  public setDebounceMs(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) {
      this.debounceMs = Math.max(0, Math.min(600000, Math.floor(ms)));
    }
  }

  public getDebounceMs(): number {
    return this.debounceMs;
  }

  public setAutoSync(enabled: boolean): void {
    this.autoSync = !!enabled;
  }

  public getAutoSync(): boolean {
    return this.autoSync;
  }

  private async ensureBreaker(): Promise<CircuitBreaker> {
    if (!this.breaker) {
      this.breaker = new CircuitBreaker();
      await this.breaker.load();
    }
    return this.breaker;
  }

  private shouldDebounce(drawingId: string): boolean {
    if (this.debounceMs <= 0) return false;
    const now = Date.now();
    const last = this.lastAttemptAtById.get(drawingId) || 0;
    if (now - last < this.debounceMs) {
      return true;
    }
    this.lastAttemptAtById.set(drawingId, now);
    return false;
  }

  private async getDeviceName(): Promise<string> {
    try {
      const { syncDeviceName } = (await browser.storage.local.get(
        "syncDeviceName"
      )) as any;
      if (typeof syncDeviceName === "string" && syncDeviceName.trim()) {
        return syncDeviceName.trim();
      }
    } catch {}
    // Derive a stable-ish device label from platform + language
    const plat =
      (typeof navigator !== "undefined" && (navigator as any).userAgent) ||
      "unknown";
    const lang =
      (typeof navigator !== "undefined" && navigator.language) || "en";
    const name = `${plat.split(" ")[0]} (${lang})`.slice(0, 120);
    try {
      await browser.storage.local.set({ syncDeviceName: name });
    } catch {}
    return name;
  }

  private async recordDrawingSyncMeta(
    drawingId: string,
    ok: boolean,
    errReason?: string
  ): Promise<void> {
    try {
      const raw = (await browser.storage.local.get(drawingId))[drawingId] as
        | IDrawing
        | undefined;
      if (!raw) return;
      const now = new Date().toISOString();
      const next: IDrawing = {
        ...raw,
        lastSyncAt: ok ? now : raw.lastSyncAt,
        lastSyncError: ok ? undefined : errReason || raw.lastSyncError,
        lastSyncedBy: ok ? await this.getDeviceName() : raw.lastSyncedBy,
      } as any;
      await browser.storage.local.set({ [drawingId]: next });
    } catch {}
  }

  private async markOffline(): Promise<void> {
    try {
      await browser.storage.local.set({ [this.offlineMarkerKey]: true });
    } catch {}
  }

  private async clearOfflineMarker(): Promise<void> {
    try {
      await browser.storage.local.remove(this.offlineMarkerKey);
    } catch {}
  }

  /**
   * Gentle background nudge: if we previously saw offline and now appear connected,
   * clear the marker and attempt a lightweight pull (syncFiles). Safe to call often.
   */
  public async maybeAutoFlush(): Promise<void> {
    try {
      const got = await browser.storage.local.get(this.offlineMarkerKey);
      if (!got || got[this.offlineMarkerKey] !== true) return;
      if (!isOnline()) return;
      await this.clearOfflineMarker();
      // best-effort gentle pull
      await this.syncFiles().catch(() => {});
      await this.log("info", "Auto-flush after reconnect");
    } catch {}
  }

  private async log(
    level: "info" | "warn" | "error",
    message: string,
    detail?: string
  ) {
    await appendSyncLog({ level, message, detail });
    if (level === "error") XLogger.error(message, detail);
    else if (level === "warn") XLogger.warn(message, detail);
    else XLogger.log(message, detail);
  }

  public async initialize(drawingsToSync: string[]): Promise<void> {
    await this.provider?.initialize?.();
    await this.syncFiles();
    for (const drawingId of drawingsToSync) {
      await this.addSyncToDrawing(drawingId);
    }
  }

  public async addSyncToDrawing(drawingId: string): Promise<void> {
    const drawing = (await browser.storage.local.get(drawingId))[
      drawingId
    ] as IDrawing;

    if (!drawing) return;

    // We set these to null to avoid conflicts with the sync provider
    drawing.sync = true;
    drawing.data.versionDataState = null;
    drawing.data.versionFiles = null;

    await browser.storage.local.set({ [drawingId]: drawing });
  }

  public async isAuthenticated(): Promise<boolean> {
    if (!this.provider) return false;
    const br = await this.ensureBreaker();
    if (!br.canAttempt()) {
      await this.log("warn", "isAuthenticated skipped (circuit open)");
      return false;
    }
    if (await this.provider.isAuthenticated()) {
      await br.recordSuccess();
      return true;
    } else {
      await this.provider.initialize();
      const ok = await this.provider.isAuthenticated();
      if (ok) await br.recordSuccess();
      return ok;
    }
  }

  /**
   * Update a drawing in the sync provider
   * Handles conflict detection and resolution
   * @param drawing The drawing to update
   * @returns Object indicating success status
   */
  public async updateDrawing(
    drawing: IDrawing,
    options: { manual?: boolean } = {}
  ): Promise<{ success: boolean; reason?: string }> {
    if (!drawing.sync) return { success: false, reason: "not-enabled" };
    if (!isOnline()) {
      await this.log("warn", `updateDrawing offline; skipping ${drawing.id}`);
      await this.markOffline();
      await this.recordDrawingSyncMeta(drawing.id, false, "offline");
      return { success: false, reason: "offline" };
    }
    const br = await this.ensureBreaker();
    if (!br.canAttempt()) {
      await this.log(
        "warn",
        `updateDrawing circuit open; skipping ${drawing.id}`
      );
      return { success: false, reason: "circuit-open" };
    }
    const isManual = !!(drawing as any).__manualSync || !!options.manual;

    // When doing an explicit manual sync (Save from excalisave menu, or SYNC_DRAWING),
    // always bypass debounce and autosync gate. Manual syncs ignore debounce entirely.
    if (!isManual) {
      // Check autosync gate first so we don't pollute debounce timer when autosync is off
      if (!this.autoSync) {
        await this.log(
          "info",
          `updateDrawing skipped (autosync disabled) ${drawing.id}`
        );
        return { success: false, reason: "autosync-disabled" };
      }
      if (this.shouldDebounce(drawing.id)) {
        await this.log("info", `updateDrawing debounced ${drawing.id}`);
        return { success: false, reason: "debounced" };
      }
    } else {
      // Manual syncs: update timestamp so a later autosync window starts after this point
      this.lastAttemptAtById.set(drawing.id, Date.now());
    }

    // We set these to null to avoid conflicts with the sync provider
    drawing.sync = true;
    drawing.data.versionDataState = null;
    drawing.data.versionFiles = null;
    // Strip local-only sync meta so it is not persisted to the remote blob
    delete (drawing as any).lastSyncAt;
    delete (drawing as any).lastSyncError;
    delete (drawing as any).lastSyncedBy;

    try {
      const result = await withBackoff(
        () => this.provider!.updateDrawing(drawing),
        {
          maxAttempts: 4,
          baseMs: 400,
          maxMs: 15000,
          shouldRetry: (e, _a, res) => {
            const c = classifyError(e, res || null);
            return !c.fatal;
          },
        }
      );

      if (typeof result === "boolean") {
        if (result) {
          await this.log("info", `Drawing updated in cloud: ${drawing.id}`);
          await br.recordSuccess();
          await this.recordDrawingSyncMeta(drawing.id, true);
          return { success: true };
        } else {
          await this.log(
            "error",
            `Failed to update drawing in cloud: ${drawing.id}`
          );
          await br.recordFailure("provider returned false");
          await this.recordDrawingSyncMeta(drawing.id, false, "provider-false");
          return { success: false, reason: "provider-false" };
        }
      } else if (result && result.conflict) {
        await this.log("warn", `Merge conflict detected: ${drawing.id}`);
        await browser.runtime.sendMessage({
          type: MessageType.SHOW_MERGE_CONFLICT,
          payload: {
            drawingId: drawing.id,
            localDrawing: result.localDrawing,
            remoteDrawing: result.remoteDrawing,
          },
        } as ShowMergeConflictMessage);
        // Do not count conflict as circuit failure
        await this.recordDrawingSyncMeta(drawing.id, false, "conflict");
        return { success: false, reason: "conflict" };
      }

      await br.recordFailure("unknown-result");
      await this.recordDrawingSyncMeta(drawing.id, false, "unknown-result");
      return { success: false, reason: "unknown-result" };
    } catch (e) {
      const c = classifyError(e, null);
      await this.log(
        "error",
        `updateDrawing error for ${drawing.id}: ${c.reason}`,
        String(e)
      );
      if (c.fatal) {
        // Fatal auth/config errors should open the breaker to stop hammering
        await br.recordFailure(e, c.reason);
      } else {
        await br.recordFailure(e, c.reason);
      }
      await this.recordDrawingSyncMeta(drawing.id, false, c.reason);
      return { success: false, reason: c.reason };
    }
  }

  /**
   * Delete a drawing from the sync provider
   * @param drawing The drawing to delete
   */
  public async deleteDrawing(drawing: IDrawing): Promise<void> {
    if (!drawing.sync) return;
    if (!isOnline()) {
      await this.log("warn", `deleteDrawing offline; skipping ${drawing.id}`);
      await this.markOffline();
      return;
    }
    const br = await this.ensureBreaker();
    if (!br.canAttempt()) {
      await this.log(
        "warn",
        `deleteDrawing circuit open; skipping ${drawing.id}`
      );
      return;
    }
    try {
      await withBackoff(() => this.provider!.deleteDrawing(drawing), {
        maxAttempts: 3,
        baseMs: 300,
        maxMs: 10000,
      });
      await br.recordSuccess();
      await this.log("info", `Deleted drawing from cloud: ${drawing.id}`);
    } catch (e) {
      const c = classifyError(e, null);
      await this.log(
        "error",
        `deleteDrawing error for ${drawing.id}: ${c.reason}`,
        String(e)
      );
      await br.recordFailure(e, c.reason);
    }
  }

  /**
   * Force-delete a drawing from the remote provider (used for "unsync" / toggle off).
   * Accepts id or full drawing; bypasses the local .sync flag guard.
   */
  public async deleteDrawingFromSync(
    drawingOrId: string | IDrawing
  ): Promise<void> {
    let drawing: IDrawing | undefined;
    if (typeof drawingOrId === "string") {
      drawing = (await browser.storage.local.get(drawingOrId))[drawingOrId] as
        | IDrawing
        | undefined;
    } else {
      drawing = drawingOrId;
    }
    if (!drawing) return;
    if (!isOnline()) {
      await this.log(
        "warn",
        `deleteDrawingFromSync offline; skipping ${drawing.id}`
      );
      await this.markOffline();
      return;
    }
    const br = await this.ensureBreaker();
    if (!br.canAttempt()) {
      await this.log(
        "warn",
        `deleteDrawingFromSync circuit open; skipping ${drawing.id}`
      );
      return;
    }
    try {
      await withBackoff(() => this.provider!.deleteDrawing(drawing!), {
        maxAttempts: 3,
        baseMs: 300,
        maxMs: 10000,
      });
      await br.recordSuccess();
      await this.log("info", `Force-deleted drawing from cloud: ${drawing.id}`);
    } catch (e) {
      const c = classifyError(e, null);
      await this.log(
        "error",
        `deleteDrawingFromSync error for ${drawing.id}: ${c.reason}`,
        String(e)
      );
      await br.recordFailure(e, c.reason);
    }
  }

  /**
   * Get the change history from the provider
   * @param limit Maximum number of history items to return
   * @return Promise<ChangeHistoryItem[]>
   */
  public async getChangeHistory(limit?: number): Promise<ChangeHistoryItem[]> {
    if (!isOnline()) {
      await this.log("warn", "getChangeHistory offline; skipping");
      await this.markOffline();
      return [];
    }
    const br = await this.ensureBreaker();
    if (!br.canAttempt()) {
      await this.log("warn", "getChangeHistory circuit open; skipping");
      return [];
    }
    try {
      const res = await withBackoff(
        () => this.provider!.getChangeHistory(limit),
        {
          maxAttempts: 2,
          baseMs: 200,
          maxMs: 8000,
        }
      );
      await br.recordSuccess();
      return res;
    } catch (e) {
      const c = classifyError(e, null);
      await this.log("error", `getChangeHistory error: ${c.reason}`, String(e));
      await br.recordFailure(e, c.reason);
      return [];
    }
  }

  /**
   * Sync files from the provider to local storage
   * Updates the sync folder with the latest drawings
   */
  public async syncFiles(): Promise<void> {
    if (!isOnline()) {
      await this.log("warn", "syncFiles offline; skipping");
      await this.markOffline();
      return;
    }
    await this.clearOfflineMarker();
    const br = await this.ensureBreaker();
    if (!br.canAttempt()) {
      await this.log("warn", "syncFiles circuit open; skipping");
      return;
    }
    try {
      const drawings: IDrawing[] = await withBackoff(
        () => this.provider!.getAllFiles(),
        {
          maxAttempts: 3,
          baseMs: 400,
          maxMs: 12000,
        }
      );
      if (drawings.length === 0) {
        await this.log("info", "No drawings to sync from remote");
        await br.recordSuccess();
        return;
      }
      for (const drawing of drawings) {
        await browser.storage.local.set({ [drawing.id]: drawing });
      }
      await br.recordSuccess();
      await this.log("info", `Synced ${drawings.length} drawings from remote`);
    } catch (e) {
      const c = classifyError(e, null);
      await this.log("error", `syncFiles error: ${c.reason}`, String(e));
      await br.recordFailure(e, c.reason);
    }
  }

  // --- health + log helpers exposed for UI ---

  public async getHealth(): Promise<
    import("./sync/sync-resilience").SyncHealth
  > {
    const br = await this.ensureBreaker();
    return br.getState();
  }

  public async resetHealth(): Promise<void> {
    const br = await this.ensureBreaker();
    await br.reset();
    await this.log("info", "Sync health reset");
  }

  public async getRecentLog(): Promise<
    import("./sync/sync-resilience").SyncLogEntry[]
  > {
    return getSyncLog();
  }

  public async clearLog(): Promise<void> {
    const { clearSyncLog } = await import("./sync/sync-log");
    await clearSyncLog();
  }

  /**
   * Called by background on wake-up to perform a gentle auto-flush if we were offline.
   */
  public async autoFlushIfReconnected(): Promise<void> {
    await this.maybeAutoFlush();
  }
}

import { browser } from "webextension-polyfill-ts";

export type SyncLogLevel = "info" | "warn" | "error";

export interface SyncLogEntry {
  ts: string;
  level: SyncLogLevel;
  message: string;
  detail?: string;
}

export interface SyncHealth {
  state: "closed" | "open" | "half-open";
  failures: number;
  openedAt?: string;
  lastError?: string;
}

/**
 * connected locally isnt reliable enough, also check addEventListener
 *
 */
export function isOnline(): boolean {
  // Primary signal from the browser
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean"
  ) {
    return navigator.onLine;
  }
  // If we can't tell, assume we can try (the request will surface real errors)
  // // window.addEventListener('offline', () => {
  //     console.log("The browser has detected it is offline.");
  //     // Insert code here to change UI or disable buttons
  // });
  //
  // window.addEventListener('online', () => {
  //     console.log("The browser is back online.");
  // });
  //

  return true;
}

export function classifyError(
  error: unknown,
  res?: Response | null
): { fatal: boolean; reason: string } {
  const status = res ? res.status : undefined;

  if (status === 401 || status === 403) {
    return { fatal: true, reason: `auth-error-${status}` };
  }
  if (status === 404) {
    // File-level 404s are recoverable (we can recreate on push).
    // Repo/owner level 404s are usually fatal, but we treat 404 uniformly as recoverable here
    // and let higher-level (auth/repo config) be caught by 401/403 or explicit messages.
    return { fatal: false, reason: "not-found" };
  }
  if (status === 429) {
    return { fatal: false, reason: "rate-limited" };
  }
  if (status && status >= 500) {
    return { fatal: false, reason: `http-${status}` };
  }

  const msg = (
    error instanceof Error ? error.message : String(error || "")
  ).toLowerCase();
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("typeerror")
  ) {
    return { fatal: false, reason: "network" };
  }
  if (msg.includes("abort") || msg.includes("timeout")) {
    return { fatal: false, reason: "timeout" };
  }

  return { fatal: false, reason: "unknown" };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: {
    maxAttempts?: number;
    baseMs?: number;
    maxMs?: number;
    shouldRetry?: (
      err: unknown,
      attempt: number,
      res?: Response | null
    ) => boolean;
  } = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseMs = opts.baseMs ?? 500;
  const maxMs = opts.maxMs ?? 30000;
  const shouldRetry = opts.shouldRetry ?? (() => true);

  let attempt = 0;
  let lastErr: unknown;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // Try to extract Response if the fn surfaces it (we will wrap in places that can)
      const res =
        (e as any)?.response instanceof Response
          ? ((e as any).response as Response)
          : null;

      if (attempt >= maxAttempts || !shouldRetry(e, attempt, res)) {
        throw e;
      }

      // Honor Retry-After if present (seconds or http-date)
      let delay = Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));
      if (res && res.headers) {
        const ra = res.headers.get("Retry-After");
        if (ra) {
          const asNum = Number(ra);
          if (!Number.isNaN(asNum) && asNum > 0) {
            delay = Math.min(maxMs, asNum * 1000);
          } else {
            const date = Date.parse(ra);
            if (!Number.isNaN(date)) {
              delay = Math.max(0, Math.min(maxMs, date - Date.now()));
            }
          }
        }
      }

      // Full jitter
      const jitter = Math.floor(Math.random() * (delay + 1));
      await sleep(jitter);
    }
  }
  // Unreachable
  throw lastErr;
}

const SYNC_HEALTH_KEY = "syncHealth";

export class CircuitBreaker {
  private health: SyncHealth = { state: "closed", failures: 0 };

  constructor(
    private readonly storageKey: string = SYNC_HEALTH_KEY,
    private readonly opts: { failureThreshold: number; openMs: number } = {
      failureThreshold: 5,
      openMs: 60000,
    }
  ) {}

  async load(): Promise<void> {
    try {
      const storage: any = (browser as any)?.storage?.local || null;
      if (!storage) return;
      const got = await storage.get(this.storageKey);
      const raw = got && got[this.storageKey];
      if (raw && typeof raw === "object") {
        this.health = {
          state: (raw as any).state || "closed",
          failures: (raw as any).failures || 0,
          openedAt: (raw as any).openedAt,
          lastError: (raw as any).lastError,
        };
      }
    } catch {
      // ignore storage errors; start closed
    }
  }

  private async persist(): Promise<void> {
    try {
      const storage: any = (browser as any)?.storage?.local || null;
      if (!storage) return;
      await storage.set({ [this.storageKey]: this.health });
    } catch {
      // best effort
    }
  }

  getState(): SyncHealth {
    // Auto-transition out of open if time has passed
    if (this.health.state === "open" && this.health.openedAt) {
      const opened = Date.parse(this.health.openedAt);
      if (!Number.isNaN(opened) && Date.now() - opened >= this.opts.openMs) {
        this.health.state = "half-open";
        // do not persist here to avoid churn; next record will persist
      }
    }
    return { ...this.health };
  }

  canAttempt(): boolean {
    const s = this.getState();
    if (s.state === "closed") return true;
    if (s.state === "half-open") return true;
    return false;
  }

  async recordSuccess(): Promise<void> {
    this.health = { state: "closed", failures: 0 };
    await this.persist();
  }

  async recordFailure(err: unknown, reason?: string): Promise<void> {
    const now = new Date().toISOString();
    const r = reason || classifyError(err, null).reason;

    if (this.health.state === "half-open") {
      // Failed probe → re-open
      this.health = {
        state: "open",
        failures: this.opts.failureThreshold,
        openedAt: now,
        lastError: r,
      };
      await this.persist();
      return;
    }

    const nextFailures = (this.health.failures || 0) + 1;
    if (nextFailures >= this.opts.failureThreshold) {
      this.health = {
        state: "open",
        failures: nextFailures,
        openedAt: now,
        lastError: r,
      };
    } else {
      this.health = {
        state: "closed",
        failures: nextFailures,
        lastError: r,
      };
    }
    await this.persist();
  }

  async reset(): Promise<void> {
    this.health = { state: "closed", failures: 0 };
    try {
      const storage: any = (browser as any)?.storage?.local || null;
      if (storage) await storage.remove(this.storageKey);
    } catch {}
  }
}

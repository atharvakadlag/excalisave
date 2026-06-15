import { SyncLogEntry } from "./sync-resilience";
import { browser } from "webextension-polyfill-ts";

const SYNC_LOG_KEY = "syncLog";
const MAX_LOG = 200;

export async function appendSyncLog(
  entry: Omit<SyncLogEntry, "ts">
): Promise<void> {
  const ts = new Date().toISOString();
  const full: SyncLogEntry = { ts, ...entry };
  try {
    const storage: any = (browser as any)?.storage?.local || null;
    if (!storage) return;

    const got = await storage.get(SYNC_LOG_KEY);
    const arr: any[] = Array.isArray(got?.[SYNC_LOG_KEY])
      ? got[SYNC_LOG_KEY]
      : [];
    const next = [...arr, full].slice(-MAX_LOG);
    await storage.set({ [SYNC_LOG_KEY]: next });
  } catch {
    // best effort
  }
}

export async function getSyncLog(): Promise<SyncLogEntry[]> {
  try {
    const storage: any = (browser as any)?.storage?.local || null;
    if (!storage) return [];
    const got = await storage.get(SYNC_LOG_KEY);
    const arr = got?.[SYNC_LOG_KEY];
    return Array.isArray(arr) ? (arr as SyncLogEntry[]) : [];
  } catch {
    return [];
  }
}

export async function clearSyncLog(): Promise<void> {
  try {
    const storage: any = (browser as any)?.storage?.local || null;
    if (!storage) return;
    await storage.remove(SYNC_LOG_KEY);
  } catch {}
}

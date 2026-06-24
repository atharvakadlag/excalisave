import { browser } from "webextension-polyfill-ts";
import {
  CleanupFilesMessage,
  ConfigureSyncProviderMessage,
  DeleteDrawingMessage,
  GetChangeHistoryMessage,
  MessageType,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
  SetSyncAutoSyncMessage,
  SetSyncDebounceMessage,
  SyncDrawingMessage,
} from "../constants/message.types";
import { getDeviceHeaderValue } from "../services/git/shared";
import { IDrawing } from "../interfaces/drawing.interface";
import { XLogger } from "../lib/logger";
import { TabUtils } from "../lib/utils/tab.utils";
import { RandomUtils } from "../lib/utils/random.utils";
import { SyncService } from "../services/sync.service";
import { SyncConfigService } from "../services/sync-config.service";

// Initialize services
const syncService = SyncService.getInstance();
const syncConfigService = SyncConfigService.getInstance();

browser.runtime.onInstalled.addListener(async () => {
  XLogger.log("onInstalled...");

  for (const cs of (browser.runtime.getManifest() as any).content_scripts) {
    for (const tab of await browser.tabs.query({ url: cs.matches })) {
      browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: cs.js,
      });
    }
  }
});

browser.runtime.onMessage.addListener(
  async (
    message:
      | SaveDrawingMessage
      | SaveNewDrawingMessage
      | CleanupFilesMessage
      | DeleteDrawingMessage
      | GetChangeHistoryMessage
      | SetSyncDebounceMessage
      | SetSyncAutoSyncMessage
      | ConfigureSyncProviderMessage
      | SyncDrawingMessage
      | any,
    _sender: any
  ) => {
    try {
      XLogger.log("Message background", message);
      if (!message || !message.type)
        return { success: false, error: "Invalid message" };

      switch (message.type) {
        case "OpenPopup":
          // The in-page Excalisave button (next to diagram name) creates its own
          // positioned iframe overlay directly in the content script so it can
          // appear right under the triggering button. No new window is used.
          // The toolbar action icon uses the native popup.
          browser.action.openPopup();
          return { success: true };

        case MessageType.SAVE_NEW_DRAWING:
          await syncConfigService.ensureProvider();
          await syncService.autoFlushIfReconnected();
          const drawing: IDrawing = {
            id: message.payload.id,
            name: message.payload.name,
            sync: message.payload.sync || false,
            createdAt: new Date().toISOString(),
            imageBase64: message.payload.imageBase64,
            viewBackgroundColor: message.payload.viewBackgroundColor,
            data: {
              excalidraw: message.payload.excalidraw,
              excalidrawState: message.payload.excalidrawState,
              versionFiles: message.payload.versionFiles,
              versionDataState: message.payload.versionDataState,
            },
          };

          await browser.storage.local.set({ [message.payload.id]: drawing });
          if (message.payload.manualSync) (drawing as any).__manualSync = true;
          const saveResult = await syncService.updateDrawing(drawing, {
            manual: !!message.payload.manualSync,
          });
          return { success: saveResult.success };

        case MessageType.SAVE_DRAWING:
          await syncConfigService.ensureProvider();
          await syncService.autoFlushIfReconnected();
          const exitentDrawing = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!exitentDrawing) {
            XLogger.error("No drawing found with id", message.payload.id);
            return { success: false, error: "No drawing found with id" };
          }

          const newData: IDrawing = {
            ...exitentDrawing,
            name: message.payload.name || exitentDrawing.name,
            sync: message.payload.sync || exitentDrawing.sync,
            imageBase64:
              message.payload.imageBase64 || exitentDrawing.imageBase64,
            viewBackgroundColor:
              message.payload.viewBackgroundColor ||
              exitentDrawing.viewBackgroundColor,
            data: {
              excalidraw: message.payload.excalidraw,
              excalidrawState: message.payload.excalidrawState,
              versionFiles: message.payload.versionFiles,
              versionDataState: message.payload.versionDataState,
            },
          };

          await browser.storage.local.set({
            [message.payload.id]: newData,
          });

          if (message.payload.manualSync) (newData as any).__manualSync = true;
          const updateResult = await syncService.updateDrawing(newData, {
            manual: !!message.payload.manualSync,
          });
          return { success: updateResult.success };

        case MessageType.SYNC_DRAWING:
          await syncConfigService.ensureProvider();
          await syncService.autoFlushIfReconnected();
          const drawingToSync = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!drawingToSync) {
            XLogger.error("No drawing found with id", message.payload.id);
            return { success: false, error: "No drawing found with id" };
          }

          (drawingToSync as any).__manualSync = true;
          const syncResult = await syncService.updateDrawing(drawingToSync, {
            manual: true,
          });
          return { success: syncResult.success };

        case MessageType.DELETE_DRAWING:
          XLogger.info("Deleting drawing", message.payload.id);

          await syncConfigService.ensureProvider();
          await syncService.autoFlushIfReconnected();

          const drawingToDelete = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!drawingToDelete) return { success: true };

          await syncService.deleteDrawing(drawingToDelete);
          return { success: true };

        case MessageType.CLEANUP_FILES:
          XLogger.info("Cleaning up files");

          const drawings = Object.values(
            await browser.storage.local.get()
          ).filter((o) => o?.id?.startsWith?.("drawing:"));

          const imagesUsed = drawings
            .map((drawing) => {
              return JSON.parse(drawing.data.excalidraw).filter(
                (item: any) => item.type === "image"
              );
            })
            .flat()
            .map<string>((item) => item?.fileId);

          const uniqueImagesUsed = Array.from(new Set(imagesUsed));

          XLogger.log("Used fileIds", uniqueImagesUsed);

          // This workaround is to pass params to script, it's ugly, but it works
          await browser.scripting.executeScript({
            target: {
              tabId: message.payload.tabId,
            },
            func: (fileIds: string[], executionTimestamp: number) => {
              window.__SCRIPT_PARAMS__ = { fileIds, executionTimestamp };
            },
            args: [uniqueImagesUsed, message.payload.executionTimestamp],
          });

          await browser.scripting.executeScript({
            target: { tabId: message.payload.tabId },
            files: ["./js/execute-scripts/delete-unused-files.bundle.js"],
          });

          return { success: true };

        case "MessageAutoSave":
          const name = message.payload.name;
          const setCurrent = message.payload.setCurrent;
          XLogger.log("Saving new drawing", { name });
          const activeTab = await TabUtils.getActiveTab();

          if (!activeTab) {
            XLogger.warn("No active tab found");
            return { success: false, error: "No active tab found" };
          }

          // doing this kind of breaks the auto syncing.
          // There should be a proper check to see if the file already exist as a stored file
          const id = `drawing:${RandomUtils.generateRandomId()}`;

          // This workaround is to pass params to script, it's ugly, but it works
          await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (id, name, setCurrent) => {
              window.__SCRIPT_PARAMS__ = { id, name, setCurrent };
            },
            args: [id, name, setCurrent],
          });

          await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["./js/execute-scripts/sendDrawingDataToSave.bundle.js"],
          });

          return { success: true };

        case MessageType.CONFIGURE_SYNC_PROVIDER:
          // Persist device name derived from header for attribution
          try {
            const dev = getDeviceHeaderValue();
            await browser.storage.local.set({ syncDeviceName: dev });
          } catch {}
          return await syncConfigService.configureSyncProvider(
            message.payload.config,
            message.payload.drawingsToSync
          );

        case MessageType.REMOVE_SYNC_PROVIDER:
          return await syncConfigService.removeSyncProvider();

        case MessageType.GET_SYNC_CONFIG:
          return await syncConfigService.getSyncConfig();

        case MessageType.CHECK_SYNC_AUTH:
          return await syncConfigService.checkSyncAuth();

        case MessageType.CLEAR_DRAWING_ID:
          // Vestigial no-op: page-side overwrite flow already avoids setting current id
          // Also handle raw string for any legacy senders
          return { success: true };

        case MessageType.DELETE_DRAWING_SYNC:
          await syncConfigService.ensureProvider();
          // Use the tolerant helper that accepts id string and forces remote delete
          await syncService.deleteDrawingFromSync(message.payload.id);
          return { success: true };

        case MessageType.GET_CHANGE_HISTORY:
          const changeHistory = await syncService.getChangeHistory(
            message.payload?.limit
          );

          return {
            success: true,
            commits: changeHistory,
          };

        case MessageType.RESET_SYNC_HEALTH:
          await syncConfigService.ensureProvider();
          await syncService.resetHealth();
          return { success: true };

        case MessageType.GET_SYNC_HEALTH:
          await syncConfigService.ensureProvider();
          const health = await syncService.getHealth();
          return { success: true, health };

        case MessageType.GET_SYNC_LOG:
          await syncConfigService.ensureProvider();
          const log = await syncService.getRecentLog();
          return { success: true, log };

        case MessageType.CLEAR_SYNC_LOG:
          await syncConfigService.ensureProvider();
          await syncService.clearLog();
          return { success: true };

        case MessageType.SYNC_FLUSH:
          await syncConfigService.ensureProvider();
          // Gentle nudge: try to pull latest and let per-drawing saves push on demand
          await syncService.syncFiles();
          return { success: true };

        case MessageType.SET_SYNC_DEBOUNCE:
          // const { debounceMs: ms } = message.payload?.debounceMs
          //   ? await syncConfigService.setSyncDebounceMs(
          //       message.payload.debounceMs
          //     )
          //   : await syncConfigService.getSyncDebounceMs();
          syncService.setDebounceMs(message.payload.debounceMs);
          return { success: true };

        case MessageType.SET_SYNC_AUTOSYNC:
          const as = !!message.payload?.autoSync;
          syncService.setAutoSync(as);
          try {
            const cur = await browser.storage.local.get("syncConfig");
            if (cur && cur.syncConfig) {
              await browser.storage.local.set({
                syncConfig: { ...cur.syncConfig, autoSync: as },
              });
            }
          } catch {}
          return { success: true };

        default:
          XLogger.warn("Unknown message type received in background", message);
          return {
            success: false,
            error: `Unknown message type: ${String(message?.type)}`,
          };
      }
    } catch (error) {
      XLogger.error("Error on background message listener", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
);

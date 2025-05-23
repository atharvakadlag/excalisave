import { browser } from "webextension-polyfill-ts";
import {
  CleanupFilesMessage,
  ConfigureGithubProviderMessage,
  DeleteDrawingMessage,
  GetChangeHistoryMessage,
  MessageType,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";
import { XLogger } from "../lib/logger";
import { TabUtils } from "../lib/utils/tab.utils";
import { RandomUtils } from "../lib/utils/random.utils";
import { SyncService } from "../services/sync.service";
import { GitHubConfigService } from "../services/github/github-config.service";

// Initialize services
const syncService = SyncService.getInstance();
const githubConfigService = GitHubConfigService.getInstance();

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
      | ConfigureGithubProviderMessage
      | any,
    _sender: any
  ) => {
    try {
      XLogger.log("Message background", message);
      if (!message || !message.type)
        return { success: false, error: "Invalid message" };

      switch (message.type) {
        case "OpenPopup":
          browser.action.openPopup();
          break;

        case MessageType.SAVE_NEW_DRAWING:
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
          const saveResult = await syncService.updateDrawing(drawing);
          return { success: saveResult.success };

        case MessageType.SAVE_DRAWING:
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

          const updateResult = await syncService.updateDrawing(newData);
          return { success: updateResult.success };

        case MessageType.SYNC_DRAWING:
          const drawingToSync = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!drawingToSync) {
            XLogger.error("No drawing found with id", message.payload.id);
            return { success: false, error: "No drawing found with id" };
          }

          const syncResult = await syncService.updateDrawing(drawingToSync);
          return { success: syncResult.success };

        case MessageType.DELETE_DRAWING:
          XLogger.info("Deleting drawing", message.payload.id);

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

        case MessageType.CONFIGURE_GITHUB_PROVIDER:
          return await githubConfigService.configureGitHubProvider(
            message.payload.token,
            message.payload.repoOwner,
            message.payload.repoName,
            message.payload.drawingsToSync
          );

        case "REMOVE_GITHUB_PROVIDER":
          return await githubConfigService.removeGitHubProvider();

        case "GET_GITHUB_CONFIG":
          return await githubConfigService.getGitHubConfig();

        case "CHECK_GITHUB_AUTH":
          return await githubConfigService.checkGitHubAuth();

        case MessageType.DELETE_DRAWING_SYNC:
          return await syncService.deleteDrawing(message.payload.id);

        case MessageType.GET_CHANGE_HISTORY:
          const changeHistory = await syncService.getChangeHistory(
            message.payload?.limit
          );

          return {
            success: true,
            commits: changeHistory,
          };

        default:
          return { success: false, error: "Unknown message type" };
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

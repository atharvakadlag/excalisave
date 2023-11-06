import { browser } from "webextension-polyfill-ts";
import { RandomUtils } from "./utils/random.utils";
import { TabUtils } from "./utils/tab.utils";
import { DRAWING_ID_KEY_LS } from "./constants";
import { XLogger } from "./logger";

type SaveDrawingProps = {
  name: string;
};

export class DrawingStore {
  static async saveNewDrawing({ name }: SaveDrawingProps) {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    const id = RandomUtils.generateRandomId();

    // This workaround is to pass params to script, it's ugly but it works
    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (id, name) => {
        window.__SCRIPT_PARAMS__ = { id, name };
      },
      args: [id, name],
    });

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["./js/execute-scripts/sendDrawingDataToSave.bundle.js"],
    });
  }

  static async loadDrawing(drawingId: string) {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    // This workaround is to pass params to script, it's ugly but it works
    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (drawingId) => {
        window.__SCRIPT_PARAMS__ = { id: drawingId };
      },
      args: [drawingId],
    });

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["./js/execute-scripts/loadDrawing.bundle.js"],
    });
  }

  static async newDrawing() {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["./js/execute-scripts/newDrawing.bundle.js"],
    });
  }

  /**
   * Saves the current drawing the user is working on.
   * No params needed, it takes the id to update from the localStorage.
   */
  static async saveCurrentDrawing() {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["./js/execute-scripts/sendDrawingDataToSave.bundle.js"],
    });
  }

  private static async deleteDrawingFromFavorites(id: string) {
    const favorites =
      (await browser.storage.local.get("favorites"))["favorites"] || [];
    const newFavorites = favorites.filter((fav: string) => fav !== id);

    await browser.storage.local.set({ favorites: newFavorites });
  }

  static async deleteDrawing(id: string) {
    await browser.storage.local.remove(id);

    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (drawingIdKey, deleteDrawingId) => {
        if (localStorage.getItem(drawingIdKey) === deleteDrawingId) {
          localStorage.removeItem(drawingIdKey);
        }
      },
      args: [DRAWING_ID_KEY_LS, id],
    });

    await DrawingStore.deleteDrawingFromFavorites(id);
  }

  static async hasUnsavedChanges(): Promise<boolean> {
    try {
      const activeTab = await TabUtils.getActiveTab();

      if (!activeTab) {
        XLogger.warn("Error loading drawing: No active tab found", {
          activeTab,
        });

        return true;
      }

      const response = await browser.scripting.executeScript({
        func: () => {
          return localStorage.getItem("excalidraw");
        },
        target: { tabId: activeTab.id },
      });

      let hasUnsaved: boolean = true;
      const result = JSON.parse((response as any)?.[0].result as string);

      if (result.length === 0) {
        hasUnsaved = false;
      }

      return hasUnsaved;
    } catch {}

    // By default, show confirmation dialog, we ensure the action is approved.
    return true;
  }
}

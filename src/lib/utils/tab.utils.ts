import {browser, Tabs} from "webextension-polyfill-ts";
import {XLogger} from "../logger";

export class TabUtils {
  static async getActiveTab(): Promise<Tabs.Tab | undefined> {
    // When the popup opens as a separate window (Firefox fallback),
    // the originating Excalidraw tab ID is passed as a URL parameter.
    try {
      const searchParams = new URLSearchParams(globalThis.location?.search || "");
      const targetTabId = searchParams.get("tabId");

      if (targetTabId) {
        return await browser.tabs.get(parseInt(targetTabId, 10));
      }
    } catch {
      // Not in a context with URL params (e.g., background/service worker)
    }

    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tabs.length === 0) {
      XLogger.warn("No active tab found");
      return undefined;
    }

    return tabs[0];
  }
}

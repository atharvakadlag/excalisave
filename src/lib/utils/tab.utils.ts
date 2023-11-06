import { Tabs, browser } from "webextension-polyfill-ts";
import { XLogger } from "../logger";

export class TabUtils {
  static async getActiveTab(): Promise<Tabs.Tab> {
    const tab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.length === 0) {
      XLogger.warn("No active tab found");

      return undefined;
    }

    return tab[0];
  }
}

import { Tabs, browser } from "webextension-polyfill-ts";

export class TabUtils {
  static async getActiveTab(): Promise<Tabs.Tab> {
    const tab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.length === 0) {
      console.error("No active tab found");

      return undefined;
    }

    return tab[0];
  }
}

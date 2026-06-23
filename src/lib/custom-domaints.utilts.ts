import { Tabs, browser } from "webextension-polyfill-ts";
import { CustomDomain } from "../background/background.interfaces";
import { CUSTOM_DOMAINS_KEY } from "../background/custom-domains.utils";

export class CustomDomainUtils {
  static async getCustomDomains(): Promise<CustomDomain[]> {
    const result = await browser.storage.local.get(CUSTOM_DOMAINS_KEY);

    return result[CUSTOM_DOMAINS_KEY] || [];
  }

  static async isAnExcalidrawPage(tab: Tabs.Tab): Promise<boolean> {
    if (tab.url?.startsWith("https://excalidraw.com")) {
      return true;
    }

    const customDomains = await this.getCustomDomains();

    return customDomains.some((domain) => tab.url?.includes(domain.origin));
  }
}

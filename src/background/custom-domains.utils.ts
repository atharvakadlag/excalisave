import { browser } from "webextension-polyfill-ts";
import { CustomDomain } from "./background.interfaces";

export const CUSTOM_DOMAINS_KEY = "excalisave_custom_domains";

export async function getCustomDomains(): Promise<CustomDomain[]> {
  const result = await browser.storage.local.get(CUSTOM_DOMAINS_KEY);

  return result[CUSTOM_DOMAINS_KEY] || [];
}

export async function registerContentScriptForCustomDomains(
  domains: CustomDomain[]
) {
  try {
    await browser.scripting.unregisterContentScripts({
      ids: ["custom-domain-scripts", "custom-domain-overwrite"],
    });
  } catch {}

  const enabledDomains = domains.filter((domain) => domain.enabled);

  if (enabledDomains.length === 0) return;

  const matches = enabledDomains.map((domain) => `${domain.origin}/*`);

  await browser.scripting.registerContentScripts([
    {
      id: "custom-domain-scripts",
      matches,
      js: [
        "libs/react.production.min.js",
        "libs/react-dom.production.min.js",
        "libs/excalidraw.production.min.js",
        "js/content-scripts/listenDrawingUpdates.bundle.js",
      ],
      css: ["css/content-scripts/listenDrawingUpdates.css"],
      runAt: "document_idle",
    },
    {
      id: "custom-domain-overwrite",
      matches,
      js: ["js/content-scripts/addOverwriteAction.bundle.js"],
      runAt: "document_idle",
    },
  ]);
}

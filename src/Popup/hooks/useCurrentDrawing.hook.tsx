import { useEffect, useState } from "react";
import { Scripting, browser } from "webextension-polyfill-ts";
import { TabUtils } from "../../lib/utils/tab.utils";
import { DRAWING_ID_KEY_LS } from "../../lib/constants";
import { XLogger } from "../../lib/logger";

export function useCurrentDrawingId(): {
  currentDrawingId: string;
  inExcalidrawPage: boolean;
  setCurrentDrawingId: (id: string) => void;
} {
  const [inExcalidrawPage, setInExcalidrawPage] = useState<boolean>(true);
  const [currentDrawingId, setCurrentDrawingId] = useState<string>(undefined);

  useEffect(() => {
    const loadCurrentDrawingFromLocalStorage = async () => {
      const activeTab = await TabUtils.getActiveTab();

      if (!activeTab) {
        XLogger.warn("No active tab");

        return;
      }

      if (!activeTab.url.startsWith("https://excalidraw.com")) {
        setInExcalidrawPage(false);
        return;
      }

      const result = await browser.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (drawingIdKey) => {
          return window.localStorage.getItem(drawingIdKey);
        },
        args: [DRAWING_ID_KEY_LS],
      });

      const drawingId = (result as unknown as Scripting.InjectionResult[])?.[0]
        ?.result;

      if (drawingId) setCurrentDrawingId(drawingId);
    };

    loadCurrentDrawingFromLocalStorage();
  }, []);

  return {
    inExcalidrawPage,
    currentDrawingId,
    setCurrentDrawingId,
  };
}

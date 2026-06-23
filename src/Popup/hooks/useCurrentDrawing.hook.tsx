import { useEffect, useState } from "react";
import { Scripting, browser } from "webextension-polyfill-ts";
import { TabUtils } from "../../lib/utils/tab.utils";
import { DRAWING_ID_KEY_LS } from "../../lib/constants";
import { XLogger } from "../../lib/logger";
import { CustomDomainUtils } from "../../lib/custom-domaints.utilts";

export function useCurrentDrawingId(): {
  currentDrawingId: string;
  isLiveCollaboration: boolean;
  inExcalidrawPage: boolean;
  setCurrentDrawingId: (id: string) => void;
  setIsLiveCollaboration: (isLive: boolean) => void;
} {
  const [inExcalidrawPage, setInExcalidrawPage] = useState<boolean>(false);
  const [currentDrawingId, setCurrentDrawingId] = useState<string>(undefined);
  const [isLiveCollaboration, setIsLiveCollaboration] =
    useState<boolean>(false);

  useEffect(() => {
    const loadCurrentDrawingFromLocalStorage = async () => {
      const activeTab = await TabUtils.getActiveTab();

      if (!activeTab) {
        XLogger.warn("No active tab");

        return;
      }

      if (await CustomDomainUtils.isAnExcalidrawPage(activeTab)) {
        setInExcalidrawPage(true);
      } else {
        return;
      }

      if (activeTab.url.includes("#room")) {
        setIsLiveCollaboration(true);
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
    isLiveCollaboration,
    inExcalidrawPage,
    currentDrawingId,
    setCurrentDrawingId,
    setIsLiveCollaboration,
  };
}

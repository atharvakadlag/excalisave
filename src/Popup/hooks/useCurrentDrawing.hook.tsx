import { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { TabUtils } from "../../lib/utils/tab.utils";
import {
  MessageType,
  SetDrawingInfoMessage,
} from "../../constants/message.types";

export function useCurrentDrawingId(): {
  currentDrawingId: string;
  setCurrentDrawingId: (id: string) => void;
} {
  const [currentDrawingId, setCurrentDrawingId] = useState<string>(undefined);

  useEffect(() => {
    browser.runtime.onMessage.addListener((message: SetDrawingInfoMessage) => {
      if (message.type === MessageType.SET_CURRENT_DRAWING_ID) {
        setCurrentDrawingId(message.payload);
      }
    });

    const loadCurrentDrawingFromLocalStorage = async () => {
      const activeTab = await TabUtils.getActiveTab();

      if (!activeTab) {
        console.log("No active tab");

        return;
      }

      await browser.tabs.sendMessage(activeTab.id, {
        type: MessageType.GET_CURRENT_DRAWING_ID,
      });
    };

    loadCurrentDrawingFromLocalStorage();
  }, []);

  return {
    currentDrawingId,
    setCurrentDrawingId,
  };
}

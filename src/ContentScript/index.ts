import { browser } from "webextension-polyfill-ts";
import { MessageType, SetDrawingInfoMessage } from "../constants/message.types";

browser.runtime.onMessage.addListener((message: { type: MessageType }) => {
  switch (message.type) {
    case MessageType.GET_CURRENT_DRAWING_ID:
      const id = localStorage.getItem("__drawing_id");

      if (id) {
        browser.runtime.sendMessage({
          type: MessageType.SET_CURRENT_DRAWING_ID,
          payload: id,
        } as SetDrawingInfoMessage);
      }

      break;
  }
});

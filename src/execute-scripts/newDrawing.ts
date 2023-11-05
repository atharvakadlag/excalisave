import {
  getDrawingDataState,
  getExcalidrawEmptyDataState,
} from "../ContentScript/content-script.utils";
import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { As } from "../lib/types.utils";
const { browser } = require("webextension-polyfill-ts");

(async () => {
  // Save data before load new drawing if there is a current drawing
  const currentDrawingId = localStorage.getItem(DRAWING_ID_KEY_LS);
  if (currentDrawingId) {
    const drawingDataState = await getDrawingDataState();

    await browser.runtime.sendMessage(
      As<SaveDrawingMessage>({
        type: MessageType.SAVE_DRAWING,
        payload: {
          id: currentDrawingId,
          excalidraw: drawingDataState.excalidraw,
          excalidrawState: drawingDataState.excalidrawState,
          versionFiles: drawingDataState.versionFiles,
          versionDataState: drawingDataState.versionDataState,
          imageBase64: drawingDataState.imageBase64,
          viewBackgroundColor: drawingDataState.viewBackgroundColor,
        },
      })
    );
  }

  const emptyDataState = await getExcalidrawEmptyDataState();

  window.addEventListener("beforeunload", () => {
    localStorage.setItem("excalidraw", emptyDataState.excalidraw);
    localStorage.setItem("excalidraw-state", emptyDataState.excalidrawState);
    localStorage.setItem("version-files", emptyDataState.versionFiles);
    localStorage.setItem("version-dataState", emptyDataState.versionDataState);
    localStorage.removeItem(DRAWING_ID_KEY_LS);
  });

  // Reload page to apply changes
  location.reload();
})();

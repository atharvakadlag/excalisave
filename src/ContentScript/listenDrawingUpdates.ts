import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { As } from "../lib/types.utils";
import { getDrawingDataState } from "./content-script.utils";
const { browser } = require("webextension-polyfill-ts");

let prevVersionFiles = localStorage.getItem("version-files");

const timeoutId = setTimeout(() => {
  const intervalId = setInterval(async () => {
    const currentVersionFiles = localStorage.getItem("version-files");

    const currentId = localStorage.getItem("__drawing_id");
    if (currentId && prevVersionFiles !== currentVersionFiles) {
      prevVersionFiles = currentVersionFiles;

      const drawingDataState = await getDrawingDataState();

      browser.runtime.sendMessage(
        As<SaveDrawingMessage>({
          type: MessageType.SAVE_DRAWING,
          payload: {
            id: currentId,
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
  }, 2000);

  window.addEventListener("beforeunload", () => {
    try {
      clearInterval(intervalId);
    } catch {}
  });

  // Start syncing after 5 seconds
}, 5000);

window.addEventListener("beforeunload", () => {
  try {
    clearTimeout(timeoutId);
  } catch {}
});

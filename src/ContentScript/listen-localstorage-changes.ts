import {
  MessageType,
  SaveExistentDrawingMessage,
} from "../constants/message.types";
import { convertBlobToBase64Async } from "../lib/utils/blob-to-base64.util";
import { calculateNewDimensions } from "../lib/utils/calculate-new-dimensions.util";
const { browser } = require("webextension-polyfill-ts");

let prevVersionFiles = localStorage.getItem("version-files");

setInterval(async () => {
  const currentVersionFiles = localStorage.getItem("version-files");
  const currentId = localStorage.getItem("__drawing_id");

  if (currentId && prevVersionFiles !== currentVersionFiles) {
    const startTime = new Date().getTime();
    prevVersionFiles = currentVersionFiles;

    const currentId = localStorage.getItem("__drawing_id");
    const excalidraw = localStorage.getItem("excalidraw");
    const excalidrawState = localStorage.getItem("excalidraw-state");
    const versionFiles = localStorage.getItem("version-files");
    const versionDataState = localStorage.getItem("version-dataState");

    const blob = await window.ExcalidrawLib.exportToBlob({
      elements: JSON.parse(excalidraw),
      getDimensions: (width, height) => {
        return calculateNewDimensions(width, height);
      },
      files: {},
      appState: JSON.parse(excalidrawState),
    });

    // Save Blob
    const imageBase64 = await convertBlobToBase64Async(blob);

    console.log(
      "Take Screenshoot Took: ",
      new Date().getTime() - startTime + "ms"
    );

    browser.runtime
      .sendMessage({
        type: MessageType.SAVE_EXISTENT_DRAWING,
        payload: {
          excalidraw,
          excalidrawState,
          versionFiles,
          versionDataState,
          id: currentId,
          imageBase64,
        },
      } as SaveExistentDrawingMessage)
      .then((_response: any) => {
        // console.info(
        //   `Message ${MessageType.SAVE_EXISTENT_DRAWING} sent successfully.`,
        //   response
        // );
      });
  }
}, 3000);

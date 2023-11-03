import type { Browser } from "webextension-polyfill-ts";
import {
  MessageType,
  SaveExistentDrawingMessage,
} from "../constants/message.types";
import { ExportOptions } from "../interfaces/export-options.interface";
import { calculateNewDimensions } from "../lib/utils/calculate-new-dimensions.util";
import { convertBlobToBase64Async } from "../lib/utils/blob-to-base64.util";
const { browser }: { browser: Browser } = require("webextension-polyfill-ts");

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

    const dataForExcalidraw: ExportOptions = {
      elements: JSON.parse(excalidraw),
      getDimensions: (width, height) => {
        return calculateNewDimensions(width, height);
      },
      files: [],
      appState: JSON.parse(excalidrawState),
    };

    const blob = await window.ExcalidrawLib.exportToBlob(dataForExcalidraw);

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
      .then((_response) => {
        // console.info(
        //   `Message ${MessageType.SAVE_EXISTENT_DRAWING} sent successfully.`,
        //   response
        // );
      });
  }
}, 3000);

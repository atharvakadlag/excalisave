import {
  MessageType,
  SaveExistentDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
import { convertBlobToBase64Async } from "../lib/utils/blob-to-base64.util";
import { calculateNewDimensions } from "../lib/utils/calculate-new-dimensions.util";
const { browser } = require("webextension-polyfill-ts");

const params = window.__SCRIPT_PARAMS__;

if (!params.saveCurrent && (!params?.name || !params?.id)) {
  throw new Error(
    'Error trying to send SAVE_DRAWING message: "name" is missing'
  );
}

const currentId = localStorage.getItem("__drawing_id");
const excalidraw = localStorage.getItem("excalidraw");
const excalidrawState = localStorage.getItem("excalidraw-state");
const versionFiles = localStorage.getItem("version-files");
const versionDataState = localStorage.getItem("version-dataState");

(async () => {
  if (params.saveCurrent && !currentId) {
    throw new Error(
      'Error trying to send SAVE_DRAWING message: currentId "__drawing_id" is missing'
    );
  }

  const blob = await window.ExcalidrawLib.exportToBlob({
    elements: JSON.parse(excalidraw),
    getDimensions: (width, height) => {
      return calculateNewDimensions(width, height);
    },
    // mimeType: 'image/jpeg',
    // quality: 0.01,
    // TODO: Load files from indexDB
    files: {},
    appState: JSON.parse(excalidrawState),
  });

  // Save Blob
  const imageBase64 = await convertBlobToBase64Async(blob);

  const messageType = params.saveCurrent
    ? MessageType.SAVE_EXISTENT_DRAWING
    : MessageType.SAVE_NEW_DRAWING;
  const finalId = params.saveCurrent ? currentId : params.id;

  // Send the value back to the extension
  browser.runtime
    .sendMessage({
      type: messageType,
      payload: {
        excalidraw,
        excalidrawState,
        versionFiles,
        versionDataState,
        id: finalId,
        name: params.name,
        imageBase64,
      },
    } as SaveExistentDrawingMessage | SaveNewDrawingMessage)
    .then((_response: any) => {
      // console.info(`Message ${messageType} sent successfully.`, response);
    });

  localStorage.setItem("__drawing_id", finalId);
})();

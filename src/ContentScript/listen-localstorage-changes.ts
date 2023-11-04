import {
  MessageType,
  SaveExistentDrawingMessage,
} from "../constants/message.types";
import { convertBlobToBase64Async } from "../lib/utils/blob-to-base64.util";
import { calculateNewDimensions } from "../lib/utils/calculate-new-dimensions.util";
const { browser } = require("webextension-polyfill-ts");
import { createStore, getMany } from "idb-keyval";
import type {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from "@excalidraw/excalidraw/types/element/types";
import type {
  BinaryFiles,
  BinaryFileData,
} from "@excalidraw/excalidraw/types/types";

let prevVersionFiles = localStorage.getItem("version-files");

const filesStore = createStore("files-db", "files-store");

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

    const elements = JSON.parse(excalidraw) as ExcalidrawElement[];

    const imageFileIds = elements
      .filter((item): item is ExcalidrawImageElement => item.type === "image")
      .map((item) => item.fileId);

    let files: BinaryFiles = {};

    try {
      const response = await getMany<BinaryFileData | undefined>(
        imageFileIds,
        filesStore
      );

      response.forEach((item) => {
        if (item) {
          files[item.id] = item;
        }
      });
    } catch (error) {
      console.error("Error retrieving files from IndexedDB", error);
    }

    const blob = await window.ExcalidrawLib.exportToBlob({
      elements,
      getDimensions: (width, height) => {
        return calculateNewDimensions(width, height);
      },
      files,
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

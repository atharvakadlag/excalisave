import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/content-script.utils";
import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";
import { createStore, entries, set, values } from "idb-keyval";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { XLogger } from "../lib/logger";
import { As } from "../lib/types.utils";
import { FileId } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
const { browser } = require("webextension-polyfill-ts");

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

type ScriptParams = {
  id: string;
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  const loadDrawingId = params?.id;
  if (!loadDrawingId) {
    XLogger.info("No drawing id found, could not load");

    return;
  }

  // To avoid removing other images while loaded current drawing, update the lastRetrived date
  await entries(filesStore).then((entries) => {
    for (const [id, imageData] of entries as [FileId, BinaryFileData][]) {
      set(
        id,
        {
          ...imageData,
          lastRetrieved: new Date(2400, 0, 1).getTime(),
        },
        filesStore
      );
    }
  });

  // Save data before load new drawing if there is a current drawing
  const currentDrawingId = localStorage.getItem(DRAWING_ID_KEY_LS);

  const url = new URL(window.location.href);

  if (currentDrawingId) {
    XLogger.info("Saving current drawing before load new drawing");
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

  // Load new drawing
  const response = await browser.storage.local.get(loadDrawingId);

  const drawingData = response[loadDrawingId] as IDrawing;

  if (!drawingData) {
    XLogger.error("No drawing data found");

    return;
  }

  const { excalidraw, excalidrawState, versionFiles, versionDataState } =
    drawingData.data;

  // Seems Excalidraw saves data to localStorage before reload page(I guess when there is something pending).
  // To avoid it overwrite our data,  save to localStorage on this event instead.
  // ! TODO: Probably need to move the logic of saving data before switch to here.
  window.addEventListener("beforeunload", () => {
    localStorage.setItem("excalidraw", excalidraw);
    localStorage.setItem("excalidraw-state", excalidrawState);
    localStorage.setItem("version-files", versionFiles);
    localStorage.setItem("version-dataState", versionDataState);
    localStorage.setItem(DRAWING_ID_KEY_LS, loadDrawingId);
  });

  // Reload page in origin url to ensure load localStorage data.
  location.assign(url.origin);
})();

import {
  getScriptParams,
} from "../ContentScript/contentScript.utils";
import { IDrawing } from "../interfaces/drawing.interface";
import { createStore, entries, set } from "idb-keyval";
import { DRAWING_ID_KEY_LS, DRAWING_TITLE_KEY_LS } from "../lib/constants";
import { XLogger } from "../lib/logger";
import { saveCurrentDrawingToStorage } from "../lib/utils/drawing-message.utils";
import { FileId } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { browser } from "webextension-polyfill-ts";

// Where images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

import type { UUID } from "../lib/utils/id.utils";

type ScriptParams = {
  id: UUID;
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  const loadDrawingId = params?.id;
  if (!loadDrawingId) {
    XLogger.info("No drawing id found, could not load");

    return;
  }

  // To avoid images being removed by cleanup process,
  // update the lastRetrived date of other drawings when load the new drawing.
  await entries(filesStore).then((entries) => {
    for (const [id, imageData] of entries as [FileId, BinaryFileData][]) {
      set(
        id,
        {
          ...imageData,
          // Dear future developer (if humanity persists), kindly update this before the year 2400
          lastRetrieved: new Date(2400, 0, 1).getTime(),
        },
        filesStore
      );
    }
  });

  // Save data before load new drawing if there is a current drawing
  const url = new URL(window.location.href);
  await saveCurrentDrawingToStorage();

  // Load new drawing
  const response = await browser.storage.local.get(loadDrawingId);

  const drawingData = response[loadDrawingId] as IDrawing;

  if (!drawingData) {
    XLogger.error("No drawing data found");

    return;
  }

  const { excalidraw, excalidrawState, versionFiles, versionDataState } =
    drawingData.data;

  // If this drawing has a room URL, navigate directly to the room
  // so the user reconnects to the live collaboration session.
  // When switching between two room URLs on the same origin, the browser
  // treats it as a hash-only change and won't reload — so we force it.
  if (drawingData.roomUrl) {
    localStorage.setItem(DRAWING_ID_KEY_LS, loadDrawingId);
    localStorage.setItem(DRAWING_TITLE_KEY_LS, drawingData.name);
    window.location.href = drawingData.roomUrl;
    // If the URL change was just a hash change (same origin), the page
    // won't navigate — force a full reload so Excalidraw reinitializes.
    // If it was a cross-origin navigation, this line never executes.
    window.location.reload();
    return;
  }

  // Excalidraw writes to localStorage on beforeunload, which can overwrite
  // our data. Setting the new drawing's data in beforeunload ensures we
  // write last, after Excalidraw's own handler.
  window.addEventListener("beforeunload", () => {
    localStorage.setItem("excalidraw", excalidraw);
    localStorage.setItem("excalidraw-state", excalidrawState);
    localStorage.setItem("version-files", versionFiles);
    localStorage.setItem("version-dataState", versionDataState);
    localStorage.setItem(DRAWING_ID_KEY_LS, loadDrawingId);
    localStorage.setItem(DRAWING_TITLE_KEY_LS, drawingData.name);
  });

  // Reload page in origin url to ensure load localStorage data.
  location.assign(url.origin);
})();

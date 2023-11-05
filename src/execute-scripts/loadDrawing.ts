import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/content-script.utils";
import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { As } from "../lib/types.utils";
const { browser } = require("webextension-polyfill-ts");

type ScriptParams = {
  id: string;
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  const loadDrawingId = params?.id;
  if (!loadDrawingId) {
    console.info("No drawing id found, could not load");

    return;
  }

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

  // Load new drawing
  const response = await browser.storage.local.get(loadDrawingId);

  const drawingData = response[loadDrawingId] as IDrawing;

  if (!drawingData) {
    console.error("No drawing data found");

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

  // Reload page to apply changes
  location.reload();
})();

import {browser} from "webextension-polyfill-ts";
import {MessageType} from "../../constants/message.types";
import {getDrawingDataState} from "../../ContentScript/contentScript.utils";
import {DRAWING_ID_KEY_LS} from "../constants";
import {XLogger} from "../logger";
import {As} from "../types.utils";
import type {SaveDrawingMessage, SaveNewDrawingMessage} from "../../constants/message.types";
import type {DrawingDataState} from "../../interfaces/drawingDataState.interface";
import type {UUID} from "./id.utils";

type SaveOpts = {
  takeScreenshot?: boolean;
};

/**
 * Saves the current drawing (from localStorage DRAWING_ID) to storage.
 * Returns true if saved successfully or if there was nothing to save.
 */
export async function saveCurrentDrawingToStorage(
  opts: SaveOpts = {takeScreenshot: true}
): Promise<boolean> {
  const currentId = localStorage.getItem(DRAWING_ID_KEY_LS);
  if (!currentId) return true;

  try {
    const data = await getDrawingDataState(opts);
    await browser.runtime.sendMessage(
      As<SaveDrawingMessage>({
        type: MessageType.SAVE_DRAWING,
        payload: {
          id: currentId,
          excalidraw: data.excalidraw,
          excalidrawState: data.excalidrawState,
          versionFiles: data.versionFiles,
          versionDataState: data.versionDataState,
          imageBase64: data.imageBase64,
          viewBackgroundColor: data.viewBackgroundColor,
        },
      })
    );
    return true;
  } catch (error) {
    XLogger.error("Error saving current drawing", error);
    return false;
  }
}

/**
 * Creates a new drawing entry in storage.
 */
export async function saveNewDrawingToStorage(
  id: UUID,
  name: string,
  data: DrawingDataState
): Promise<boolean> {
  try {
    await browser.runtime.sendMessage(
      As<SaveNewDrawingMessage>({
        type: MessageType.SAVE_NEW_DRAWING,
        payload: {
          id,
          name,
          sync: false,
          excalidraw: data.excalidraw,
          excalidrawState: data.excalidrawState,
          versionFiles: data.versionFiles,
          versionDataState: data.versionDataState,
          imageBase64: data.imageBase64,
          viewBackgroundColor: data.viewBackgroundColor,
        },
      })
    );
    return true;
  } catch (error) {
    XLogger.error("Error saving new drawing", error);
    return false;
  }
}

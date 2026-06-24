import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/contentScript.utils";
import {
  MessageType,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
import { DRAWING_ID_KEY_LS, DRAWING_TITLE_KEY_LS } from "../lib/constants";
import { setLocalStorageItemAndNotify } from "../lib/localStorage.utils";
import { browser } from "webextension-polyfill-ts";

import type { UUID } from "../lib/utils/id.utils";

type ScriptParams = {
  name: string;
  id: UUID;
  setCurrent: boolean;
  sync: boolean;
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  const saveAsNew = !!params;

  const setCurrent = params?.setCurrent ?? true;

  if (saveAsNew && (!params?.id || !params?.name)) {
    throw new Error(
      'Error trying to send SAVE_DRAWING message: "name" is missing'
    );
  }

  const drawingId = saveAsNew
    ? params.id
    : localStorage.getItem(DRAWING_ID_KEY_LS);

  if (!drawingId) {
    throw new Error("Drawing id not found. Could not send drawing message.");
  }

  const drawingDataState = await getDrawingDataState();

  browser.runtime.sendMessage({
    type: saveAsNew ? MessageType.SAVE_NEW_DRAWING : MessageType.SAVE_DRAWING,
    payload: {
      id: drawingId,
      name: saveAsNew ? params.name : undefined,
      sync: saveAsNew ? params.sync : undefined,
      excalidraw: drawingDataState.excalidraw,
      excalidrawState: drawingDataState.excalidrawState,
      versionFiles: drawingDataState.versionFiles,
      versionDataState: drawingDataState.versionDataState,
      imageBase64: drawingDataState.imageBase64,
      viewBackgroundColor: drawingDataState.viewBackgroundColor,
    },
  } as SaveDrawingMessage | SaveNewDrawingMessage);

  if (setCurrent && saveAsNew) {
    setLocalStorageItemAndNotify(DRAWING_ID_KEY_LS, drawingId);
    setLocalStorageItemAndNotify(DRAWING_TITLE_KEY_LS, params.name);
  }
})();

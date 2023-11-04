import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/content-script.utils";
import {
  MessageType,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
const { browser } = require("webextension-polyfill-ts");

type ScriptParams = {
  name: string;
  id: string;
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  const saveAsNew = !!params;

  if (saveAsNew && (!params?.id || !params?.name)) {
    throw new Error(
      'Error trying to send SAVE_DRAWING message: "name" is missing'
    );
  }

  const drawingId = saveAsNew
    ? params.id
    : localStorage.getItem("__drawing_id");

  if (!drawingId) {
    throw new Error("Drawing id not found. Could not send drawing message.");
  }

  const drawingDataState = await getDrawingDataState();

  browser.runtime.sendMessage({
    type: saveAsNew ? MessageType.SAVE_NEW_DRAWING : MessageType.SAVE_DRAWING,
    payload: {
      id: drawingId,
      name: saveAsNew ? params.name : undefined,
      excalidraw: drawingDataState.excalidraw,
      excalidrawState: drawingDataState.excalidrawState,
      versionFiles: drawingDataState.versionFiles,
      versionDataState: drawingDataState.versionDataState,
      imageBase64: drawingDataState.imageBase64,
      viewBackgroundColor: drawingDataState.viewBackgroundColor,
    },
  } as SaveDrawingMessage | SaveNewDrawingMessage);

  saveAsNew && localStorage.setItem("__drawing_id", drawingId);
})();

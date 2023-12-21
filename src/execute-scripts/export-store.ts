import { createStore, getMany, values } from "idb-keyval";
import { ExportStore, MessageType } from "../constants/message.types";
import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
const { browser } = require("webextension-polyfill-ts");

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

(async () => {
  const response = await values<BinaryFileData | undefined>(filesStore);

  browser.runtime.sendMessage({
    type: MessageType.EXPORT_STORE,
    payload: {
      files: response,
    },
  } as ExportStore);
})();

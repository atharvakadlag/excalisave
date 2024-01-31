import { createStore } from "idb-keyval";
import { getScriptParams } from "../ContentScript/content-script.utils";
const { browser } = require("webextension-polyfill-ts");

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

type ScriptParams = {
  files: any[];
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  console.log("Received params, adding to indexedDB", params);
})();

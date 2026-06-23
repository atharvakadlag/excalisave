import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createStore, keys, set, update } from "idb-keyval";
import { getScriptParams } from "../ContentScript/content-script.utils";
import { XLogger } from "../lib/logger";
import { browser } from "webextension-polyfill-ts";
import { MessageType } from "../constants/message.types";

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

type ScriptParams = {
  files: Record<string, BinaryFileData>;
};

(async () => {
  try {
    const params = getScriptParams<ScriptParams | undefined>();

    const files = params?.files;

    if (!files) {
      XLogger.warn("No files found");
      return;
    }

    XLogger.debug(" Received files, adding to IndexedDB", params);

    const storeKeys = await keys(filesStore);

    const fileIdsToUpdate = storeKeys.filter(
      (key) => files[key.toString()] !== undefined,
    );

    XLogger.debug("Ids of files that needs to be updated", fileIdsToUpdate);

    const fileIds = Object.keys(files);
    for (const fileId of fileIds) {
      const file = files[fileId];
      // Update lastRetrieved date to avoid images being removed by cleanup process
      file.lastRetrieved = new Date(2500, 0, 1).getTime();

      if (fileIdsToUpdate.includes(fileId)) {
        // Update if exists
        await update(fileId, () => file, filesStore);
      } else {
        // Create otherwise
        await set(fileId, file, filesStore);
      }
    }

    XLogger.debug("Files added to IndexedDB");
  } catch (error) {
    await browser.runtime.sendMessage({
      type: MessageType.ERROR_LOADING_STORE,
      payload: error,
    });
  } finally {
    // Close tab finish import
    window.close();
  }
})();

import { createStore, keys } from "idb-keyval";
import { CleanupFiles, MessageType } from "../constants/message.types";
const { browser } = require("webextension-polyfill-ts");

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

(async () => {
  // Check if there are files to remove
  const { filesToRemove } = (await browser.storage.session.get(
    "filesToRemove"
  )) as { filesToRemove: string[] };

  if (filesToRemove && filesToRemove.length) {
    // Remove files
    for (const fileId of filesToRemove) {
      await filesStore.delete(fileId);
    }

    // Clear the list of files to remove
    await browser.storage.session.remove("filesToRemove");
  }

  const fileKeys = await keys(filesStore);

  browser.runtime.sendMessage({
    type: MessageType.CLEANUP_FILES,
    payload: {
      fileIds: fileKeys,
    },
  } as CleanupFiles);
})();

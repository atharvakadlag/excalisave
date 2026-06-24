import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createStore, del, get, keys } from "idb-keyval";
import { getScriptParams } from "../ContentScript/contentScript.utils";
import { XLogger } from "../lib/logger";

// Where images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

type ScriptParams = {
  fileIds: string[];
  executionTimestamp: number;
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  if (
    !params ||
    !params.fileIds ||
    !params.fileIds.length ||
    !params.executionTimestamp
  ) {
    XLogger.debug("No files to remove");

    return;
  }

  XLogger.debug("Removing unused files", {
    usedFileIds: params.fileIds,
    executionTimestamp: params.executionTimestamp,
  });

  const usedFileIds = params.fileIds;
  const fileKeys = await keys(filesStore);

  for (const key of fileKeys) {
    // Skip if the file is used
    if (usedFileIds.includes(key.toString())) {
      continue;
    }

    const file = await get<BinaryFileData>(key, filesStore);
    XLogger.debug("Checking file if it's unused", {
      file,
    });

    // Skip deletion if a file was created after the execution timestamp
    if (file.created > params.executionTimestamp) {
      continue;
    }

    XLogger.debug("Removing file", key);

    await del(key, filesStore);
  }
})();

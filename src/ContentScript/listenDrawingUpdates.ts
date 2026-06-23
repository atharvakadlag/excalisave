import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { XLogger } from "../lib/logger";
import { As } from "../lib/types.utils";
import { waitForElement } from "../lib/utils/wait-for-element.util";
import { getDrawingDataState } from "./content-script.utils";
import { initExcalidrawClientUI } from "./excalidraw-client-ui";
const { browser } = require("webextension-polyfill-ts");

// ----------- Content Script Cleanup --------------------
const DESTRUCTION_EVENT = "destruct-my-extension_2_" + browser.runtime.id;
document.dispatchEvent(new CustomEvent(DESTRUCTION_EVENT));

let timeoutId: number;
let intervalId: number;

document.addEventListener(DESTRUCTION_EVENT, () => {
  try {
    XLogger.log("Cleaning up from updates...", {
      DESTRUCTION_EVENT,
      timeoutId,
      intervalId,
    });
    clearTimeout(timeoutId);
    clearInterval(intervalId);
  } catch {}
});

browser.runtime.connect().onDisconnect.addListener(function () {
  XLogger.log("⛽️️️️️️️️️️️️️️️️p️RUntime disconnect");
});
// -----------  Content Script Cleanup  --------------------

let prevVersionFiles = localStorage.getItem("version-files");

timeoutId = window.setTimeout(() => {
  intervalId = window.setInterval(async () => {
    const currentVersionFiles = localStorage.getItem("version-files");

    const currentId = localStorage.getItem(DRAWING_ID_KEY_LS);
    if (currentId && prevVersionFiles !== currentVersionFiles) {
      prevVersionFiles = currentVersionFiles;

      const drawingDataState = await getDrawingDataState();

      try {
        await browser.runtime.sendMessage(
          As<SaveDrawingMessage>({
            type: MessageType.SAVE_DRAWING,
            payload: {
              id: currentId,
              excalidraw: drawingDataState.excalidraw,
              excalidrawState: drawingDataState.excalidrawState,
              versionFiles: drawingDataState.versionFiles,
              versionDataState: drawingDataState.versionDataState,
              imageBase64: drawingDataState.imageBase64,
              viewBackgroundColor: drawingDataState.viewBackgroundColor,
            },
          })
        );
      } catch (error) {
        XLogger.error(
          "[Listen Changes] Error sending drawing data to save",
          error
        );
      }
    }
  }, 2000);

  window.addEventListener("beforeunload", () => {
    try {
      clearInterval(intervalId);
    } catch {}
  });

  // Start syncing after 5 seconds
}, 5000);

window.addEventListener("beforeunload", () => {
  try {
    clearTimeout(timeoutId);
  } catch {}
});

waitForElement(".excalidraw-container")
  .then(() => initExcalidrawClientUI())
  .catch((error) =>
    XLogger.error("[ExcalidrawClientUI] Failed to find container", error)
  );

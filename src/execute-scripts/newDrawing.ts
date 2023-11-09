import { getDrawingDataState } from "../ContentScript/content-script.utils";
import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { XLogger } from "../lib/logger";
import { As } from "../lib/types.utils";
const { browser } = require("webextension-polyfill-ts");

(async () => {
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

    localStorage.removeItem(DRAWING_ID_KEY_LS);
  }

  async function clearByExcalidrawFromUI() {
    const style = document.createElement("style");

    // Hide items to now show steps to user
    const cssString = `
  .excalidraw .dropdown-menu-button {
    visibility: hidden !important;
  }

  .excalidraw .dropdown-menu .dropdown-menu-container {
    visibility: hidden !important;
  }

  .excalidraw.excalidraw-modal-container {
    visibility: hidden !important;
  }
`;

    style.textContent = cssString;
    document.head.appendChild(style);

    const isLeftMenuOpen = !!document.querySelector(
      ".App-menu_top__left > div > div.dropdown-menu"
    );

    if (!isLeftMenuOpen) {
      // Click on Burger menu:
      document
        .querySelector<HTMLElement>(".App-menu_top__left > div > button")
        .click();

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Click on "Reset the canvas":
    document
      .querySelector<HTMLElement>(
        ".App-menu_top__left > div > div.dropdown-menu > div > button[data-testid='clear-canvas-button']"
      )
      .click();

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Click on "Confirm":
    document
      .querySelector<HTMLElement>(
        "button.Dialog__action-button.Dialog__action-button--danger"
      )
      .click();

    XLogger.debug("State cleaned using the Excalidraw UI");
  }

  try {
    await clearByExcalidrawFromUI();
  } catch (error) {
    XLogger.debug("Error clearing state with Excalidraw UI", error);
  }

  // Leave this just in case the UI method fails
  window.addEventListener("beforeunload", () => {
    localStorage.removeItem("excalidraw");
    localStorage.removeItem("excalidraw-state");
    localStorage.removeItem("version-files");
    localStorage.removeItem("version-dataState");
  });

  // Reload page to apply changes
  location.reload();
})();

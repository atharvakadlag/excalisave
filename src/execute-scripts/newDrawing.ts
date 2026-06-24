import {getScriptParams} from "../ContentScript/contentScript.utils";
import {MessageType, SaveNewDrawingMessage} from "../constants/message.types";
import {DRAWING_ID_KEY_LS, DRAWING_TITLE_KEY_LS} from "../lib/constants";
import {XLogger} from "../lib/logger";
import {As} from "../lib/types.utils";
import {saveCurrentDrawingToStorage} from "../lib/utils/drawing-message.utils";
import {browser} from "webextension-polyfill-ts";

import type {UUID} from "../lib/utils/id.utils";

type ScriptParams = {
  id: UUID;
  name: string;
};

(async () => {
  const params = getScriptParams<ScriptParams | undefined>();

  // Save data before load new drawing if there is a current drawing
  await saveCurrentDrawingToStorage();
  localStorage.removeItem(DRAWING_ID_KEY_LS);
  localStorage.removeItem(DRAWING_TITLE_KEY_LS);

  // Auto-create the new drawing entry in storage
  if (params?.id && params?.name) {
    await browser.runtime.sendMessage(
      As<SaveNewDrawingMessage>({
        type: MessageType.SAVE_NEW_DRAWING,
        payload: {
          id: params.id,
          name: params.name,
          sync: false,
          excalidraw: "{}",
          excalidrawState: "{}",
          versionFiles: "[]",
          versionDataState: "{}",
        },
      })
    );
  }

  async function clearByExcalidrawFromUI() {
    const style = document.createElement("style");

    // Hide items to now show steps to the user
      style.textContent = `
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
  // Also set the new drawing ID/title so the auto-save picks it up after reload
  window.addEventListener("beforeunload", () => {
    localStorage.removeItem("excalidraw");
    localStorage.removeItem("excalidraw-state");
    localStorage.removeItem("version-files");
    localStorage.removeItem("version-dataState");

    if (params?.id && params?.name) {
      localStorage.setItem(DRAWING_ID_KEY_LS, params.id);
      localStorage.setItem(DRAWING_TITLE_KEY_LS, params.name);
    }
  });

  // Navigate to origin to clear any shared/room URL fragments and apply changes
  const url = new URL(window.location.href);
  location.assign(url.origin);
})();

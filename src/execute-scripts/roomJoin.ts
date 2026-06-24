import { browser } from "webextension-polyfill-ts";
import { MessageType } from "../constants/message.types";
import { getDrawingDataState } from "../ContentScript/contentScript.utils";
import {
  DRAWING_ID_KEY_LS,
  DRAWING_TITLE_KEY_LS,
} from "../lib/constants";
import { XLogger } from "../lib/logger";
import { setLocalStorageItemAndNotify } from "../lib/localStorage.utils";
import { IdUtils } from "../lib/utils/id.utils";
import { getFormattedToday } from "../lib/utils/date.utils";
import { saveCurrentDrawingToStorage, saveNewDrawingToStorage } from "../lib/utils/drawing-message.utils";

(async () => {
  const roomUrl = window.location.href;
  const currentId = localStorage.getItem(DRAWING_ID_KEY_LS);

  // Check if a drawing already exists for this room URL
  const findResult = await browser.runtime.sendMessage({
    type: MessageType.FIND_DRAWING_BY_ROOM_URL,
    payload: { roomUrl },
  });

  if (findResult?.success && findResult.drawing) {
    const existing = findResult.drawing;

    // Already the current drawing — nothing to do (reconnecting)
    if (currentId === existing.id) {
      XLogger.log(`[RoomJoin] Already tracking room as "${existing.name}"`);
      return;
    }

    // Save current drawing, then switch to the existing room drawing
    XLogger.log(`[RoomJoin] Reconnecting to existing drawing "${existing.name}"`);
    await saveCurrentDrawingToStorage({ takeScreenshot: false });

    setLocalStorageItemAndNotify(DRAWING_ID_KEY_LS, existing.id);
    setLocalStorageItemAndNotify(DRAWING_TITLE_KEY_LS, existing.name);
    return;
  }

  // No existing drawing for this room — create a new one
  XLogger.log("[RoomJoin] Creating new drawing for room session");
  await saveCurrentDrawingToStorage({ takeScreenshot: false });

  const newId = IdUtils.createDrawingId();
  const name = `Room - ${getFormattedToday()}`;

  try {
    const data = await getDrawingDataState({ takeScreenshot: false });
    await saveNewDrawingToStorage(newId, name, data);

    // Store the room URL on the drawing
    await browser.runtime.sendMessage({
      type: MessageType.SET_DRAWING_ROOM_URL,
      payload: { id: newId, roomUrl },
    });
  } catch (error) {
    XLogger.error("[RoomJoin] Error creating new drawing", error);
    return;
  }

  setLocalStorageItemAndNotify(DRAWING_ID_KEY_LS, newId);
  setLocalStorageItemAndNotify(DRAWING_TITLE_KEY_LS, name);

  XLogger.log(`[RoomJoin] Created drawing "${name}" (${newId}) for room session`);
})();

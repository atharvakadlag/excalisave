import { browser } from "webextension-polyfill-ts";
import {
  MessageType,
  SaveNewDrawingMessage,
  SaveDrawingMessage,
} from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";

browser.runtime.onMessage.addListener(
  async (message: SaveDrawingMessage | SaveNewDrawingMessage, _sender: any) => {
    console.log("Mesage brackground", message);
    if (!message || !message.type) return;

    const id = message.payload.id;

    switch (message.type) {
      case MessageType.SAVE_NEW_DRAWING:
        await browser.storage.local.set({
          [id]: {
            id,
            name: message.payload.name,
            createdAt: new Date().toISOString(),
            imageBase64: message.payload.imageBase64,
            viewBackgroundColor: message.payload.viewBackgroundColor,
            data: {
              excalidraw: message.payload.excalidraw,
              excalidrawState: message.payload.excalidrawState,
              versionFiles: message.payload.versionFiles,
              versionDataState: message.payload.versionDataState,
            },
          },
        });
        break;

      case MessageType.SAVE_DRAWING:
        const exitentDrawing = (await browser.storage.local.get(id))[
          id
        ] as IDrawing;

        if (!exitentDrawing) {
          console.error("No drawing found with id", id);
          return;
        }

        const newData: IDrawing = {
          ...exitentDrawing,
          name: message.payload.name || exitentDrawing.name,
          imageBase64:
            message.payload.imageBase64 || exitentDrawing.imageBase64,
          viewBackgroundColor:
            message.payload.viewBackgroundColor ||
            exitentDrawing.viewBackgroundColor,
          data: {
            excalidraw: message.payload.excalidraw,
            excalidrawState: message.payload.excalidrawState,
            versionFiles: message.payload.versionFiles,
            versionDataState: message.payload.versionDataState,
          },
        };

        await browser.storage.local.set({
          [id]: newData,
        });
        break;
      default:
        break;
    }
  }
);

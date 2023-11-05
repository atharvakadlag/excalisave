import { browser } from "webextension-polyfill-ts";
import {
  MessageType,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";
import { XLogger } from "../lib/logger";

browser.runtime.onInstalled.addListener(async () => {
  XLogger.log("onInstalled...");

  XLogger.log(
    "Content scripts",
    (browser.runtime.getManifest() as any).content_scripts
  );
  for (const cs of (browser.runtime.getManifest() as any).content_scripts) {
    for (const tab of await browser.tabs.query({ url: cs.matches })) {
      browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: cs.js,
      });
    }
  }

  // const tabs = await browser.tabs.query({
  //   url: "https://excalidraw.com/*",
  // });

  // await Promise.all(
  //   tabs.map((tab) => {
  //     return browser.tabs.reload(tab.id);
  //   })
  // );
});

browser.runtime.onMessage.addListener(
  async (message: SaveDrawingMessage | SaveNewDrawingMessage, _sender: any) => {
    XLogger.log("Mesage brackground", message);
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
          XLogger.error("No drawing found with id", id);
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

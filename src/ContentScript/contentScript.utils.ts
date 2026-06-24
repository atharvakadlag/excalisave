import { DrawingDataState } from "../interfaces/drawingDataState.interface";
import type { ExcalidrawDataState } from "../interfaces/excalidrawDataState.interface";
import { XLogger } from "../lib/logger";
import { convertBlobToBase64Async } from "../lib/utils/blob-to-base64.util";
import { MAX_WIDTH_THUMBNAIL, MAX_HEIGHT_THUMBNAIL } from "../lib/constants";

type GetDrawingDataStateProps = {
  takeScreenshot?: boolean;
};
export async function getDrawingDataState(
  props: GetDrawingDataStateProps = { takeScreenshot: true }
): Promise<DrawingDataState> {
  const { excalidraw, excalidrawState, versionFiles, versionDataState } =
    getExcalidrawDataState();

  const appState = JSON.parse(excalidrawState);

  let imageBase64: string | undefined;
  // Screenshot is optional
  try {
    if (props?.takeScreenshot) {
      imageBase64 = await takeScreenshot();
    }
  } catch (error) {
    XLogger.error("Error taking screenshot", error);
  }

  return {
    excalidraw,
    excalidrawState,
    versionFiles,
    versionDataState,
    imageBase64,
    viewBackgroundColor: appState?.viewBackgroundColor,
  };
}

function captureCanvas(): Promise<string> {
  const sourceCanvas = document.querySelector(
    ".excalidraw canvas"
  ) as HTMLCanvasElement | null;

  if (!sourceCanvas) {
    throw new Error("Excalidraw canvas not found");
  }

  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;

  const widthScale = srcWidth / MAX_WIDTH_THUMBNAIL;
  const heightScale = srcHeight / MAX_HEIGHT_THUMBNAIL;
  const scale = Math.max(widthScale, heightScale, 1);
  const thumbWidth = Math.max(1, Math.round(srcWidth / scale));
  const thumbHeight = Math.max(1, Math.round(srcHeight / scale));

  const offscreen = document.createElement("canvas");
  offscreen.width = thumbWidth;
  offscreen.height = thumbHeight;

  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.drawImage(sourceCanvas, 0, 0, thumbWidth, thumbHeight);

  return new Promise<string>((resolve, reject) => {
    offscreen.toBlob(
      (b) => {
        if (!b) {
          reject(new Error("toBlob failed"));
          return;
        }
        convertBlobToBase64Async(b).then(resolve, reject);
      },
      "image/png"
    );
  });
}

async function takeScreenshot(): Promise<string> {
  const startTime = new Date().getTime();

  const imageBase64 = await captureCanvas();

  XLogger.log(
    "Take Screenshot Took:",
    new Date().getTime() - startTime + "ms"
  );

  return imageBase64;
}

export function getExcalidrawDataState(): ExcalidrawDataState {
  const excalidraw = localStorage.getItem("excalidraw");
  const excalidrawState = localStorage.getItem("excalidraw-state");
  const versionFiles = localStorage.getItem("version-files");
  const versionDataState = localStorage.getItem("version-dataState");

  return {
    excalidraw,
    excalidrawState,
    versionFiles,
    versionDataState,
  };
}

export function getScriptParams<T>(): T {
  const params = window.__SCRIPT_PARAMS__;

  // Reset params after read to avoid being used by another script
  window.__SCRIPT_PARAMS__ = undefined;

  return params as T;
}

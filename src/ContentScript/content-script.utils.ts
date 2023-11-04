import type { ExcalidrawImageElement } from "@excalidraw/excalidraw/types/element/types";
import type {
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types/types";
import { createStore, getMany } from "idb-keyval";
import type { ExcalidrawDataState } from "../interfaces/excalidraw-data-state.interface";
import { convertBlobToBase64Async } from "../lib/utils/blob-to-base64.util";
import { calculateNewDimensions } from "../lib/utils/calculate-new-dimensions.util";
import { DrawingDataState } from "../interfaces/drawing-data-state.interface";

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

type GetDrawingDataStateProps = {
  takeScreenshot?: boolean;
};
export async function getDrawingDataState(
  props: GetDrawingDataStateProps = { takeScreenshot: true }
): Promise<DrawingDataState> {
  const { excalidraw, excalidrawState, versionFiles, versionDataState } =
    getExcalidrawDataState();

  const elements = JSON.parse(excalidraw) as ExcalidrawElements;
  const appState = JSON.parse(excalidrawState) as ExcalidrawAppState;

  let imageBase64: string | undefined;
  // Screenshot is optional
  try {
    if (props?.takeScreenshot) {
      imageBase64 = await takeScreenshot({
        elements,
        appState,
      });
    }
  } catch (error) {
    console.error("Error taking screenshot", error);
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

type TakeScreenshotProps = {
  elements: ExcalidrawElements;
  appState: ExcalidrawAppState;
};

async function takeScreenshot({
  elements,
  appState,
}: TakeScreenshotProps): Promise<string> {
  const startTime = new Date().getTime();

  const imageFileIds = elements
    .filter((item): item is ExcalidrawImageElement => item.type === "image")
    .map((item) => item.fileId);

  let files: BinaryFiles = {};

  try {
    const response = await getMany<BinaryFileData | undefined>(
      imageFileIds,
      filesStore
    );

    response.forEach((item) => {
      if (item) {
        files[item.id] = item;
      }
    });
  } catch (error) {
    console.error("Error retrieving files from IndexedDB", error);
  }

  const blob = await window.ExcalidrawLib.exportToBlob({
    elements,
    getDimensions: (width, height) => {
      return calculateNewDimensions(width, height);
    },
    files,
    appState,
  });

  const imageBase64 = await convertBlobToBase64Async(blob);

  console.log(
    "📷 Take Screenshoot Took:",
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

export function getExcalidrawEmptyDataState(): ExcalidrawDataState {
  const excalidraw = "[]";
  const excalidrawState = JSON.stringify({
    showWelcomeScreen: false,
    theme: "light",
    currentChartType: "bar",
    currentItemBackgroundColor: "transparent",
    currentItemEndArrowhead: "arrow",
    currentItemFillStyle: "solid",
    currentItemFontFamily: 1,
    currentItemFontSize: 20,
    currentItemOpacity: 100,
    currentItemRoughness: 1,
    currentItemStartArrowhead: null,
    currentItemStrokeColor: "#1e1e1e",
    currentItemRoundness: "round",
    currentItemStrokeStyle: "solid",
    currentItemStrokeWidth: 2,
    currentItemTextAlign: "left",
    cursorButton: "up",
    editingGroupId: null,
    activeTool: {
      type: "selection",
      customType: null,
      locked: false,
      lastActiveTool: null,
    },
    penMode: true,
    penDetected: true,
    exportBackground: true,
    exportScale: 1,
    exportEmbedScene: false,
    exportWithDarkMode: false,
    gridSize: null,
    defaultSidebarDockedPreference: false,
    lastPointerDownWith: "mouse",
    name: "Untitled-2023-11-04-1725",
    openMenu: null,
    openSidebar: null,
    previousSelectedElementIds: {},
    scrolledOutside: false,
    scrollX: 0,
    scrollY: 0,
    selectedElementIds: {},
    selectedGroupIds: {},
    shouldCacheIgnoreZoom: false,
    showStats: false,
    viewBackgroundColor: "#ffffff",
    zenModeEnabled: false,
    zoom: {
      value: 1,
    },
    selectedLinearElement: null,
    objectsSnapModeEnabled: false,
  });
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

  if (!params) {
    throw new Error(
      'Error trying to get params: "__SCRIPT_PARAMS__" is missing. Could not process script.'
    );
  }

  // Reset params after read to avoid being used by another script
  window.__SCRIPT_PARAMS__ = undefined;

  return params as T;
}

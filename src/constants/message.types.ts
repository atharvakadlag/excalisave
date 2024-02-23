import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { DrawingDataState } from "../interfaces/drawing-data-state.interface";

export enum MessageType {
  // For background:
  SAVE_DRAWING = "SAVE_DRAWING",
  SAVE_NEW_DRAWING = "SAVE_NEW_DRAWING",
  EXPORT_STORE = "EXPORT_STORE",
  CLEANUP_FILES = "CLEANUP_FILES",
}

export type SaveNewDrawingMessage = {
  type: MessageType.SAVE_NEW_DRAWING;
  payload: {
    id: string;
    name: string;
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
    imageBase64?: DrawingDataState["imageBase64"];
    viewBackgroundColor?: DrawingDataState["viewBackgroundColor"];
  };
};

export type SaveDrawingMessage = {
  type: MessageType.SAVE_DRAWING;
  payload: {
    id: string;
    name?: string;
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
    imageBase64?: DrawingDataState["imageBase64"];
    viewBackgroundColor?: DrawingDataState["viewBackgroundColor"];
  };
};

export type ExportStore = {
  type: MessageType.EXPORT_STORE;
  payload: {
    files: Record<string, BinaryFileData>;
  };
};

export type CleanupFiles = {
  type: MessageType.CLEANUP_FILES;
  payload: {
    tabId: number;
    executionTimestamp: number;
  };
};

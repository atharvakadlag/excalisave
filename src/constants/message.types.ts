import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { DrawingDataState } from "../interfaces/drawing-data-state.interface";
import { IDrawing } from "../interfaces/drawing.interface";

export enum MessageType {
  // For background:
  SAVE_DRAWING = "SAVE_DRAWING",
  SAVE_NEW_DRAWING = "SAVE_NEW_DRAWING",
  EXPORT_STORE = "EXPORT_STORE",
  CLEANUP_FILES = "CLEANUP_FILES",
  CLEAR_DRAWING_ID = "ClearDrawingID",
  DELETE_DRAWING = "DELETE_DRAWING",
  GET_CHANGE_HISTORY = "GET_CHANGE_HISTORY",
  SHOW_MERGE_CONFLICT = "SHOW_MERGE_CONFLICT",
  SYNC_DRAWING = "SYNC_DRAWING",
  DELETE_DRAWING_SYNC = "DELETE_DRAWING_SYNC",
  CONFIGURE_GITHUB_PROVIDER = "CONFIGURE_GITHUB_PROVIDER",
}

export type SaveNewDrawingMessage = {
  type: MessageType.SAVE_NEW_DRAWING;
  payload: {
    id: string;
    name: string;
    sync?: boolean;
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
    sync?: boolean;
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
    imageBase64?: DrawingDataState["imageBase64"];
    viewBackgroundColor?: DrawingDataState["viewBackgroundColor"];
  };
};

export type ExportStoreMessage = {
  type: MessageType.EXPORT_STORE;
  payload: {
    files: Record<string, BinaryFileData>;
  };
};

export type CleanupFilesMessage = {
  type: MessageType.CLEANUP_FILES;
  payload: {
    tabId: number;
    executionTimestamp: number;
  };
};

export type DeleteDrawingMessage = {
  type: MessageType.DELETE_DRAWING;
  payload: {
    id: string;
  };
};

export type DeleteDrawingSyncMessage = {
  type: MessageType.DELETE_DRAWING_SYNC;
  payload: {
    id: string;
  };
};

export type GetChangeHistoryMessage = {
  type: MessageType.GET_CHANGE_HISTORY;
  payload: {
    limit?: number;
  };
};

export type ShowMergeConflictMessage = {
  type: MessageType.SHOW_MERGE_CONFLICT;
  payload: {
    drawingId: string;
    localDrawing: IDrawing;
    remoteDrawing: IDrawing;
  };
};

export type SyncDrawingMessage = {
  type: MessageType.SYNC_DRAWING;
  payload: {
    id: string;
  };
};

export type ConfigureGithubProviderMessage = {
  type: MessageType.CONFIGURE_GITHUB_PROVIDER;
  payload: {
    token: string;
    repoOwner: string;
    repoName: string;
    drawingsToSync: string[];
  };
};

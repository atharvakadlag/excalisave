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
  // Generic sync provider messages (replaces old GitHub-specific)
  CONFIGURE_SYNC_PROVIDER = "CONFIGURE_SYNC_PROVIDER",
  REMOVE_SYNC_PROVIDER = "REMOVE_SYNC_PROVIDER",
  GET_SYNC_CONFIG = "GET_SYNC_CONFIG",
  CHECK_SYNC_AUTH = "CHECK_SYNC_AUTH",
  // Sync resilience / console
  RESET_SYNC_HEALTH = "RESET_SYNC_HEALTH",
  GET_SYNC_HEALTH = "GET_SYNC_HEALTH",
  GET_SYNC_LOG = "GET_SYNC_LOG",
  CLEAR_SYNC_LOG = "CLEAR_SYNC_LOG",
  SYNC_FLUSH = "SYNC_FLUSH",
  SET_SYNC_DEBOUNCE = "SET_SYNC_DEBOUNCE",
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

// Generic sync config payload (used by the new generalized messages)
export type AnySyncProviderConfig = {
  provider: "github" | "gitea";
  nickname?: string;
  token: string;
  owner: string;
  repo: string;
  branch: string;
  baseUrl?: string;
};

export type ConfigureSyncProviderMessage = {
  type: MessageType.CONFIGURE_SYNC_PROVIDER;
  payload: {
    config: AnySyncProviderConfig;
    drawingsToSync: string[];
  };
};

export type SetSyncDebounceMessage = {
  type: MessageType.SET_SYNC_DEBOUNCE;
  payload: {
    debounceMs: number;
  };
};

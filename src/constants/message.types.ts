import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { DrawingDataState } from "../interfaces/drawingDataState.interface";
import { IDrawing } from "../interfaces/drawing.interface";
import type { UUID } from "../lib/utils/id.utils";

export enum MessageType {
  // For background:
  SAVE_DRAWING = "SAVE_DRAWING",
  SAVE_NEW_DRAWING = "SAVE_NEW_DRAWING",
  EXPORT_STORE = "EXPORT_STORE",
  CLEANUP_FILES = "CLEANUP_FILES",
  DELETE_DRAWING = "DELETE_DRAWING",
  GET_CHANGE_HISTORY = "GET_CHANGE_HISTORY",
  SHOW_MERGE_CONFLICT = "SHOW_MERGE_CONFLICT",
  SYNC_DRAWING = "SYNC_DRAWING",
  DELETE_DRAWING_SYNC = "DELETE_DRAWING_SYNC",
  CONFIGURE_GITHUB_PROVIDER = "CONFIGURE_GITHUB_PROVIDER",
  OPEN_POPUP = "OPEN_POPUP",
  MESSAGE_AUTO_SAVE = "MESSAGE_AUTO_SAVE",
  REMOVE_GITHUB_PROVIDER = "REMOVE_GITHUB_PROVIDER",
  GET_GITHUB_CONFIG = "GET_GITHUB_CONFIG",
  CHECK_GITHUB_AUTH = "CHECK_GITHUB_AUTH",
  GET_ALL_DRAWINGS = "GET_ALL_DRAWINGS",
  LOAD_DRAWING = "LOAD_DRAWING",
  CREATE_NEW_DRAWING = "CREATE_NEW_DRAWING",
  SEARCH_DRAWINGS = "SEARCH_DRAWINGS",
  FIND_DRAWING_BY_ROOM_URL = "FIND_DRAWING_BY_ROOM_URL",
  SET_DRAWING_ROOM_URL = "SET_DRAWING_ROOM_URL",
}

export type SaveNewDrawingMessage = {
  type: MessageType.SAVE_NEW_DRAWING;
  payload: {
    id: UUID;
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
    id: UUID;
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
    id: UUID;
  };
};

export type DeleteDrawingSyncMessage = {
  type: MessageType.DELETE_DRAWING_SYNC;
  payload: {
    id: UUID;
  };
};

export type SyncDrawingMessage = {
  type: MessageType.SYNC_DRAWING;
  payload: {
    id: UUID;
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
    drawingId: UUID;
    localDrawing: IDrawing;
    remoteDrawing: IDrawing;
  };
};

export type ConfigureGithubProviderMessage = {
  type: MessageType.CONFIGURE_GITHUB_PROVIDER;
  payload: {
    token: string;
    repoOwner: string;
    repoName: string;
    drawingsToSync: UUID[];
  };
};

export type OpenPopupMessage = {
  type: MessageType.OPEN_POPUP;
};

export type MessageAutoSaveMessage = {
  type: MessageType.MESSAGE_AUTO_SAVE;
  payload: {
    name: string;
    setCurrent: boolean;
  };
};

export type RemoveGitHubProviderMessage = {
  type: MessageType.REMOVE_GITHUB_PROVIDER;
};

export type GetGitHubConfigMessage = {
  type: MessageType.GET_GITHUB_CONFIG;
};

export type CheckGitHubAuthMessage = {
  type: MessageType.CHECK_GITHUB_AUTH;
};

export type GetAllDrawingsMessage = {
  type: MessageType.GET_ALL_DRAWINGS;
};

export type LoadDrawingMessage = {
  type: MessageType.LOAD_DRAWING;
  payload: {
    id: UUID;
  };
};

export type CreateNewDrawingMessage = {
  type: MessageType.CREATE_NEW_DRAWING;
};

export type SearchDrawingsMessage = {
  type: MessageType.SEARCH_DRAWINGS;
  payload: {
    query: string;
  };
};

export type FindDrawingByRoomUrlMessage = {
  type: MessageType.FIND_DRAWING_BY_ROOM_URL;
  payload: {
    roomUrl: string;
  };
};

export type SetDrawingRoomUrlMessage = {
  type: MessageType.SET_DRAWING_ROOM_URL;
  payload: {
    id: UUID;
    roomUrl: string;
  };
};

export type BackgroundMessage =
  | SaveDrawingMessage
  | SaveNewDrawingMessage
  | CleanupFilesMessage
  | DeleteDrawingMessage
  | DeleteDrawingSyncMessage
  | GetChangeHistoryMessage
  | ConfigureGithubProviderMessage
  | OpenPopupMessage
  | MessageAutoSaveMessage
  | RemoveGitHubProviderMessage
  | GetGitHubConfigMessage
  | CheckGitHubAuthMessage
  | SyncDrawingMessage
  | GetAllDrawingsMessage
  | LoadDrawingMessage
  | CreateNewDrawingMessage
  | SearchDrawingsMessage
  | FindDrawingByRoomUrlMessage
  | SetDrawingRoomUrlMessage;

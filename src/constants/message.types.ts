export enum MessageType {
  // For background:
  SAVE_NEW_DRAWING = "SAVE_DRAWING",
  SAVE_EXISTENT_DRAWING = "SAVE_EXISTENT_DRAWING",

  // For content scripts:
  GET_CURRENT_DRAWING_ID = "GET_CURRENT_DRAWING_ID",

  // For Popup:
  SET_CURRENT_DRAWING_ID = "SET_CURRENT_DRAWING_ID",
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
    imageBase64: string;
  };
};

export type SaveExistentDrawingMessage = {
  type: MessageType.SAVE_EXISTENT_DRAWING;
  payload: {
    id: string;
    name: string;
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
    imageBase64: string;
  };
};

export type SetDrawingInfoMessage = {
  type: MessageType.SET_CURRENT_DRAWING_ID;
  payload: string;
};

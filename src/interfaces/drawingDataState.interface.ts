import { ExcalidrawDataState } from "./excalidrawDataState.interface";

// Similar to ExcalidrawDataState, with additional data needed for the extension.
export type DrawingDataState = ExcalidrawDataState & {
  imageBase64?: string;
  viewBackgroundColor?: string;
};

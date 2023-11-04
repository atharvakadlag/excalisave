/**
 * Drawing interface
 *
 * This is the how the drawing is stored in browser storage
 */
export interface IDrawing {
  id: string;
  name: string;
  createdAt: string;
  imageBase64?: string;
  viewBackgroundColor?: string;
  data: {
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
  };
}

import type { UUID } from "../lib/utils/id.utils";

/**
 * Drawing interface
 *
 * This is the how the drawing is stored in browser storage
 */
export interface IDrawing {
  id: UUID;
  name: string;
  createdAt: string;
  sync: boolean;
  roomUrl?: string;
  imageBase64?: string;
  viewBackgroundColor?: string;
  data: {
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
  };
}

import type { UUID } from "../lib/utils/id.utils";

// Structure of folder stored in storage
export interface Folder {
  id: UUID;
  name: string;
  // Array of drawing ids in the folder
  drawingIds: UUID[];
}

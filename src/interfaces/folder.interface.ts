// Structure of folder stored in storage
export interface Folder {
  id: string;
  name: string;
  // Array of drawing ids in the folder
  drawingIds: string[];
}

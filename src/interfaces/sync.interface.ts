import { IDrawing } from "./drawing.interface";

export interface ChangeHistoryItem {
  id: string;
  message: string;
  author: {
    name: string;
    date: string;
  };
  files?: Array<{
    name: string;
    status: "added" | "modified" | "deleted";
  }>;
}

export interface SyncProvider {
  /**
   * Initialize the sync provider, syncs files and pushes files to the provider
   */
  initialize(): Promise<void>;

  /**
   * Check if the user is authenticated with the provider
   * @return Promise<boolean>
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Update an existing drawing to the provider. If file does not exist it should create it.
   * @return Promise<boolean> or Promise<{ conflict: boolean, localDrawing: IDrawing, remoteDrawing: IDrawing }> if there's a conflict
   */
  updateDrawing(
    drawing: IDrawing
  ): Promise<
    | boolean
    | { conflict: boolean; localDrawing: IDrawing; remoteDrawing: IDrawing }
  >;

  /**
   * Delete a drawing from the cloud by the name
   * @param drawing the full IDrawing
   * @return Promise<boolean>
   */
  deleteDrawing(drawing: IDrawing): Promise<boolean>;

  /**
   * get all files from the cloud
   * @return Promise<IDrawing[]>
   */
  getAllFiles(): Promise<IDrawing[]>;

  /**
   * Get the change history from the provider
   * @param limit Maximum number of history items to return
   * @return Promise<ChangeHistoryItem[]>
   */
  getChangeHistory(limit?: number): Promise<ChangeHistoryItem[]>;
}

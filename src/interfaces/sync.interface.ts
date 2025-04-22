import {IDrawing} from "./drawing.interface";

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
     * Save a drawing to the cloud
     * @param drawing full IDrawing Object to save to the provider
     * @return Promise<boolean>
     */
    saveDrawing(drawing: IDrawing): Promise<boolean>;

    /**
     * Update an existing drawing to the provider
     * @return Promise<boolean>
     */
    updateDrawing(drawing: IDrawing): Promise<boolean>;

    /**
     * Delete a drawing from the cloud by the name
     * @param drawingName the name of the drawing as it is stored by the provider
     * @return Promise<boolean>
     */
    deleteDrawing(drawingName: string): Promise<boolean>;

    /**
     * Sync files between local and cloud
     * @return Promise<boolean>
     */
    syncFiles(): Promise<void>;
}
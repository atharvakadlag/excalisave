import { browser } from "webextension-polyfill-ts";
import { SyncProvider, ChangeHistoryItem } from "../interfaces/sync.interface";
import { XLogger } from "../lib/logger";
import { IDrawing } from "../interfaces/drawing.interface";
import { Folder } from "../interfaces/folder.interface";
import {
  MessageType,
  ShowMergeConflictMessage,
} from "../constants/message.types";

export class SyncService {
  private static instance: SyncService;
  private provider: SyncProvider | null = null;
  public static readonly SYNC_FOLDER_NAME = "excalidraw-sync";

  private constructor() {}

  /**
   * Get the singleton instance of the SyncService
   */
  public static getInstance(): SyncService {
    if (!SyncService.instance) SyncService.instance = new SyncService();
    return SyncService.instance;
  }

  public setProvider(provider: SyncProvider): void {
    this.provider = provider;
  }

  public async initialize(): Promise<void> {
    if (!this.provider) return;
    await this.provider.initialize();
    await this.ensureSyncFolderExists();
    await this.syncFiles();
  }

  public async isAuthenticated(): Promise<boolean> {
    return (await this.provider?.isAuthenticated()) || false;
  }

  /**
   * Update a drawing in the sync provider
   * Handles conflict detection and resolution
   * @param drawing The drawing to update
   * @returns Object indicating success status
   */
  public async updateDrawing(drawing: IDrawing): Promise<{ success: boolean }> {
    // Early returns for invalid states
    if (!this.provider) return { success: false };
    if (!(await this.isAuthenticated())) return { success: false };
    if (!(await this.isDrawingInSyncFolder(drawing.id)))
      return { success: false };

    // Attempt to update the drawing in the provider
    const result = await this.provider.updateDrawing(drawing);

    // Handle boolean result (success/failure)
    if (typeof result === "boolean") {
      if (result) {
        XLogger.log("Drawing updated in cloud successfully");
        return { success: true };
      } else {
        XLogger.error("Failed to update drawing in cloud");
        return { success: false };
      }
    }
    // Handle conflict detection
    else if (result.conflict) {
      XLogger.warn("Merge conflict detected when updating drawing", drawing.id);

      // Send a message to the popup to show the conflict dialog
      browser.runtime.sendMessage({
        type: MessageType.SHOW_MERGE_CONFLICT,
        payload: {
          drawingId: drawing.id,
          localDrawing: result.localDrawing,
          remoteDrawing: result.remoteDrawing,
        },
      } as ShowMergeConflictMessage);

      return { success: false };
    }

    return { success: false };
  }

  /**
   * Check if a drawing is in the sync folder
   * @param drawingId The ID of the drawing to check
   * @returns Promise<boolean> indicating if the drawing is in the sync folder
   */
  private async isDrawingInSyncFolder(drawingId: string): Promise<boolean> {
    const folders = await browser.storage.local.get("folders");
    const syncFolder: Folder = folders.folders.find(
      (f: any) => f.name === SyncService.SYNC_FOLDER_NAME
    );

    if (!syncFolder || !syncFolder.drawingIds) return false;
    return syncFolder.drawingIds.includes(drawingId);
  }

  /**
   * Ensure the sync folder exists in the local storage
   * Creates it if it doesn't exist
   */
  private async ensureSyncFolderExists(): Promise<void> {
    const folders = await browser.storage.local.get("folders");
    const syncFolder = folders.folders?.find(
      (f: any) => f.name === SyncService.SYNC_FOLDER_NAME
    );
    if (syncFolder) return;

    const newFolder = {
      id: `folder:${Math.random().toString(36).slice(2, 9)}`,
      name: SyncService.SYNC_FOLDER_NAME,
      drawingIds: [] as string[],
    };

    const newFolders = [...(folders.folders || []), newFolder];
    await browser.storage.local.set({ folders: newFolders });
  }

  /**
   * Delete a drawing from the sync provider
   * @param drawing The drawing to delete
   */
  public async deleteDrawing(drawing: IDrawing): Promise<void> {
    if (!this.provider) return;
    if (!(await this.isAuthenticated())) return;

    await this.provider.deleteDrawing(drawing);
  }

  /**
   * Get the change history from the provider
   * @param limit Maximum number of history items to return
   * @return Promise<ChangeHistoryItem[]>
   */
  public async getChangeHistory(limit?: number): Promise<ChangeHistoryItem[]> {
    if (!this.provider) return [];
    if (!(await this.isAuthenticated())) return [];

    return await this.provider.getChangeHistory(limit);
  }

  /**
   * Sync files from the provider to local storage
   * Updates the sync folder with the latest drawings
   */
  public async syncFiles(): Promise<void> {
    if (!this.provider) return;
    if (!(await this.isAuthenticated())) return;
    await this.ensureSyncFolderExists();

    const drawings: IDrawing[] = await this.provider.getAllFiles();
    if (drawings.length === 0) {
      XLogger.log("No drawings to sync from GitHub");
      return;
    }

    // save every drawing in the local storage
    for (const drawing of drawings) {
      await browser.storage.local.set({ [drawing.id]: drawing });
    }

    // Get the sync folder. We know it exists because we created it in the ensureSyncFolderExists method
    const folders = await browser.storage.local.get("folders");
    const syncFolder: Folder = folders.folders.find(
      (f: any) => f.name === SyncService.SYNC_FOLDER_NAME
    );

    // set every drawing in the sync folder
    syncFolder.drawingIds = drawings.map((d) => d.id);

    // save the sync folder
    await browser.storage.local.set({ folders: [syncFolder] });
  }
}

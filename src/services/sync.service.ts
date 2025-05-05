import { browser } from "webextension-polyfill-ts";
import { SyncProvider, ChangeHistoryItem } from "../interfaces/sync.interface";
import { XLogger } from "../lib/logger";
import { IDrawing } from "../interfaces/drawing.interface";
import {
  MessageType,
  ShowMergeConflictMessage,
} from "../constants/message.types";

export class SyncService {
  private static instance: SyncService;
  private provider: SyncProvider | null = null;

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

  public async initialize(drawingsToSync: string[]): Promise<void> {
    await this.provider.initialize();
    await this.syncFiles();
    for (const drawingId of drawingsToSync) {
      await this.addSyncToDrawing(drawingId);
    }
  }

  public async addSyncToDrawing(drawingId: string): Promise<void> {
    const drawing = (await browser.storage.local.get(drawingId))[
      drawingId
    ] as IDrawing;

    if (!drawing) return;

    drawing.sync = true;
    await browser.storage.local.set({ [drawingId]: drawing });
  }

  public async isAuthenticated(): Promise<boolean> {
    if (!this.provider) return false;
    if (await this.provider.isAuthenticated()) {
      return true;
    } else {
      await this.provider.initialize();
      return this.provider.isAuthenticated();
    }
  }

  /**
   * Update a drawing in the sync provider
   * Handles conflict detection and resolution
   * @param drawing The drawing to update
   * @returns Object indicating success status
   */
  public async updateDrawing(drawing: IDrawing): Promise<{ success: boolean }> {
    if (!drawing.sync) return { success: false };
    if (!(await this.isAuthenticated())) return { success: false };

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
      XLogger.log("Local drawing", result.localDrawing);
      XLogger.log("Remote drawing", result.remoteDrawing);

      // This gives merge conflicts on the version numbers ( which update on selecting or not selecting )
      // I would recommend ( if getting a merge conflict ).
      // Also doing a compare right here and just select newest if nothing visually changed.

      // Send a message to the popup to show the conflict dialog
      await browser.runtime.sendMessage({
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
   * Delete a drawing from the sync provider
   * @param drawing The drawing to delete
   */
  public async deleteDrawing(drawing: IDrawing): Promise<void> {
    if (!drawing.sync) return;
    if (!(await this.isAuthenticated())) return;

    await this.provider.deleteDrawing(drawing);
  }

  /**
   * Get the change history from the provider
   * @param limit Maximum number of history items to return
   * @return Promise<ChangeHistoryItem[]>
   */
  public async getChangeHistory(limit?: number): Promise<ChangeHistoryItem[]> {
    if (!(await this.isAuthenticated())) return [];

    return await this.provider.getChangeHistory(limit);
  }

  /**
   * Sync files from the provider to local storage
   * Updates the sync folder with the latest drawings
   */
  public async syncFiles(): Promise<void> {
    if (!(await this.isAuthenticated())) return;

    const drawings: IDrawing[] = await this.provider.getAllFiles();
    if (drawings.length === 0) {
      XLogger.log("No drawings to sync from GitHub");
      return;
    }

    // save every drawing in the local storage
    for (const drawing of drawings) {
      await browser.storage.local.set({ [drawing.id]: drawing });
    }
  }
}

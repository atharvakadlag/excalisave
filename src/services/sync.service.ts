import { browser } from "webextension-polyfill-ts";
import { SyncProvider } from "../interfaces/sync.interface";
import { XLogger } from "../lib/logger";
import { IDrawing } from "../interfaces/drawing.interface";
import { Folder } from "../interfaces/folder.interface";

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

  public async saveDrawing(drawing: IDrawing): Promise<void> {
    if (!this.provider) return;
    if (!(await this.isAuthenticated())) return;
    if (!(await this.isDrawingInSyncFolder(drawing.id))) return;

    await this.provider.saveDrawing(drawing);
    XLogger.log("New drawing saved in cloud successfully");
  }

  public async updateDrawing(drawing: IDrawing): Promise<void> {
    if (!this.provider) return;
    if (!(await this.isAuthenticated())) return;
    if (!(await this.isDrawingInSyncFolder(drawing.id))) return;

    await this.provider.updateDrawing(drawing);
    XLogger.log("Drawing updated in cloud successfully");
  }

  /**
   * Check if a drawing is in the sync folder
   */
  private async isDrawingInSyncFolder(drawingId: string): Promise<boolean> {
    const folders = await browser.storage.local.get("folders");
    const syncFolder: Folder = folders.folders.find(
      (f: any) => f.name === SyncService.SYNC_FOLDER_NAME
    );

    if (!syncFolder || !syncFolder.drawingIds) return false;
    return syncFolder.drawingIds.includes(drawingId);
  }

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

  public async deleteDrawing(drawingName: string): Promise<void> {
    if (!this.provider) return;
    if (!(await this.isAuthenticated())) return;
    if (!(await this.isDrawingInSyncFolder(drawingName))) return;

    await this.provider.deleteDrawing(drawingName);
  }

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

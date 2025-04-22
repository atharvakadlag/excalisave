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
  }

  public async isAuthenticated(): Promise<boolean> {
    return (await this.provider?.isAuthenticated()) || false;
  }

  public async saveDrawing(drawing: IDrawing): Promise<void> {
    if (!this.provider) return;
    if (!(await this.isAuthenticated())) return;
    if (!(await this.isDrawingInSyncFolder(drawing.id))) return;

    await this.provider.saveDrawing(drawing);
    XLogger.log("Drawing updated in cloud successfully");
  }

  public async updateDrawing(drawing: IDrawing): Promise<void> {
    if (!this.provider) return;
    if (!(await this.isAuthenticated())) return;
    if (!(await this.isDrawingInSyncFolder(drawing.id))) return;

    await this.provider.updateDrawing(drawing);
  }

  /**
   * Check if a drawing is in the sync folder
   */
  private async isDrawingInSyncFolder(drawingId: string): Promise<boolean> {
    const folders = await browser.storage.local.get("folders");
    if (!folders || !folders.length) return false;

    const syncFolder: Folder = folders.folders.find(
      (f: any) => f.name === SyncService.SYNC_FOLDER_NAME
    );
    if (!syncFolder || !syncFolder.drawingIds) return false;

    return syncFolder.drawingIds.includes(drawingId);
  }

  private async ensureSyncFolderExists(): Promise<void> {
    const folders = await browser.storage.local.get("folders");
    if (!folders || !folders.length) return;

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

    await this.provider.syncFiles();
  }
}

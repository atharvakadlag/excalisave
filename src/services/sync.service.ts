import { browser } from "webextension-polyfill-ts";
import { SyncProvider } from "../interfaces/sync.interface";
import { XLogger } from "../lib/logger";
import { IDrawing } from "../interfaces/drawing.interface";
import { Folder } from "../interfaces/folder.interface";
import { GitHubProvider } from "./github/github-provider";

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
    XLogger.log("WE SYNCING BOYS", drawing);
    if (!this.provider) return;
    XLogger.log("found provider");
    if (!(await this.isAuthenticated())) return;
    XLogger.log("auth working");
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
    XLogger.log("Drawing in sync folder");
    const folders = await browser.storage.local.get("folders");
    if (!folders.folders) return false;

    XLogger.log("Folders found");
    const syncFolder: Folder = folders.folders.find(
      (f: any) => f.name === SyncService.SYNC_FOLDER_NAME
    );
    if (!syncFolder || !syncFolder.drawingIds) return false;
    XLogger.log("Sync folder found");

    return syncFolder.drawingIds.includes(drawingId);
  }

  private async ensureSyncFolderExists(): Promise<void> {
    const folders = await browser.storage.local.get("folders");
    if (!folders.folders) return;

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

  /**
   * Configure the GitHub provider with the given configuration
   */
  public async configureGitHubProvider(
    token: string,
    repoOwner: string,
    repoName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const githubProvider = new GitHubProvider();

      // Save the configuration
      await githubProvider.saveConfig({
        token,
        repoOwner,
        repoName,
      });

      // Set the provider and initialize
      this.setProvider(githubProvider);
      await this.initialize();

      return { success: true };
    } catch (error) {
      XLogger.error("Failed to configure GitHub provider", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Remove the GitHub provider configuration
   */
  public async removeGitHubProvider(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const githubProvider = new GitHubProvider();
      await githubProvider.removeConfig();
      this.setProvider(null);
      return { success: true };
    } catch (error) {
      XLogger.error("Failed to remove GitHub provider", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the current GitHub configuration
   */
  public async getGitHubConfig(): Promise<{
    success: boolean;
    config?: any;
    error?: string;
  }> {
    try {
      const githubProvider = new GitHubProvider();
      const config = await githubProvider.getConfig();
      return { success: true, config };
    } catch (error) {
      XLogger.error("Failed to get GitHub config", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if the GitHub provider is authenticated
   */
  public async checkGitHubAuth(): Promise<{
    success: boolean;
    isAuthenticated?: boolean;
    error?: string;
  }> {
    try {
      const isAuthenticated = await this.isAuthenticated();
      return { success: true, isAuthenticated };
    } catch (error) {
      XLogger.error("Failed to check GitHub auth", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

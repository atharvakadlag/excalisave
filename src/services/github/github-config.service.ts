import { XLogger } from "../../lib/logger";
import { GitHubProvider } from "./github-provider.service";
import { SyncService } from "../sync.service";

export class GitHubConfigService {
  private static instance: GitHubConfigService;
  private syncService: SyncService;

  private constructor() {
    this.syncService = SyncService.getInstance();
  }

  public static getInstance(): GitHubConfigService {
    if (!GitHubConfigService.instance) {
      GitHubConfigService.instance = new GitHubConfigService();
    }
    return GitHubConfigService.instance;
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
      this.syncService.setProvider(githubProvider);
      await this.syncService.initialize();

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
      this.syncService.setProvider(null);
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
      const isAuthenticated = await this.syncService.isAuthenticated();
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

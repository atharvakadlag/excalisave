import {
  SyncProvider,
  ChangeHistoryItem,
} from "../../interfaces/sync.interface";
import { IDrawing } from "../../interfaces/drawing.interface";
import { browser } from "webextension-polyfill-ts";
import { XLogger } from "../../lib/logger";

interface GitHubConfig {
  token: string;
  repoOwner: string;
  repoName: string;
}

/**
 * Utility function to encode Unicode strings as base64
 * This handles characters outside the Latin1 range that btoa() can't handle
 */
function encodeBase64(str: string): string {
  // Convert the string to a Uint8Array using TextEncoder
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  // Convert the Uint8Array to a base64 string
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }

  return btoa(binary);
}

export class GitHubProvider implements SyncProvider {
  private config: GitHubConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    const config = await browser.storage.local.get("githubConfig");
    if (config.githubConfig) {
      this.config = config.githubConfig;
    }
  }

  public async getConfig(): Promise<GitHubConfig | null> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config;
  }

  public async removeConfig(): Promise<void> {
    await browser.storage.local.remove("githubConfig");
    this.config = null;
  }

  public async saveConfig(config: GitHubConfig) {
    await browser.storage.local.set({ githubConfig: config });
    this.config = config;
  }

  public async initialize(): Promise<void> {
    if (!this.config) {
      throw new Error("GitHub configuration not set");
    }
    // Verify the token and repository access
    await this.isAuthenticated();
  }

  public async isAuthenticated(): Promise<boolean> {
    XLogger.debug("GitHub provider is authenticated");
    if (!this.config) return false;
    XLogger.debug("GitHub with config");

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}`,
        {
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      return response.ok;
    } catch (error) {
      XLogger.error("Failed to authenticate with GitHub", error);
      return false;
    }
  }

  public async saveDrawing(drawing: IDrawing): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents/${drawing.id}.json`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${this.config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Save drawing ${drawing.id}`,
            content: encodeBase64(JSON.stringify(drawing)),
          }),
        }
      );

      return response.ok;
    } catch (error) {
      XLogger.error("Failed to save drawing to GitHub", error);
      return false;
    }
  }

  public async updateDrawing(
    drawing: IDrawing
  ): Promise<
    | boolean
    | { conflict: boolean; localDrawing: IDrawing; remoteDrawing: IDrawing }
  > {
    if (!this.config) return false;

    try {
      // First get the current file to get its SHA
      const currentFile = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents/${drawing.id}.json`,
        {
          headers: {
            Authorization: `token ${this.config.token}`,
          },
        }
      );

      if (!currentFile.ok) {
        return this.saveDrawing(drawing);
      }

      const currentFileData = await currentFile.json();

      const response = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents/${drawing.id}.json`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${this.config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Update drawing ${drawing.id}`,
            content: encodeBase64(JSON.stringify(drawing)),
            sha: currentFileData.sha,
          }),
        }
      );

      // Check for 409 Conflict error
      if (response.status === 409) {
        // Get the remote drawing data
        const remoteDrawingResponse = await fetch(
          `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents/${drawing.id}.json`,
          {
            headers: {
              Authorization: `token ${this.config.token}`,
            },
          }
        );

        if (remoteDrawingResponse.ok) {
          const remoteData = await remoteDrawingResponse.json();
          const remoteContent = JSON.parse(atob(remoteData.content));

          return {
            conflict: true,
            localDrawing: drawing,
            remoteDrawing: remoteContent,
          };
        }
      }

      return response.ok;
    } catch (error) {
      XLogger.error("Failed to update drawing on GitHub", error);
      return false;
    }
  }

  public async deleteDrawing(drawing: IDrawing): Promise<boolean> {
    if (!this.config) return false;

    try {
      // First get the current file to get its SHA
      const currentFile = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents/${drawing.id}.json`,
        {
          headers: {
            Authorization: `token ${this.config.token}`,
          },
        }
      );

      if (!currentFile.ok) {
        return true; // File doesn't exist, consider it deleted
      }

      const currentFileData = await currentFile.json();

      const response = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents/${drawing.id}.json`,
        {
          method: "DELETE",
          headers: {
            Authorization: `token ${this.config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Delete drawing ${drawing.id}`,
            sha: currentFileData.sha,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      XLogger.error("Failed to delete drawing from GitHub", error);
      return false;
    }
  }

  /**
   * Fetch all drawings from GitHub and return them in IDrawing format
   */
  public async getAllFiles(): Promise<IDrawing[]> {
    if (!this.config) {
      XLogger.error("GitHub configuration not set");
      return [];
    }

    try {
      // Get all files from the repository
      const response = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contents`,
        {
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        XLogger.error("Failed to fetch repository contents");
        return [];
      }

      const files = await response.json();
      const drawings: IDrawing[] = [];

      // Process each JSON file
      for (const file of files) {
        if (file.name.endsWith(".json")) {
          try {
            const fileResponse = await fetch(file.download_url);
            if (fileResponse.ok) {
              const rawData = await fileResponse.json();

              // Convert GitHub data to IDrawing format
              const drawing: IDrawing = {
                id: file.name.replace(".json", ""),
                name: rawData.name || file.name.replace(".json", ""),
                sync: rawData.sync,
                createdAt: rawData.createdAt || new Date().toISOString(),
                imageBase64: rawData.imageBase64,
                viewBackgroundColor: rawData.viewBackgroundColor,
                data: {
                  excalidraw: rawData.data?.excalidraw || "",
                  excalidrawState: rawData.data?.excalidrawState || "",
                  versionFiles: rawData.data?.versionFiles || "",
                  versionDataState: rawData.data?.versionDataState || "",
                },
              };

              drawings.push(drawing);
            }
          } catch (error) {
            XLogger.error(`Failed to fetch drawing ${file.name}`, error);
          }
        }
      }

      return drawings;
    } catch (error) {
      XLogger.error("Failed to fetch drawings from GitHub", error);
      return [];
    }
  }

  public async getChangeHistory(limit?: number): Promise<ChangeHistoryItem[]> {
    if (!this.config) return [];

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.repoOwner}/${
          this.config.repoName
        }/commits?per_page=${limit || 10}`,
        {
          headers: {
            Authorization: `token ${this.config.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        XLogger.error("Failed to fetch commit history", response.status);
        return [];
      }

      const commits = await response.json();

      // Transform GitHub commits to our ChangeHistoryItem format
      return commits.map((commit: any) => ({
        id: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          date: commit.commit.author.date,
        },
      }));
    } catch (error) {
      XLogger.error("Failed to fetch commit history", error);
      return [];
    }
  }
}

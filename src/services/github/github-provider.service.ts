import {
  SyncProvider,
  ChangeHistoryItem,
} from "../../interfaces/sync.interface";
import { IDrawing } from "../../interfaces/drawing.interface";
import { XLogger } from "../../lib/logger";
import type {
  GitHubSyncConfig,
  AnySyncConfig,
  LegacyGitHubConfig,
} from "../../interfaces/sync-config.interface";
import { encodeBase64, createAuthedFetch, repoFilePath } from "../git/shared";

function isLegacyConfig(c: any): c is LegacyGitHubConfig {
  return (
    c &&
    typeof c.token === "string" &&
    typeof c.repoOwner === "string" &&
    typeof c.repoName === "string"
  );
}

function normalizeToGitHubConfig(
  input: GitHubSyncConfig | AnySyncConfig | LegacyGitHubConfig
): GitHubSyncConfig {
  if (isLegacyConfig(input)) {
    return {
      provider: "github",
      token: input.token,
      owner: input.repoOwner,
      repo: input.repoName,
      branch: "main",
    };
  }
  const c = input as AnySyncConfig;
  if (c.provider === "github") {
    return {
      provider: "github",
      nickname: c.nickname,
      token: c.token,
      owner: c.owner,
      repo: c.repo,
      branch: c.branch || "main",
    };
  }
  // If someone passes a gitea config here, this provider can't use it.
  throw new Error("GitHubProvider received non-GitHub config");
}

export class GitHubProvider implements SyncProvider {
  private config: GitHubSyncConfig | null = null;
  private authedFetch: ReturnType<typeof createAuthedFetch> | null = null;

  constructor(
    initialConfig?: GitHubSyncConfig | AnySyncConfig | LegacyGitHubConfig,
    deviceName?: string
  ) {
    if (initialConfig) {
      this.setConfig(initialConfig, deviceName);
    }
  }

  public setConfig(
    config: GitHubSyncConfig | AnySyncConfig | LegacyGitHubConfig,
    deviceName?: string
  ): void {
    const gh = normalizeToGitHubConfig(config);
    this.config = gh;
    this.authedFetch = createAuthedFetch(gh.token, deviceName);
  }

  public async getConfig(): Promise<GitHubSyncConfig | null> {
    return this.config;
  }

  public async removeConfig(): Promise<void> {
    // Storage is managed by SyncConfigService; provider clears in-memory only
    this.config = null;
    this.authedFetch = null;
  }

  public async saveConfig(
    config: GitHubSyncConfig | AnySyncConfig | LegacyGitHubConfig
  ) {
    const gh = normalizeToGitHubConfig(config);
    this.setConfig(gh);
  }

  private getBase(): string {
    // GitHub is always api.github.com for this provider
    return "https://api.github.com";
  }

  private getBranch(): string {
    return this.config?.branch || "main";
  }

  private filePath(id: string): string {
    return repoFilePath(id);
  }

  public async initialize(): Promise<void> {
    if (!this.config) {
      throw new Error("GitHub configuration not set");
    }
    await this.isAuthenticated();
  }

  public async isAuthenticated(): Promise<boolean> {
    XLogger.debug("GitHub provider is authenticated");
    if (!this.config || !this.authedFetch) return false;
    XLogger.debug("GitHub with config");

    try {
      const res = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${this.config.repo}`
      );
      return res.ok;
    } catch (error) {
      XLogger.error("Failed to authenticate with GitHub", error);
      return false;
    }
  }

  public async saveDrawing(drawing: IDrawing): Promise<boolean> {
    if (!this.config || !this.authedFetch) return false;

    const file = this.filePath(drawing.id);
    const url = `${this.getBase()}/repos/${this.config.owner}/${
      this.config.repo
    }/contents/${file}`;
    try {
      const res = await this.authedFetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Save drawing ${drawing.id}`,
          content: encodeBase64(JSON.stringify(drawing)),
          branch: this.getBranch(),
        }),
      });
      return res.ok;
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
    if (!this.config || !this.authedFetch) return false;

    const branch = this.getBranch();
    const file = this.filePath(drawing.id);
    const getUrl = `${this.getBase()}/repos/${this.config.owner}/${
      this.config.repo
    }/contents/${file}?ref=${encodeURIComponent(branch)}`;
    const putUrl = `${this.getBase()}/repos/${this.config.owner}/${
      this.config.repo
    }/contents/${file}`;
    try {
      // Get current file (at branch) to obtain its SHA
      const currentFileRes = await this.authedFetch(getUrl);

      if (!currentFileRes.ok) {
        return this.saveDrawing(drawing);
      }

      const currentFileData = await currentFileRes.json();

      const putRes = await this.authedFetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Update drawing ${drawing.id}`,
          content: encodeBase64(JSON.stringify(drawing)),
          sha: currentFileData.sha,
          branch,
        }),
      });

      if (putRes.status === 409) {
        const remoteRes = await this.authedFetch(getUrl);
        if (remoteRes.ok) {
          const remoteData = await remoteRes.json();
          const remoteContent = JSON.parse(atob(remoteData.content));
          return {
            conflict: true,
            localDrawing: drawing,
            remoteDrawing: remoteContent,
          };
        }
      }

      return putRes.ok;
    } catch (error) {
      XLogger.error("Failed to update drawing on GitHub", error);
      return false;
    }
  }

  public async deleteDrawing(drawing: IDrawing): Promise<boolean> {
    if (!this.config || !this.authedFetch) return false;

    const branch = this.getBranch();
    const file = this.filePath(drawing.id);
    try {
      const currentFileRes = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/contents/${file}?ref=${encodeURIComponent(branch)}`
      );

      if (!currentFileRes.ok) {
        return true; // doesn't exist, consider deleted
      }

      const currentFileData = await currentFileRes.json();

      const delRes = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/contents/${file}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Delete drawing ${drawing.id}`,
            sha: currentFileData.sha,
            branch,
          }),
        }
      );

      return delRes.ok;
    } catch (error) {
      XLogger.error("Failed to delete drawing from GitHub", error);
      return false;
    }
  }

  public async getAllFiles(): Promise<IDrawing[]> {
    if (!this.config || !this.authedFetch) {
      XLogger.error("GitHub configuration not set");
      return [];
    }

    const branch = this.getBranch();
    try {
      const listRes = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/contents?ref=${encodeURIComponent(branch)}`
      );

      if (!listRes.ok) {
        XLogger.error("Failed to fetch repository contents");
        return [];
      }

      const files = await listRes.json();
      const drawings: IDrawing[] = [];

      for (const file of files) {
        if (file.name.endsWith(".json")) {
          try {
            // Prefer download_url (already points at the ref we listed), fallback to constructing raw
            const fileRes = await fetch(file.download_url || file.url);
            if (fileRes.ok) {
              const rawData = await fileRes.json();
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
    if (!this.config || !this.authedFetch) return [];

    const branch = this.getBranch();
    try {
      const res = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/commits?per_page=${limit || 10}&sha=${encodeURIComponent(branch)}`
      );

      if (!res.ok) {
        XLogger.error("Failed to fetch commit history", res.status);
        return [];
      }

      const commits = await res.json();

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

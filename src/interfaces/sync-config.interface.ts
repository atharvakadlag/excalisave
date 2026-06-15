export type SyncProviderKind = "github" | "gitea";

export interface BaseSyncConfig {
  provider: SyncProviderKind;
  nickname?: string;
  token: string;
  owner: string;
  repo: string;
  branch: string;
  baseUrl?: string;
}

export interface GitHubSyncConfig extends BaseSyncConfig {
  provider: "github";
}

export interface GiteaSyncConfig extends BaseSyncConfig {
  provider: "gitea";
  baseUrl?: string;
}

export type AnySyncConfig = GitHubSyncConfig | GiteaSyncConfig;

// Legacy shape for migration
export interface LegacyGitHubConfig {
  token: string;
  repoOwner: string;
  repoName: string;
}

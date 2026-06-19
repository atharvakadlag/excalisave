export type SyncProviderKind = "github" | "gitea";

export interface BaseSyncConfig {
  provider: SyncProviderKind;
  nickname?: string;
  token: string;
  owner: string;
  repo: string;
  branch: string;
  baseUrl?: string;
  debounceMs?: number; // 0..600000 ms, default 10000
  autoSync?: boolean; // default true; when false, only explicit "Save" from excalisave menu triggers sync
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

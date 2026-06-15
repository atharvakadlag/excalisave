import type { AnySyncConfig } from "../interfaces/sync-config.interface";
import { GitHubProvider } from "./github/github-provider.service";
import { GiteaProvider } from "./gitea/gitea-provider.service";
import { SyncProvider } from "../interfaces/sync.interface";

export function createSyncProvider(
  config: AnySyncConfig,
  deviceName?: string
): SyncProvider {
  if (config.provider === "github") {
    return new GitHubProvider(config, deviceName);
  }
  if (config.provider === "gitea") {
    return new GiteaProvider(config, deviceName);
  }
  // Future: 'gitlab' etc.
  throw new Error(`Unsupported sync provider: ${(config as any).provider}`);
}

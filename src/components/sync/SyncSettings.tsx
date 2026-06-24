import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  TextField,
  Theme,
  HoverCard,
  ScrollArea,
  Checkbox,
  Card,
  Badge,
} from "@radix-ui/themes";
import { ArrowLeftIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { browser } from "webextension-polyfill-ts";
import {
  MessageType,
  GetChangeHistoryMessage,
  ConfigureSyncProviderMessage,
} from "../../constants/message.types";
import { ChangeHistoryItem } from "../../interfaces/sync.interface";
import { IDrawing } from "../../interfaces/drawing.interface";
import "./SyncSettings.scss";
import {
  CLAMP_MAX_SYNC_DEBOUNCE_MS,
  DEFAULT_SYNC_DEBOUNCE_MS,
} from "../../constants/sync-config";

interface SyncSettingsProps {
  onBack: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onBack }) => {
  // Generalized sync target fields
  const [providerKind, setProviderKind] = useState<"github" | "gitea">(
    "github"
  );
  const [nickname, setNickname] = useState("");
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [baseUrl, setBaseUrl] = useState(""); // only for gitea

  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [commits, setCommits] = useState<ChangeHistoryItem[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commitError, setCommitError] = useState<string>("");
  const [drawings, setDrawings] = useState<IDrawing[]>([]);
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Resilience / console state
  const [debounceMs, setDebounceMs] = useState<number>(60000);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [health, setHealth] = useState<any>(null);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setIsLoading(true);
        const response = await browser.runtime.sendMessage({
          type: MessageType.GET_SYNC_CONFIG,
        });

        if (!response || typeof response !== "object") {
          throw new Error("No response from background");
        }

        if (response.success === false) {
          // Background reported a failure (e.g. migration or storage error)
          if (response.error) {
            setError(response.error);
          }
          // do not throw; continue so drawings list can still load
        }

        if (response.success && response.config) {
          const c = response.config;
          setProviderKind((c.provider || "github") as "github" | "gitea");
          setNickname(c.nickname || "");
          setToken(c.token || "");
          setOwner(c.owner || c.repoOwner || "");
          setRepo(c.repo || c.repoName || "");
          setBranch(c.branch || "main");
          setBaseUrl(c.baseUrl || "");

          const authResponse = await browser.runtime.sendMessage({
            type: MessageType.CHECK_SYNC_AUTH,
          });
          if (!authResponse || typeof authResponse !== "object") {
            // non-fatal for initial load
          } else {
            setIsInitialized(
              authResponse.success && authResponse.isAuthenticated
            );
          }

          if (c.token && (c.owner || c.repoOwner) && (c.repo || c.repoName)) {
            loadCommitHistory();
          }

          // Load debounce from config (default 10s)
          const d = typeof c.debounceMs === "number" ? c.debounceMs : 10000;
          setDebounceMs(d);

          // Load autoSync from config (default true)
          const as = typeof c.autoSync === "boolean" ? c.autoSync : true;
          setAutoSync(as);

          // Load health + log for console
          loadHealthAndLog();
        }

        // Load drawings
        const storage = await browser.storage.local.get();
        const drawings: IDrawing[] = Object.values(storage).filter(
          (o) => o?.id?.startsWith?.("drawing:")
        );

        if (drawings) {
          setDrawings(drawings);
          setSelectedDrawings(drawings.map((d: IDrawing) => d.id));
        }
      } catch (error) {
        setError("Failed to load existing configuration");
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingConfig();
  }, []);

  const loadCommitHistory = async () => {
    try {
      setIsLoadingCommits(true);
      setCommitError("");

      const response = await browser.runtime.sendMessage({
        type: MessageType.GET_CHANGE_HISTORY,
        payload: {
          limit: 40,
        },
      } as GetChangeHistoryMessage);

      if (!response || !response.success) {
        setCommitError(
          (response && response.error) || "Failed to load commit history"
        );
      } else if (response.commits) {
        setCommits(response.commits);
      }
    } catch (error) {
      setCommitError("Failed to load commit history");
    } finally {
      setIsLoadingCommits(false);
    }
  };

  const loadHealthAndLog = async () => {
    try {
      setIsLoadingHealth(true);
      setIsLoadingLog(true);

      const [h, l] = await Promise.all([
        browser.runtime.sendMessage({ type: MessageType.GET_SYNC_HEALTH }),
        browser.runtime.sendMessage({ type: MessageType.GET_SYNC_LOG }),
      ]);

      if (h && h.success && h.health) setHealth(h.health);
      if (l && l.success && Array.isArray(l.log)) setSyncLog(l.log);
    } catch {
      // non-fatal for console
    } finally {
      setIsLoadingHealth(false);
      setIsLoadingLog(false);
    }
  };

  const handleResetHealth = async () => {
    try {
      await browser.runtime.sendMessage({
        type: MessageType.RESET_SYNC_HEALTH,
      });
      await loadHealthAndLog();
    } catch {}
  };

  const handleClearLog = async () => {
    try {
      await browser.runtime.sendMessage({ type: MessageType.CLEAR_SYNC_LOG });
      setSyncLog([]);
    } catch {}
  };

  const handleRefreshLog = async () => {
    await loadHealthAndLog();
  };

  const handleApplyDebounce = async (ms: number) => {
    const clamped = Math.max(
      0,
      Math.min(CLAMP_MAX_SYNC_DEBOUNCE_MS, Math.floor(ms))
    );
    try {
      await browser.runtime.sendMessage({
        type: MessageType.SET_SYNC_DEBOUNCE,
        payload: { debounceMs: clamped },
      });
      setDebounceMs(clamped);
    } catch {}
  };

  const handleApplyAutoSync = async (enabled: boolean) => {
    try {
      await browser.runtime.sendMessage({
        type: MessageType.SET_SYNC_AUTOSYNC,
        payload: { autoSync: enabled },
      });
      setAutoSync(enabled);
    } catch {}
  };

  const handleRemoveSync = async () => {
    try {
      setError("");
      setIsLoading(true);

      const response = await browser.runtime.sendMessage({
        type: MessageType.REMOVE_SYNC_PROVIDER,
      });

      if (!response || !response.success) {
        setError(
          (response && response.error) || "Failed to remove sync configuration"
        );
        return;
      }

      // Clear generalized fields
      setProviderKind("github");
      setNickname("");
      setToken("");
      setOwner("");
      setRepo("");
      setBranch("main");
      setBaseUrl("");
      setCommits([]);
    } catch (error) {
      setError("Failed to remove sync configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndUse = async () => {
    try {
      setError("");
      setIsLoading(true);

      const payloadConfig = {
        provider: providerKind,
        nickname: nickname || undefined,
        token,
        owner,
        repo,
        branch: branch || "main",
        baseUrl: providerKind === "gitea" ? baseUrl || undefined : undefined,
        debounceMs,
        autoSync,
      };
      // Request host permission for custom gitea/forgejo baseUrl (arbitrary self-hosted)
      if (providerKind === "gitea" && baseUrl) {
        try {
          const origin = new URL(baseUrl).origin + "/*";
          const granted = await browser.permissions.request({
            origins: [origin],
          });
          if (!granted) {
            setError("Permission to access the custom host was not granted.");
            setIsLoading(false);
            return;
          }
        } catch {
          // fall through; configure step will surface network/auth error if unreachable
        }
      }

      const response = await browser.runtime.sendMessage({
        type: MessageType.CONFIGURE_SYNC_PROVIDER,
        payload: {
          config: payloadConfig,
          drawingsToSync: selectedDrawings,
        },
      } as ConfigureSyncProviderMessage);

      if (!response || !response.success) {
        setError((response && response.error) || "Failed to initialize sync");
        setIsInitialized(false);
        return;
      }

      const authResponse = await browser.runtime.sendMessage({
        type: MessageType.CHECK_SYNC_AUTH,
      });
      if (
        !authResponse ||
        !authResponse.success ||
        !authResponse.isAuthenticated
      ) {
        setError(
          "Failed to authenticate. Please check your token and settings."
        );
        setIsInitialized(false);
        return;
      }

      setIsInitialized(true);
      loadCommitHistory();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to initialize sync"
      );
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDrawings(drawings.map((d: IDrawing) => d.id));
    } else {
      setSelectedDrawings([]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Theme accentColor="iris" className="sync-settings-theme">
      <Box className="sync-settings-container">
        <Container size="3" className="sync-settings-content">
          <Flex gap="3" px="1" py="6" justify="start" align="center">
            <Button
              variant="soft"
              onClick={onBack}
              style={{ marginRight: "var(--space-4)" }}
            >
              <ArrowLeftIcon width="16" height="16" />
              Back
            </Button>
            <Box>
              <Flex gap="2" align="center">
                <Heading as="h1" size="7" mb="1">
                  Sync Settings
                </Heading>
                <Badge color={isInitialized ? "green" : "red"}>
                  {isInitialized ? "Initialized" : "Not Initialized"}
                </Badge>
              </Flex>
              <Text size="2" as="p" color="gray">
                Configure a Git sync target (GitHub or Gitea/Forgejo incl.
                Codeberg). Set a nickname for future multi-remote use, and
                choose a branch (default "main").
              </Text>
            </Box>
          </Flex>

          <Flex
            direction="column"
            gap="4"
            px="1"
            className="sync-settings-grid"
          >
            <Card size="3" className="sync-settings-card">
              <Heading as="h3" size="5" mb="2">
                Git Sync Provider
              </Heading>
              <Text size="2" as="p" color="gray" mb="4">
                Choose GitHub or Gitea/Forgejo (Codeberg + self-hosted). Set a
                nickname for future multi-remote use, and pick a branch (default
                "main").{" "}
                <HoverCard.Root>
                  <HoverCard.Trigger>
                    <InfoCircledIcon
                      width="16"
                      height="16"
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                        marginLeft: "4px",
                        cursor: "pointer",
                        color: "var(--gray-a11)",
                      }}
                    />
                  </HoverCard.Trigger>
                  <HoverCard.Content size="2" style={{ maxWidth: 480 }}>
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="bold">
                        Setup Instructions:
                      </Text>

                      {/* Provider selector help */}
                      <Text size="2">
                        Provider:
                        <ul
                          style={{
                            marginTop: "4px",
                            marginLeft: "20px",
                            paddingLeft: "var(--space-2)",
                          }}
                        >
                          <li>
                            <b>GitHub</b>: uses github.com API
                          </li>
                          <li>
                            <b>Gitea/Forgejo</b>: works with Codeberg.org and
                            any self-hosted Forgejo/Gitea instance. Set the Base
                            API URL accordingly (Codeberg default:
                            https://codeberg.org/api/v1).
                          </li>
                        </ul>
                      </Text>

                      <Text size="2">
                        1. Create a Personal Access Token (PAT):
                        <ul
                          style={{
                            marginTop: "4px",
                            marginLeft: "20px",
                            paddingLeft: "var(--space-2)",
                          }}
                        >
                          <li>
                            GitHub: Settings → Developer Settings → Personal
                            Access Tokens → Fine-grained tokens. Contents: Read
                            and write, Metadata: Read-only.
                          </li>
                          <li>
                            Gitea/Forgejo (Codeberg): User Settings →
                            Applications → Generate Token. Grant repository
                            read/write scope.
                          </li>
                        </ul>
                      </Text>

                      <Text size="2">
                        2. Create a repository on your chosen host if you don't
                        have one. Do not initialize with README if you want to
                        sync existing drawings.
                      </Text>

                      <Text size="2">
                        3. Fill in the fields below:
                        <ul
                          style={{
                            marginTop: "4px",
                            marginLeft: "20px",
                            paddingLeft: "var(--space-2)",
                          }}
                        >
                          <li>
                            <b>Nickname</b> (optional): label for this target
                            (useful later for multi-remote or grouping).
                          </li>
                          <li>Paste your PAT</li>
                          <li>Owner / organization / group</li>
                          <li>Repository / project name</li>
                          <li>Branch (default: main)</li>
                          <li>
                            Base API URL (only for Gitea/Forgejo; e.g.
                            https://codeberg.org/api/v1 or your self-hosted
                            /api/v1)
                          </li>
                        </ul>
                      </Text>
                      <Text size="2" color="gray">
                        Permissions: public hosts (GitHub, Codeberg, gitea.com)
                        are pre-granted. For other self-hosted instances the
                        extension will request the origin when you save; you can
                        also grant manually in your browser's extension site
                        access settings.
                      </Text>
                    </Flex>
                  </HoverCard.Content>
                </HoverCard.Root>
              </Text>

              <Flex direction="column" gap="4">
                {/* Provider selector */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Provider <Text color="red">*</Text>
                  </Text>
                  <select
                    value={providerKind}
                    onChange={(e) =>
                      setProviderKind(e.target.value as "github" | "gitea")
                    }
                    disabled={isLoading}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--gray-a6)",
                      background: "var(--gray-a2)",
                      color: "var(--gray-12)",
                    }}
                  >
                    <option value="github">GitHub</option>
                    <option value="gitea">
                      Gitea / Forgejo (e.g. Codeberg)
                    </option>
                  </select>
                </Box>

                {/* Nickname */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Nickname (optional)
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="Label for this sync target (e.g. work-codeberg)"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>

                {/* Token */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Access Token (PAT) <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      type="password"
                      placeholder="Paste your PAT"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>

                {/* Owner */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Owner / Group <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="username or org/group"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>

                {/* Repo */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Repository / Project <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="repository name or group/sub/project"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>

                {/* Branch (default main) */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Branch
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="main"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value || "main")}
                      disabled={isLoading}
                    />
                  </TextField.Root>
                  <Text size="1" color="gray">
                    Default: main
                  </Text>
                </Box>

                {/* Debounce (0..600 seconds) */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Debounce (seconds)
                  </Text>
                  <Flex gap="2" align="center">
                    <TextField.Root>
                      <TextField.Input
                        type="number"
                        min={0}
                        max={600}
                        step={1}
                        value={Math.floor(debounceMs / 1000)}
                        onChange={(e) => {
                          const secs = Math.max(
                            0,
                            Math.min(
                              600,
                              Math.floor(Number(e.target.value) || 0)
                            )
                          );
                          setDebounceMs(secs * 1000);
                        }}
                        disabled={isLoading}
                        style={{ width: 120 }}
                      />
                    </TextField.Root>
                    <Button
                      variant="soft"
                      onClick={() => handleApplyDebounce(debounceMs)}
                      disabled={isLoading}
                    >
                      Apply
                    </Button>
                    <Text size="1" color="gray">
                      0 disables. Default 60s. Max{" "}
                      {CLAMP_MAX_SYNC_DEBOUNCE_MS / 1000 / 60 / 60}hr
                    </Text>
                  </Flex>
                </Box>

                {/* Auto-sync toggle */}
                <Box>
                  <Text as="label" size="2" mb="1">
                    Auto-sync
                  </Text>
                  <Flex gap="2" align="center">
                    <Button
                      variant={autoSync ? "solid" : "soft"}
                      onClick={() => handleApplyAutoSync(true)}
                      disabled={isLoading}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={!autoSync ? "solid" : "soft"}
                      onClick={() => handleApplyAutoSync(false)}
                      disabled={isLoading}
                    >
                      Disabled
                    </Button>
                    <Text size="1" color="gray">
                      When disabled, sync only on explicit "Save" from
                      excalisave menu.
                    </Text>
                  </Flex>
                </Box>

                {/* Base URL (only for gitea) */}
                {providerKind === "gitea" && (
                  <Box>
                    <Text as="label" size="2" mb="1">
                      Base API URL
                    </Text>
                    <TextField.Root>
                      <TextField.Input
                        placeholder="https://codeberg.org/api/v1"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        disabled={isLoading}
                      />
                    </TextField.Root>
                    <Text size="1" color="gray">
                      For Codeberg use https://codeberg.org/api/v1. For
                      self-hosted Forgejo/Gitea use your instance /api/v1. The
                      extension will request permission for custom hosts when
                      you save.
                    </Text>
                  </Box>
                )}

                {error && (
                  <Text size="2" color="red">
                    {error}
                  </Text>
                )}

                <Flex gap="3" mt="2">
                  <Button
                    onClick={handleSaveAndUse}
                    disabled={!token || !owner || !repo || isLoading}
                  >
                    {isLoading ? "Saving..." : "Save And Use Settings"}
                  </Button>
                  <Button
                    variant="soft"
                    color="red"
                    onClick={handleRemoveSync}
                    disabled={(!token && !owner && !repo) || isLoading}
                  >
                    {isLoading ? "Removing..." : "Remove Sync"}
                  </Button>
                </Flex>
              </Flex>
            </Card>

            <Card size="3" className="sync-settings-card">
              <Heading as="h3" size="5" mb="2">
                Select Drawings to Sync ({selectedDrawings.length} /{" "}
                {drawings.length})
              </Heading>
              <Text size="2" as="p" color="gray" mb="4">
                Choose which drawings to opt into the active sync target at
                configuration time. You can toggle sync per-drawing later from
                the main list.
              </Text>

              <Flex direction="column" gap="2">
                <Flex
                  justify="between"
                  align="center"
                  style={{ padding: "var(--space-2) 0" }}
                >
                  <Text size="2" weight="bold">
                    Sync All Drawings
                  </Text>
                  <Checkbox
                    checked={
                      drawings.length > 0 &&
                      selectedDrawings.length === drawings.length
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={drawings.length === 0}
                  />
                </Flex>
              </Flex>
            </Card>

            <Card size="3" className="sync-settings-card">
              <Heading as="h3" size="5" mb="2">
                Sync Console
              </Heading>
              <Text size="2" as="p" color="gray" mb="3">
                Local sync activity, health, and controls. Debounce and circuit
                breaker prevent hammering on errors or offline.
              </Text>

              <Flex direction="column" gap="3">
                <Flex align="center" gap="2" wrap="wrap">
                  <Text size="2" weight="medium">
                    Health:
                  </Text>
                  <Badge
                    color={
                      !health
                        ? "gray"
                        : health.state === "closed"
                        ? "green"
                        : health.state === "half-open"
                        ? "amber"
                        : "red"
                    }
                  >
                    {health
                      ? `${health.state} (failures=${health.failures || 0})`
                      : isLoadingHealth
                      ? "loading..."
                      : "unknown"}
                  </Badge>
                  {health && health.lastError && (
                    <Text size="1" color="gray" title={health.lastError}>
                      last: {String(health.lastError).slice(0, 60)}
                    </Text>
                  )}
                </Flex>

                <Flex gap="2" wrap="wrap">
                  <Button
                    variant="soft"
                    onClick={handleResetHealth}
                    disabled={isLoading}
                  >
                    Reset health
                  </Button>
                  <Button
                    variant="soft"
                    onClick={async () => {
                      try {
                        await browser.runtime.sendMessage({
                          type: MessageType.SYNC_FLUSH,
                        });
                      } catch {}
                      await loadHealthAndLog();
                    }}
                    disabled={isLoading}
                  >
                    Flush now
                  </Button>
                  <Button
                    variant="soft"
                    onClick={handleClearLog}
                    disabled={isLoading}
                  >
                    Clear log
                  </Button>
                  <Button
                    variant="soft"
                    onClick={handleRefreshLog}
                    disabled={isLoading}
                  >
                    Refresh
                  </Button>
                </Flex>

                {isLoadingLog ? (
                  <Text size="2" color="gray">
                    Loading console...
                  </Text>
                ) : syncLog.length === 0 ? (
                  <Card variant="surface">
                    <Text size="2" color="gray">
                      No sync events yet.
                    </Text>
                  </Card>
                ) : (
                  <ScrollArea className="sync-history-scroll">
                    <Flex direction="column" gap="2">
                      {syncLog
                        .slice()
                        .reverse()
                        .map((e, idx) => (
                          <Card key={idx} size="1" variant="surface">
                            <Flex direction="column" gap="1">
                              <Flex justify="between" align="center" gap="2">
                                <Badge
                                  color={
                                    e.level === "error"
                                      ? "red"
                                      : e.level === "warn"
                                      ? "amber"
                                      : "gray"
                                  }
                                >
                                  {e.level}
                                </Badge>
                                <Text
                                  size="1"
                                  color="gray"
                                  style={{ whiteSpace: "nowrap" }}
                                >
                                  {formatDate(String(e.ts))}
                                </Text>
                              </Flex>
                              <Text size="2">{e.message}</Text>
                              {e.detail && (
                                <Text
                                  size="1"
                                  color="gray"
                                  style={{ whiteSpace: "pre-wrap" }}
                                >
                                  {String(e.detail).slice(0, 800)}
                                </Text>
                              )}
                            </Flex>
                          </Card>
                        ))}
                    </Flex>
                  </ScrollArea>
                )}
              </Flex>
            </Card>

            <Card size="3" className="sync-settings-card">
              <Heading as="h3" size="5" mb="2">
                Sync History
              </Heading>
              <Text size="2" as="p" color="gray" mb="4">
                Recent synchronization activity with your configured sync
                target.
              </Text>

              {isLoadingCommits ? (
                <Flex
                  align="center"
                  justify="center"
                  gap="2"
                  style={{ minHeight: 100 }}
                >
                  <Text size="2" color="gray">
                    Loading sync history...
                  </Text>
                </Flex>
              ) : commitError ? (
                <Card
                  variant="surface"
                  style={{
                    backgroundColor: "var(--red-a3)",
                    border: "1px solid var(--red-a6)",
                  }}
                >
                  <Text size="2" color="red">
                    {commitError}
                  </Text>
                </Card>
              ) : commits.length === 0 ? (
                <Card variant="surface">
                  <Text size="2" color="gray">
                    No sync history found. Configure a provider above and sync
                    some drawings.
                  </Text>
                </Card>
              ) : (
                <ScrollArea className="sync-history-scroll">
                  <Flex direction="column" gap="3">
                    {commits.map((commit) => (
                      <Card key={commit.id} size="1">
                        <Flex direction="column" gap="2">
                          <Flex justify="between" align="start" gap="3">
                            <Text
                              size="2"
                              weight="medium"
                              style={{ flexGrow: 1 }}
                            >
                              {commit.message}
                            </Text>
                            <Text
                              size="1"
                              color="gray"
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {formatDate(commit.author.date)}
                            </Text>
                          </Flex>
                          <Flex gap="2" align="center">
                            <Text size="1" color="gray">
                              {commit.id.slice(0, 7)}
                            </Text>
                          </Flex>
                          {commit.files && commit.files.length > 0 && (
                            <Box
                              style={{
                                marginTop: "var(--space-1)",
                                padding: "var(--space-2)",
                                background: "var(--gray-a2)",
                                borderRadius: "var(--radius-2)",
                                border: "1px solid var(--gray-a4)",
                              }}
                            >
                              <Text
                                size="1"
                                weight="medium"
                                mb="1"
                                color="gray"
                              >
                                Changed Files:
                              </Text>
                              <Flex direction="column" gap="1">
                                {commit.files.map((file, index) => (
                                  <Text key={index} size="1" color="gray">
                                    {file.status === "added" && "➕ "}
                                    {file.status === "modified" && "✏️ "}
                                    {file.status === "deleted" && "🗑️ "}
                                    {file.name}
                                  </Text>
                                ))}
                              </Flex>
                            </Box>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </ScrollArea>
              )}
            </Card>
          </Flex>
        </Container>
      </Box>
    </Theme>
  );
};

export default SyncSettings;

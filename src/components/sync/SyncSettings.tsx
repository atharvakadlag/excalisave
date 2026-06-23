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
  ConfigureGithubProviderMessage,
} from "../../constants/message.types";
import { ChangeHistoryItem } from "../../interfaces/sync.interface";
import { IDrawing } from "../../interfaces/drawing.interface";
import "./SyncSettings.scss";

interface SyncSettingsProps {
  onBack: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onBack }) => {
  const [githubToken, setGithubToken] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [commits, setCommits] = useState<ChangeHistoryItem[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commitError, setCommitError] = useState<string>("");
  const [drawings, setDrawings] = useState<IDrawing[]>([]);
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setIsLoading(true);
        const response = await browser.runtime.sendMessage({
          type: MessageType.GET_GITHUB_CONFIG,
        });

        if (response.success && response.config) {
          setGithubToken(response.config.token || "");
          setRepoOwner(response.config.repoOwner || "");
          setRepoName(response.config.repoName || "");

          // Check if sync is initialized
          const authResponse = await browser.runtime.sendMessage({
            type: MessageType.CHECK_GITHUB_AUTH,
          });
          setIsInitialized(
            authResponse.success && authResponse.isAuthenticated,
          );

          // Load commit history if GitHub is configured
          if (
            response.config.token &&
            response.config.repoOwner &&
            response.config.repoName
          ) {
            loadCommitHistory();
          }
        }

        // Load drawings
        const storage = await browser.storage.local.get();
        const drawings: IDrawing[] = Object.values(storage).filter(
          (o) => o?.id?.startsWith?.("drawing:"),
        );

        if (drawings) {
          setDrawings(drawings);
          // Select all drawings by default
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

      if (response.success && response.commits) {
        setCommits(response.commits);
      } else {
        setCommitError(response.error || "Failed to load commit history");
      }
    } catch (error) {
      setCommitError("Failed to load commit history");
    } finally {
      setIsLoadingCommits(false);
    }
  };

  const handleRemoveSync = async () => {
    try {
      setError("");
      setIsLoading(true);

      const response = await browser.runtime.sendMessage({
        type: MessageType.REMOVE_GITHUB_PROVIDER,
      });

      if (!response.success) {
        setError(response.error || "Failed to remove sync configuration");
        return;
      }

      setGithubToken("");
      setRepoOwner("");
      setRepoName("");
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

      const response = await browser.runtime.sendMessage({
        type: "CONFIGURE_GITHUB_PROVIDER",
        payload: {
          token: githubToken,
          repoOwner: repoOwner,
          repoName: repoName,
          drawingsToSync: selectedDrawings,
        },
      } as ConfigureGithubProviderMessage);

      if (!response.success) {
        setError(response.error || "Failed to initialize GitHub sync");
        setIsInitialized(false);
        return;
      }

      const authResponse = await browser.runtime.sendMessage({
        type: MessageType.CHECK_GITHUB_AUTH,
      });
      if (!authResponse.success || !authResponse.isAuthenticated) {
        setError(
          "Failed to authenticate with GitHub. Please check your token and repository settings.",
        );
        setIsInitialized(false);
        return;
      }

      setIsInitialized(true);
      // Load commit history after successful configuration
      loadCommitHistory();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to initialize GitHub sync",
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
                Configure GitHub integration, manage synced files, and view
                history.
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
                GitHub Integration
              </Heading>
              <Text size="2" as="p" color="gray" mb="4">
                Connect your GitHub account to sync your drawings. You'll need a
                Personal Access Token.{" "}
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
                  <HoverCard.Content size="2" style={{ maxWidth: 400 }}>
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="bold">
                        Setup Instructions:
                      </Text>
                      <Text size="2">
                        1. Create a GitHub Personal Access Token:
                        <ul
                          style={{
                            marginTop: "4px",
                            marginLeft: "20px",
                            paddingLeft: "var(--space-2)",
                          }}
                        >
                          <li>
                            Go to GitHub Settings → Developer Settings →
                            Personal Access Tokens → Fine-grained tokens
                          </li>
                          <li>Click "Generate new token"</li>
                          <li>Give it a name (e.g., "Excalisave Sync")</li>
                          <li>
                            For better security, select "Only select
                            repositories" and choose your specific repository
                          </li>
                          <li>
                            Under "Repository permissions":
                            <ul
                              style={{
                                marginTop: "4px",
                                marginLeft: "20px",
                                paddingLeft: "var(--space-2)",
                              }}
                            >
                              <li>Contents: Read and write</li>
                              <li>Metadata: Read-only</li>
                            </ul>
                          </li>
                          <li>
                            Copy the generated token immediately (you won't see
                            it again)
                          </li>
                        </ul>
                      </Text>
                      <Text size="2">
                        2. Create a GitHub Repository:
                        <ul
                          style={{
                            marginTop: "4px",
                            marginLeft: "20px",
                            paddingLeft: "var(--space-2)",
                          }}
                        >
                          <li>
                            Go to GitHub and click the "+" in the top right
                          </li>
                          <li>Select "New repository"</li>
                          <li>Choose a repository name</li>
                          <li>Make it public or private as needed</li>
                          <li>
                            Don't initialize with README if you want to sync
                            existing files
                          </li>
                        </ul>
                      </Text>
                      <Text size="2">
                        3. Enter the details below:
                        <ul
                          style={{
                            marginTop: "4px",
                            marginLeft: "20px",
                            paddingLeft: "var(--space-2)",
                          }}
                        >
                          <li>Paste your Personal Access Token</li>
                          <li>
                            Enter your GitHub username or organization name
                          </li>
                          <li>Enter the repository name you created</li>
                        </ul>
                      </Text>
                    </Flex>
                  </HoverCard.Content>
                </HoverCard.Root>
              </Text>

              <Flex direction="column" gap="4">
                <Box>
                  <Text as="label" size="2" mb="1">
                    GitHub Token <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      type="password"
                      placeholder="Enter your GitHub token (e.g., ghp_...)"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>
                <Box>
                  <Text as="label" size="2" mb="1">
                    Repository Owner <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="Your GitHub username or organization"
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>
                <Box>
                  <Text as="label" size="2" mb="1">
                    Repository Name <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="The name of your repository"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>
                {error && (
                  <Text size="2" color="red">
                    {error}
                  </Text>
                )}
                <Flex gap="3" mt="2">
                  <Button
                    onClick={handleSaveAndUse}
                    disabled={
                      !githubToken || !repoOwner || !repoName || isLoading
                    }
                  >
                    {isLoading ? "Saving..." : "Save And Use Settings"}
                  </Button>
                  <Button
                    variant="soft"
                    color="red"
                    onClick={handleRemoveSync}
                    disabled={
                      (!githubToken && !repoOwner && !repoName) || isLoading
                    }
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
                Choose whether to sync all your drawings with GitHub.
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
                Sync History
              </Heading>
              <Text size="2" as="p" color="gray" mb="4">
                Recent synchronization activity with your GitHub repository.
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
                    No sync history found. Configure GitHub above and sync some
                    drawings.
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

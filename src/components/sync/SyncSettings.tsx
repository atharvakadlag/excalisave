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
  Table,
  ScrollArea,
} from "@radix-ui/themes";
import { ArrowLeftIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { browser } from "webextension-polyfill-ts";
import {
  MessageType,
  GetChangeHistoryMessage,
} from "../../constants/message.types";
import { ChangeHistoryItem } from "../../interfaces/sync.interface";

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

  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setIsLoading(true);
        const response = await browser.runtime.sendMessage({
          type: "GET_GITHUB_CONFIG",
        });

        if (response.success && response.config) {
          setGithubToken(response.config.token || "");
          setRepoOwner(response.config.repoOwner || "");
          setRepoName(response.config.repoName || "");
        }
      } catch (error) {
        setError("Failed to load existing configuration");
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingConfig();
  }, []);

  useEffect(() => {
    // Load commit history when GitHub is configured
    if (githubToken && repoOwner && repoName) {
      loadCommitHistory();
    }
  }, [githubToken, repoOwner, repoName]);

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
        type: "REMOVE_GITHUB_PROVIDER",
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
        },
      });

      if (!response.success) {
        setError(response.error || "Failed to initialize GitHub sync");
        return;
      }

      const authResponse = await browser.runtime.sendMessage({
        type: "CHECK_GITHUB_AUTH",
      });
      if (!authResponse.success || !authResponse.isAuthenticated) {
        setError(
          "Failed to authenticate with GitHub. Please check your token and repository settings."
        );
        return;
      }

      // Load commit history after successful configuration
      loadCommitHistory();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to initialize GitHub sync"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Theme
      accentColor="iris"
      style={{
        height: "100%",
      }}
    >
      <Box
        style={{
          background: "var(--gray-a2)",
          borderRadius: "var(--radius-3)",
          width: "100vw",
          height: "100vh",
        }}
      >
        <Container size="2">
          <Flex gap="3" px="1" py="9" justify="start" align="center">
            <Button
              variant="soft"
              onClick={onBack}
              style={{ marginRight: "16px" }}
            >
              <ArrowLeftIcon width="16" height="16" />
              Back
            </Button>
            <Box>
              <Heading as="h1" size="7" style={{ paddingBottom: "4px" }}>
                Sync Settings
              </Heading>
              <Text size="2" as="p" style={{ lineHeight: 1.1 }}>
                Configure GitHub integration and manage synced files.
              </Text>
            </Box>
          </Flex>

          <Box px="4">
            <Box mb="6">
              <Heading as="h3" size="5" style={{ paddingBottom: "10px" }}>
                GitHub Integration
              </Heading>
              <Text
                size="2"
                as="p"
                style={{ lineHeight: 1.1, marginBottom: "16px" }}
              >
                Connect your GitHub account to sync your drawings. You'll need a
                Personal Access Token with 'repo' scope.{" "}
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
                        <ul style={{ marginTop: "4px", marginLeft: "20px" }}>
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
                              style={{ marginTop: "4px", marginLeft: "20px" }}
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
                        <ul style={{ marginTop: "4px", marginLeft: "20px" }}>
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
                        <ul style={{ marginTop: "4px", marginLeft: "20px" }}>
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

              <Flex direction="column" gap="3" style={{ maxWidth: "400px" }}>
                <Box>
                  <Text size="2" style={{ marginBottom: "4px" }}>
                    GitHub Token <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      type="password"
                      placeholder="Enter your GitHub token"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>
                <Box>
                  <Text size="2" style={{ marginBottom: "4px" }}>
                    Repository Owner <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="Repository owner (username or organization)"
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </TextField.Root>
                </Box>
                <Box>
                  <Text size="2" style={{ marginBottom: "4px" }}>
                    Repository Name <Text color="red">*</Text>
                  </Text>
                  <TextField.Root>
                    <TextField.Input
                      placeholder="Repository name"
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
                <Flex gap="3">
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
            </Box>

            <Box>
              <Heading as="h3" size="5" style={{ paddingBottom: "10px" }}>
                Commit History
              </Heading>
              <Text
                size="2"
                as="p"
                style={{ lineHeight: 1.1, marginBottom: "16px" }}
              >
                Recent commits to your GitHub repository.
              </Text>

              {isLoadingCommits ? (
                <Text size="2">Loading commit history...</Text>
              ) : commitError ? (
                <Text size="2" color="red">
                  {commitError}
                </Text>
              ) : commits.length === 0 ? (
                <Text size="2" color="gray">
                  No commits found. Make sure your GitHub configuration is
                  correct.
                </Text>
              ) : (
                <Box
                  style={{
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-3)",
                    padding: "16px",
                  }}
                >
                  <ScrollArea style={{ height: "300px" }}>
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            Author
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            Message
                          </Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {commits.map((commit) => (
                          <Table.Row key={commit.id}>
                            <Table.Cell>
                              {formatDate(commit.author.date)}
                            </Table.Cell>
                            <Table.Cell>{commit.author.name}</Table.Cell>
                            <Table.Cell>{commit.message}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </ScrollArea>
                </Box>
              )}
            </Box>
          </Box>
        </Container>
      </Box>
    </Theme>
  );
};

export default SyncSettings;

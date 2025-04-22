import React, { useState } from "react";
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
} from "@radix-ui/themes";
import { ArrowLeftIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { SyncService } from "../../services/sync.service";
import { GitHubProvider } from "../../services/github/github-provider";

interface SyncSettingsProps {
  onBack: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onBack }) => {
  const [githubToken, setGithubToken] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [knownFiles] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const handleSaveAndUse = async () => {
    try {
      setError("");
      const syncService = SyncService.getInstance();
      const githubProvider = new GitHubProvider();

      // Set the GitHub configuration
      await githubProvider.saveConfig({
        token: githubToken,
        repoOwner: repoOwner,
        repoName: repoName,
      });

      // Set the provider and initialize
      syncService.setProvider(githubProvider);
      await syncService.initialize();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to initialize GitHub sync"
      );
    }
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
                    />
                  </TextField.Root>
                </Box>
                {error && (
                  <Text size="2" color="red">
                    {error}
                  </Text>
                )}
                <Button
                  onClick={handleSaveAndUse}
                  disabled={!githubToken || !repoOwner || !repoName}
                >
                  Save And Use Settings
                </Button>
              </Flex>
            </Box>

            <Box>
              <Heading as="h3" size="5" style={{ paddingBottom: "10px" }}>
                Known Files
              </Heading>
              <Text
                size="2"
                as="p"
                style={{ lineHeight: 1.1, marginBottom: "16px" }}
              >
                Files that are currently synced with GitHub.
              </Text>
              <Box
                style={{
                  background: "var(--gray-a3)",
                  borderRadius: "var(--radius-3)",
                  padding: "16px",
                }}
              >
                {knownFiles.length === 0 ? (
                  <Text size="2" color="gray">
                    No files synced yet
                  </Text>
                ) : (
                  <Flex direction="column" gap="2">
                    {knownFiles.map((file, index) => (
                      <Text key={index} size="2">
                        {file}
                      </Text>
                    ))}
                  </Flex>
                )}
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
    </Theme>
  );
};

export default SyncSettings;

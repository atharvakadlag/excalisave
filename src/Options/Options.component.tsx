import {
  Avatar,
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Theme,
  Button,
} from "@radix-ui/themes";
import React, { useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { ImpExp } from "../components/ImpExp/ImpExp.component";
import SyncSettings from "../components/sync/SyncSettings";
import "./Options.styles.scss";
import { CustomDomainsSettings } from "../components/CustomDomain/CustomDomainSettings.component";

export const Options: React.FC = () => {
  const [showSyncSettings, setShowSyncSettings] = useState(false);

  if (showSyncSettings) {
    return <SyncSettings onBack={() => setShowSyncSettings(false)} />;
  }

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
        <Container size="2" pb="8">
          <Flex gap="3" px="1" py="9" justify={"start"} align={"center"}>
            <Box>
              <Avatar
                size={"5"}
                src={browser.runtime.getURL("assets/icons/128.png")}
                fallback={""}
              />
            </Box>
            <Box>
              <Heading as="h1" size="7" style={{ paddingBottom: "4px" }}>
                ExcaliSave Settings
              </Heading>
              <Text size={"2"} as="p" style={{ lineHeight: 1.1 }}>
                Customize how the ExcaliSave extension works in your browser.
                <br />
                These settings are specific to this browser profile.
              </Text>
            </Box>
          </Flex>
          <Box px="4">
            <Heading as="h3" size={"5"} style={{ paddingBottom: "10px" }}>
              Import/Export:
            </Heading>
            <Text size={"2"} as="p" style={{ lineHeight: 1.1 }}>
              Import or export your data to or from ExcaliSave.
            </Text>
            <br />
            <ImpExp />
          </Box>

          <Box px="4" mt="6">
            <Heading as="h3" size={"5"} style={{ paddingBottom: "10px" }}>
              Sync Settings:
            </Heading>
            <Text
              size={"2"}
              as="p"
              style={{ lineHeight: 1.1, marginBottom: "16px" }}
            >
              Configure GitHub sync settings and manage synced files.
            </Text>
            <Button
              onClick={() => setShowSyncSettings(true)}
              style={{ maxWidth: "400px", width: "100%" }}
            >
              Configure Sync Settings
            </Button>
            <CustomDomainsSettings />
          </Box>
        </Container>
      </Box>
    </Theme>
  );
};

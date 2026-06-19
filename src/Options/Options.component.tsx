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
import React, { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { ImpExp } from "../components/ImpExp/ImpExp.component";
import SyncSettings from "../components/sync/SyncSettings";
import "./Options.styles.scss";

export const Options: React.FC = () => {
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"inline" | "floating">(
    "floating"
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await browser.storage.local.get(
          "excalisave_menu_placement"
        );
        const v = (res as any)?.excalisave_menu_placement;
        if (v === "floating" || v === "inline") setMenuPlacement(v);
      } catch {}
    })();
  }, []);

  const applyMenuPlacement = async (v: "inline" | "floating") => {
    setMenuPlacement(v);
    try {
      await browser.storage.local.set({ excalisave_menu_placement: v });
    } catch {}
  };

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
        <Container size="2">
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
              Configure a Git sync target (GitHub or Gitea/Forgejo incl.
              Codeberg), set nickname/branch, and manage which drawings are
              synced. Public hosts are pre-granted; custom self-hosted origins
              will prompt for permission (or grant manually in browser extension
              site access).
            </Text>
            <Button
              onClick={() => setShowSyncSettings(true)}
              style={{ maxWidth: "400px", width: "100%" }}
            >
              Configure Sync Settings
            </Button>
          </Box>

          <Box px="4" mt="8">
            <Heading as="h3" size={"5"} style={{ paddingBottom: "10px" }}>
              Menu Placement:
            </Heading>
            <Text size={"2"} as="p" style={{ lineHeight: 1.1 }}>
              Choose how the Excalisave menu appears when you click the
              "Excalisave" button next to the diagram title.
            </Text>
            <br />
            <Flex gap="2">
              <Button
                variant={menuPlacement === "inline" ? "solid" : "soft"}
                onClick={() => applyMenuPlacement("inline")}
              >
                Inline
              </Button>
              <Button
                variant={menuPlacement === "floating" ? "solid" : "soft"}
                onClick={() => applyMenuPlacement("floating")}
              >
                Floating
              </Button>
            </Flex>
            <Text size="1" color="gray" mt="2" as="p">
              Inline: opens a positioned popup directly under the button (new
              behavior). Floating: uses the browser’s native popup.
            </Text>
          </Box>
        </Container>
      </Box>
    </Theme>
  );
};

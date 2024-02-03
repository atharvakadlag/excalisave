import {
  Box,
  Theme,
  Text,
  Container,
  Heading,
  Avatar,
  Flex,
} from "@radix-ui/themes";
import React from "react";
import { ImpExp } from "../components/ImpExp/ImpExp.component";
import "./Options.styles.scss";
import { browser } from "webextension-polyfill-ts";

export const Options: React.FC = () => {
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
            <Heading as="h3" size={"4"} style={{ paddingBottom: "10px" }}>
              Import/Export:
            </Heading>
            <Text size={"2"} as="p" style={{ lineHeight: 1.1 }}>
              Import or export your data to or from ExcaliSave.
            </Text>
            <br />
            <ImpExp />
          </Box>
        </Container>
      </Box>
    </Theme>
  );
};

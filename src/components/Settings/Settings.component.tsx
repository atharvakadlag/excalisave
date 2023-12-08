import {
  BookmarkIcon,
  CardStackPlusIcon,
  DownloadIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { Button, Box, Flex, Text, Callout } from "@radix-ui/themes";
import React from "react";

const CalloutText = Callout.Text as any;

export function Settings() {
  return (
    <Flex direction="column" p={"2"} gap={"3"}>
      <Box>
        <Text size={"4"} weight={"bold"}>
          Settings
        </Text>
      </Box>
      <Box>
        <Callout.Root size="1" color="yellow">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <CalloutText>
            You will need admin privileges to install and access this
            application.
          </CalloutText>
        </Callout.Root>
      </Box>
      <Flex justify={"center"} width={"100%"} direction={"column"} gap={"4"}>
        <Button variant="soft" style={{ width: "100%" }} size={"1"}>
          <CardStackPlusIcon width="14" height="14" />
          Import from JSON
        </Button>
        <Button variant="soft" style={{ width: "100%" }} size={"1"}>
          <DownloadIcon width="14" height="14" />
          Export to JSON
        </Button>
      </Flex>
    </Flex>
  );
}

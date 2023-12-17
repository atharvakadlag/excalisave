import {
  CardStackPlusIcon,
  DownloadIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { Box, Button, Callout, Flex, Text } from "@radix-ui/themes";
import React from "react";
import { browser } from "webextension-polyfill-ts";
import { IDrawing } from "../../interfaces/drawing.interface";
import JSZip from "jszip";
import FileSaver from "file-saver";

const CalloutText = Callout.Text as any;

export function Settings() {
  const onExportClick = async () => {
    const result = await browser.storage.local.get();

    const drawings: IDrawing[] = [];
    const favories: string[] = result["favorites"] || [];

    Object.entries(result).forEach(([key, value]) => {
      if (key.startsWith("drawing")) {
        drawings.push(value);
      }
    });

    const fileBlob = new Blob([JSON.stringify({ drawings, favories })], {
      type: "application/json",
    });

    const zipFile = new JSZip();

    zipFile.file("data.json", fileBlob);

    zipFile.generateAsync({ type: "blob" }).then((content) => {
      FileSaver.saveAs(content, `drawings-${Date.now()}.zip`);
    });
  };

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
        <Button
          onClick={onExportClick}
          variant="soft"
          style={{ width: "100%" }}
          size={"1"}
        >
          <DownloadIcon width="14" height="14" />
          Export to JSON
        </Button>
      </Flex>
    </Flex>
  );
}

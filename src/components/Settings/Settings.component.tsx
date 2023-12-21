import {
  CardStackPlusIcon,
  DownloadIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { Box, Button, Callout, Flex, Text } from "@radix-ui/themes";
import React, { useEffect } from "react";
import { browser } from "webextension-polyfill-ts";
import { IDrawing } from "../../interfaces/drawing.interface";
import JSZip from "jszip";
import FileSaver from "file-saver";
import { TabUtils } from "../../lib/utils/tab.utils";
import { XLogger } from "../../lib/logger";
import { ExportStore, MessageType } from "../../constants/message.types";

const CalloutText = Callout.Text as any;

export function Settings() {
  const onExportClick = async () => {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["./js/execute-scripts/export-store.bundle.js"],
    });
  };

  useEffect(() => {
    browser.runtime.onMessage.addListener(async (message: ExportStore) => {
      if (message.type === MessageType.EXPORT_STORE) {
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

        message.payload.files?.forEach((file) => {
          zipFile
            .folder("files-store")
            .file(`${file.id}.json`, JSON.stringify(file));
        });

        // Save file
        zipFile.generateAsync({ type: "blob" }).then((content) => {
          FileSaver.saveAs(
            content,
            `excalisave-backup-${new Date().toISOString()}.zip`
          );
        });
      }
    });
  }, []);

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

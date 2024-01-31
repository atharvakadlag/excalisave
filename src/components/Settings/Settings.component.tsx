import {
  CardStackPlusIcon,
  DownloadIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { Box, Button, Callout, Flex, Text } from "@radix-ui/themes";
import FileSaver from "file-saver";
import JSZip from "jszip";
import React, { ChangeEvent, useEffect } from "react";
import { browser } from "webextension-polyfill-ts";
import { ExportStore, MessageType } from "../../constants/message.types";
import { IDrawing } from "../../interfaces/drawing.interface";
import { XLogger } from "../../lib/logger";
import { TabUtils } from "../../lib/utils/tab.utils";
import { parseDataJSON } from "./helpers/import.helpers";
import { BinaryFiles } from "@excalidraw/excalidraw/types/types";

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

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      if (event.target?.files?.length !== 1) {
        console.error("File not selected");

        return;
      }

      const file = event.target.files[0];

      const isZipFile =
        file.name.toLocaleLowerCase().endsWith(".zip") &&
        file.type === "application/zip";

      if (!isZipFile) {
        XLogger.error("Invalid file type");

        return;
      }

      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onload = async () => {
        try {
          XLogger.log("Reading zip file");
          const zip = await JSZip.loadAsync(reader.result);

          const dataJSON = await parseDataJSON(zip);

          const filePromises: Promise<string>[] = [];

          zip.folder("files-store").forEach(async (_filepath, file) => {
            filePromises.push(file.async("text"));
          });

          const files = await Promise.all(filePromises);

          console.log("Alll the files", files);

          XLogger.log("Imported data.json", dataJSON);
        } catch (error) {
          console.error("Error while reading zip file", error);
        }
      };

      reader.onerror = () => {
        console.error();
      };
    } catch (error) {
      XLogger.error("Error while importing file", error);
    }
  };

  useEffect(() => {
    browser.runtime.onMessage.addListener(async (message: ExportStore) => {
      if (message.type === MessageType.EXPORT_STORE) {
        const result = await browser.storage.local.get();

        const favories: string[] = result["favorites"] || [];

        const drawings: IDrawing[] = [];
        Object.entries(result).forEach(([key, value]) => {
          if (key.startsWith("drawing")) {
            drawings.push(value);
          }
        });

        const zipFile = new JSZip();

        drawings.forEach((drawing) => {
          const elements = JSON.parse(drawing.data.excalidraw);

          // Filter files used in the drawing elements
          const files: BinaryFiles = {};
          for (const element of elements) {
            if (
              !element.isDeleted &&
              "fileId" in element &&
              element.fileId &&
              message.payload.files[element.fileId]
            ) {
              files[element.fileId] = message.payload.files[element.fileId];
            }
          }

          // This structure follows the .excalidraw file structure, so it can be imported independently without needing to install the extension.
          const drawingToExport: any = {
            elements,
            version: 2, // TODO: Should we get the version from source code? https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/constants.ts#L261
            type: "excalidraw",
            source: "https://excalidraw.com", // TODO: Support self hosting endpoints
            appState: {
              gridSize: null,
              viewBackgroundColor: drawing.viewBackgroundColor,
            },
            // Excalisave related data
            excalisave: {
              id: drawing.id,
              createdAt: drawing.createdAt,
              imageBase64: drawing.imageBase64,
              name: drawing.name,
            },
            files,
          };

          zipFile
            .folder("drawings")
            .file(
              `${drawing.id.replace("drawing:", "")}.excalidraw`,
              JSON.stringify(drawingToExport)
            );
        });

        const fileBlob = new Blob([JSON.stringify({ favories })], {
          type: "application/json",
        });

        zipFile.file("data.json", fileBlob);

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
        <input
          type="file"
          id="fileInput"
          style={{ display: "none" }}
          onChange={onImportFile}
          accept=".zip"
        />
        <Button
          onClick={() => document.getElementById("fileInput").click()}
          variant="soft"
          style={{ width: "100%" }}
          size={"1"}
        >
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

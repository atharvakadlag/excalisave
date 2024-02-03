import { BinaryFiles } from "@excalidraw/excalidraw/types/types";
import {
  DownloadIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { Box, Button, Callout, Flex, Text } from "@radix-ui/themes";
import FileSaver from "file-saver";
import JSZip from "jszip";
import React, { ChangeEvent, useEffect } from "react";
import { browser } from "webextension-polyfill-ts";
import {
  ExportStore,
  MessageType,
  SaveNewDrawingMessage,
} from "../../constants/message.types";
import { IDrawing } from "../../interfaces/drawing.interface";
import { XLogger } from "../../lib/logger";
import { RandomUtils } from "../../lib/utils/random.utils";
import { TabUtils } from "../../lib/utils/tab.utils";
import { parseDataJSON } from "./helpers/import.helpers";

const CalloutText = Callout.Text as any;

export function ImpExp() {
  const onExportClick = async () => {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    const excalidrawTab = await browser.tabs.create({
      url: "https://excalidraw.com",
      index: activeTab.index + 1,
      active: false,
    });

    // Seems we need to wait a bit to avoid not executing the script
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await browser.scripting.executeScript({
      target: { tabId: excalidrawTab.id },
      files: ["./js/execute-scripts/export-store.bundle.js"],
    });
  };

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    console.log("event", event);
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

          const filePromises: Promise<any>[] = [];

          zip.folder("drawings").forEach((_filepath, file) => {
            filePromises.push(file.async("text"));
          });

          const drawings = (await Promise.all(filePromises)).map((file) =>
            JSON.parse(file)
          );

          const files: any = {};

          // Future date to avoid be deleted by excalidraw
          const lastRetrieved = new Date();
          lastRetrieved.setFullYear(lastRetrieved.getFullYear() + 5);

          for (const drawing of drawings) {
            if (drawing.files) {
              Object.entries(drawing.files).forEach(([key, value]) => {
                files[key] = {
                  ...(value as any),
                  lastRetrieved: lastRetrieved.getTime(),
                };
              });
            }
          }

          XLogger.debug("Files to import", files);

          const activeTab = await TabUtils.getActiveTab();

          if (!activeTab) {
            XLogger.warn("No active tab found");

            return;
          }

          const excalidrawTab = await browser.tabs.create({
            url: "https://excalidraw.com",
            index: activeTab.index + 1,
            active: false,
          });

          // Seems we need to wait a bit to avoid not executing the script
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // This workaround is to pass params to script, it's ugly but it works
          await browser.scripting.executeScript({
            target: {
              tabId: excalidrawTab.id,
            },
            func: (files) => {
              window.__SCRIPT_PARAMS__ = { files };
            },
            args: [files],
          });

          await browser.scripting.executeScript({
            target: { tabId: excalidrawTab.id },
            files: ["./js/execute-scripts/load-store.bundle.js"],
          });

          const favorites: string[] = dataJSON?.favorites || [];

          // Since we are creating new ids for all the drawings, we need to update the favorites to use the new ids
          const favoritesToImport: string[] = [];

          // Import drawings
          drawings.forEach((drawing) => {
            XLogger.debug("Importing drawing", drawing);
            const newId = `drawing:${RandomUtils.generateRandomId()}`;

            if (favorites?.includes(drawing.excalisave?.id)) {
              favoritesToImport.push(newId);
            }

            const newDrawingMessage: SaveNewDrawingMessage = {
              type: MessageType.SAVE_NEW_DRAWING,
              payload: {
                // Generate new id to avoid to overwrite existing drawings and data loss
                // TODO: Add a way to merge drawings with the same id
                id: newId,
                name: drawing.excalisave?.name + " (imported)",
                imageBase64: drawing.excalisave?.imageBase64,
                viewBackgroundColor: drawing.appState?.viewBackgroundColor,
                excalidraw: JSON.stringify(drawing.elements),
                excalidrawState: JSON.stringify(drawing.appState),
                versionFiles: drawing.versionFiles,
                versionDataState: drawing.versionDataState,
              },
            };

            XLogger.debug("Importing drawing", newDrawingMessage);

            browser.runtime.sendMessage(newDrawingMessage);
          });

          // Import favorites
          XLogger.debug("Importing favorites", favoritesToImport);

          if (favoritesToImport.length > 0) {
            const favorites = await browser.storage.local.get("favorites");
            const newFavorites = new Set([
              ...(favorites.favorites || []),
              ...favoritesToImport,
            ]);

            await browser.storage.local.set({
              favorites: Array.from(newFavorites),
            });
          }

          XLogger.debug("Finished importing drawings");
        } catch (error) {
          XLogger.error("Error while reading zip file", error);
        } finally {
          // After import reload, this is because can't import a second time
          // TODO: Investigate why can't import a second time
          window.location.reload();
        }
      };

      reader.onerror = (error) => {
        XLogger.error(error);
      };
    } catch (error) {
      XLogger.error("Error while importing file", error);
    }
  };

  useEffect(() => {
    browser.runtime.onMessage.addListener(async (message: ExportStore) => {
      console.log("MEssage ", message);
      if (message.type === MessageType.EXPORT_STORE) {
        const result = await browser.storage.local.get();

        const drawings: IDrawing[] = [];
        Object.entries(result).forEach(([key, value]) => {
          if (key.startsWith("drawing")) {
            drawings.push(value);
          }
        });

        const zipFile = new JSZip();

        // favorites
        const favorites: string[] = result["favorites"] || [];
        zipFile.file("data.json", JSON.stringify({ favorites }));

        // drawings
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

        const fileBlob = await zipFile.generateAsync({ type: "blob" });

        FileSaver.saveAs(
          fileBlob,
          `excalisave-backup-${new Date().toISOString()}.zip`
        );
      }
    });
  }, []);

  return (
    <Flex direction="column" gap={"3"}>
      <Box>
        <Callout.Root size="1" color="red" role="alergt">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <CalloutText>
            Make sure you are on excalidraw.com tab before importing or
            exporting. It won't work on other tabs.
          </CalloutText>
        </Callout.Root>

        <Callout.Root
          style={{
            marginTop: "8px",
          }}
          size="1"
          color="blue"
          variant="soft"
        >
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <CalloutText>
            Imported files are imported as new drawings, so they won't
            overwrite.
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
          <UploadIcon width="14" height="14" />
          Import Backup (.zip)
        </Button>
        <Button
          onClick={onExportClick}
          variant="soft"
          style={{ width: "100%" }}
          size={"1"}
        >
          <DownloadIcon width="14" height="14" />
          Export Backup (.zip)
        </Button>
      </Flex>
    </Flex>
  );
}

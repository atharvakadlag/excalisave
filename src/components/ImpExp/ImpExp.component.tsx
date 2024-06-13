import { BinaryFiles } from "@excalidraw/excalidraw/types/types";
import {
  DownloadIcon,
  InfoCircledIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { Box, Button, Callout, Flex } from "@radix-ui/themes";
import FileSaver from "file-saver";
import JSZip from "jszip";
import React, { ChangeEvent, useEffect } from "react";
import { browser } from "webextension-polyfill-ts";
import {
  ExportStoreMessage,
  MessageType,
  SaveNewDrawingMessage,
} from "../../constants/message.types";
import { IDrawing } from "../../interfaces/drawing.interface";
import { Folder } from "../../interfaces/folder.interface";
import { XLogger } from "../../lib/logger";
import { keyBy } from "../../lib/utils/array.utils";
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

      XLogger.info(
        "File selected: " +
          JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          })
      );

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

          let favorites: string[] = dataJSON?.favorites || [];
          let folders: Folder[] = dataJSON?.folders || [];

          XLogger.debug("Importing data", { favorites, folders });

          const oldToNewIds: Record<string, string> = {};

          // Import drawings
          drawings.forEach((drawing) => {
            XLogger.debug("Importing drawing", drawing);
            const newId = `drawing:${RandomUtils.generateRandomId()}`;

            if (drawing.excalisave?.id) {
              oldToNewIds[drawing.excalisave?.id] = newId;
            } else {
              return;
            }

            const newDrawingMessage: SaveNewDrawingMessage = {
              type: MessageType.SAVE_NEW_DRAWING,
              payload: {
                // Generate new id to avoid to overwrite existing drawings and data loss
                // TODO: Add a way to merge drawings with the same id
                id: newId,
                name: drawing.excalisave?.name + "(2)",
                imageBase64: drawing.excalisave?.imageBase64,
                viewBackgroundColor: drawing.appState?.viewBackgroundColor,
                excalidraw: JSON.stringify(drawing.elements),
                excalidrawState: JSON.stringify(drawing.appState),
                versionFiles: drawing.versionFiles,
                versionDataState: drawing.versionDataState,
              },
            };

            XLogger.debug("Importing drawing", newDrawingMessage);

            // STORE: Save new drawing
            browser.runtime.sendMessage(newDrawingMessage);
          });

          XLogger.debug("Old to new drawing ids", oldToNewIds);

          // Replace old ids with new ids
          favorites = favorites
            .map((favorite) => oldToNewIds[favorite])
            .filter(Boolean);

          if (favorites.length > 0) {
            const existentFavorites =
              await browser.storage.local.get("favorites");

            const newFavorites = new Set([
              ...(existentFavorites.favorites || []),
              ...favorites,
            ]);

            // STORE: Save favorites
            await browser.storage.local.set({
              favorites: Array.from(newFavorites),
            });

            XLogger.debug("Imported favorites", newFavorites);
          }

          const existentFolders: Folder[] =
            (await browser.storage.local.get("folders"))?.folders || [];

          const existentFoldersMap = keyBy(existentFolders, "id");

          folders = folders.map((folder) => {
            return {
              ...folder,
              drawingIds: folder.drawingIds
                .map((drawingId) => {
                  return oldToNewIds[drawingId];
                })
                .filter(Boolean),
            };
          });

          const foldersMap = keyBy(folders, "id");

          const newFolders = existentFolders.map((existentFolder) => {
            const newFolder = foldersMap[existentFolder.id];

            if (newFolder) {
              return {
                ...existentFolder,
                drawingIds: Array.from(
                  new Set([
                    ...existentFolder.drawingIds,
                    ...newFolder.drawingIds,
                  ])
                ),
              };
            }

            return existentFolder;
          });

          folders.forEach((folder) => {
            if (!existentFoldersMap[folder.id]) {
              newFolders.push(folder);
            }
          });

          XLogger.debug("Importing folders", newFolders);

          // STORE: Save folders
          await browser.storage.local.set({
            folders: newFolders,
          });

          XLogger.debug("Finished importing drawings");
        } catch (error) {
          XLogger.error("Error while reading zip file", error);
        } finally {
          // After import reload, this is because can't import a second time
          // TODO: Investigate why can't import a second time without reload
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
    browser.runtime.onMessage.addListener(
      async (message: ExportStoreMessage) => {
        if (message.type === MessageType.EXPORT_STORE) {
          const result = await browser.storage.local.get();

          const drawings: IDrawing[] = [];
          Object.entries(result).forEach(([key, value]) => {
            if (key.startsWith("drawing")) {
              drawings.push(value);
            }
          });

          const zipFile = new JSZip();

          // Include favorites and folders
          const favorites: string[] = result["favorites"] || [];
          const folders: Folder[] = result["folders"] || [];

          zipFile.file("data.json", JSON.stringify({ favorites, folders }));

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
      }
    );
  }, []);

  return (
    <Flex direction="column" gap={"3"}>
      <Box>
        <Callout.Root
          style={{
            marginTop: "8px",
          }}
          // size="1"
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
          variant="surface"
          style={{ width: "100%" }}
        >
          <UploadIcon width="14" height="14" />
          Import Backup (.zip)
        </Button>
        <Button
          onClick={onExportClick}
          variant="surface"
          style={{ width: "100%" }}
        >
          <DownloadIcon width="14" height="14" />
          Export Backup (.zip)
        </Button>
      </Flex>
    </Flex>
  );
}

import {
  BookmarkIcon,
  Cross1Icon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  HeartFilledIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
  Button,
  Callout,
  Dialog,
  Flex,
  Grid,
  IconButton,
  Strong,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import React, { useEffect, useRef, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { Drawing } from "../components/Drawing/Drawing.component";
import { NavBar } from "../components/NavBar/Navbar.component";
import { Placeholder } from "../components/Placeholder/Placeholder.component";
import { Sidebar } from "../components/Sidebar/Sidebar.component";
import { IDrawing } from "../interfaces/drawing.interface";
import { DrawingStore } from "../lib/drawing-store";
import { XLogger } from "../lib/logger";
import { TabUtils } from "../lib/utils/tab.utils";
import { useCurrentDrawingId } from "./hooks/useCurrentDrawing.hook";
import { useDrawingLoading } from "./hooks/useDrawingLoading.hook";
import { useFavorites } from "./hooks/useFavorites.hook";
import { useRestorePoint } from "./hooks/useRestorePoint.hook";
import { useFolders } from "./hooks/useFolders.hook";
import "./Popup.styles.scss";
import {
  CleanupFilesMessage,
  DeleteDrawingMessage,
  DeleteDrawingSyncMessage,
  MessageType,
  SyncDrawingMessage,
} from "../constants/message.types";
import { MergeConflictDialog } from "../components/MergeConflict/MergeConflict.component";
import { SyncService } from "../services/sync.service";

const DialogDescription = Dialog.Description as any;
const CalloutText = Callout.Text as any;

const Popup: React.FC = () => {
  const [drawings, setDrawings] = React.useState<IDrawing[]>([]);
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const {
    folders,
    createFolder,
    renameFolder,
    removeFolder,
    addDrawingToFolder,
    removeDrawingFromFolder,
    removeDrawingFromAllFolders,
  } = useFolders();
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const {
    currentDrawingId,
    inExcalidrawPage,
    setCurrentDrawingId,
    isLiveCollaboration,
    setIsLiveCollaboration,
  } = useCurrentDrawingId();
  const drawingIdToSwitch = useRef<string | undefined>(undefined);
  const [sidebarSelected, setSidebarSelected] = useState("");
  const { getRestorePoint, setRestorePoint } = useRestorePoint();
  const { loading, startLoading } = useDrawingLoading();
  const [isConfirmSwitchDialogOpen, setIsConfirmSwitchDialogOpen] =
    useState<boolean>(false);
  const [mergeConflict, setMergeConflict] = useState<{
    isOpen: boolean;
    drawingId: string;
    localDrawing: IDrawing;
    remoteDrawing: IDrawing;
  } | null>(null);
  const syncService = SyncService.getInstance();

  useEffect(() => {
    getRestorePoint()
      .then((restorePoint) => {
        if (restorePoint?.searchTerm) {
          setSearchTerm(restorePoint.searchTerm);
        }

        setSidebarSelected(restorePoint?.sidebarSelected || "All");
      })
      .catch(() => {
        setSidebarSelected("All");
      });

    const loadDrawings = async () => {
      const result: Record<string, IDrawing> =
        await browser.storage.local.get();

      const newDrawings: IDrawing[] = Object.values(result).filter(
        (drawing: IDrawing) => drawing?.id?.startsWith?.("drawing:")
      );

      setDrawings(newDrawings);
    };

    loadDrawings();

    // This allows updating the screenshot preview when popup is open to not wait until next time it's opened
    const onDrawingChanged = async (changes: any, areaName: string) => {
      if (areaName !== "local") return;

      setDrawings((prevDrawings) => {
        return prevDrawings.map((drawing) => {
          if (changes[drawing.id]) {
            return {
              ...drawing,
              ...changes[drawing.id].newValue,
            };
          }
          return drawing;
        });
      });
    };

    browser.storage.onChanged.addListener(onDrawingChanged);

    browser.storage.session
      .get("lastFileCleanupDate")
      .then(async ({ lastFileCleanupDate }) => {
        const currentDate = new Date().getTime();

        // Run cleanup process every 3 days
        // Condition is checked every time popup is opened
        const Ndays = 1000 * 60 * 60 * 24 * 3;
        const hasPassedNDays = currentDate - lastFileCleanupDate > Ndays;
        if (hasPassedNDays || !lastFileCleanupDate) {
          XLogger.debug("N days passed. Cleaning up old files");

          const activeTab = await TabUtils.getActiveTab();

          XLogger.debug("Active tab", activeTab);
          if (
            !activeTab ||
            !activeTab.url?.startsWith("https://excalidraw.com")
          ) {
            XLogger.error(
              "Error loading drawing: No active tab or drawing found",
              {
                activeTab,
              }
            );

            return;
          }

          await Promise.all([
            browser.runtime.sendMessage({
              type: MessageType.CLEANUP_FILES,
              payload: {
                tabId: activeTab.id,
                executionTimestamp: currentDate,
              },
            } as CleanupFilesMessage),
            browser.storage.session.set({
              lastFileCleanupDate: currentDate,
            }),
          ]);
        }
      });

    // Listen for merge conflict messages
    const handleMergeConflict = (message: any) => {
      if (message.type === MessageType.SHOW_MERGE_CONFLICT) {
        setMergeConflict({
          isOpen: true,
          drawingId: message.payload.drawingId,
          localDrawing: message.payload.localDrawing,
          remoteDrawing: message.payload.remoteDrawing,
        });
      }
    };

    browser.runtime.onMessage.addListener(handleMergeConflict);

    return () => {
      browser.storage.onChanged.removeListener(onDrawingChanged);
      browser.runtime.onMessage.removeListener(handleMergeConflict);
    };
  }, []);

  useEffect(() => {
    setRestorePoint({
      searchTerm,
      sidebarSelected: sidebarSelected || "All",
    });
  }, [searchTerm, sidebarSelected]);

  const onRenameDrawing = async (id: string, newName: string) => {
    try {
      // Update the UI
      const newDrawing = drawings.map((drawing) => {
        if (drawing.id === id) {
          return {
            ...drawing,
            name: newName,
          };
        }

        return drawing;
      });

      setDrawings(newDrawing);

      // Update local storage
      await browser.storage.local.set({
        [id]: {
          ...drawings.find((drawing) => drawing.id === id),
          name: newName,
        },
      });

      // Sync the drawing to the cloud
      await browser.runtime.sendMessage({
        type: MessageType.SYNC_DRAWING,
        payload: {
          id,
        },
      } as SyncDrawingMessage);
    } catch (error) {
      XLogger.error("Error renaming drawing", error);
    }
  };

  const onDeleteDrawing = async (id: string) => {
    try {
      // First, try to delete from sync service
      await browser.runtime.sendMessage({
        type: MessageType.DELETE_DRAWING,
        payload: {
          id,
        },
      } as DeleteDrawingMessage);

      // Then update the UI and remove from local storage
      const newDrawing = drawings.filter((drawing) => drawing.id !== id);
      setDrawings(newDrawing);

      if (currentDrawingId === id) {
        setCurrentDrawingId(undefined);
      }

      // Finally, remove from folders and local storage
      await Promise.allSettled([
        removeDrawingFromAllFolders(id),
        DrawingStore.deleteDrawing(id),
      ]);
    } catch (error) {
      XLogger.error("Error deleting drawing", error);
    }
  };

  const handleLoadItem = async (loadDrawingId: string) => {
    const isSameDrawing = loadDrawingId === currentDrawing?.id;
    if (!loading && (isLiveCollaboration || !isSameDrawing)) {
      startLoading();
      const activeTab = await TabUtils.getActiveTab();

      if (!activeTab) {
        XLogger.error("Error loading drawing: No active tab or drawing found", {
          activeTab,
        });

        return;
      }

      await DrawingStore.loadDrawing(loadDrawingId);

      setCurrentDrawingId(loadDrawingId);
      setIsLiveCollaboration(false);
      // TODO: Activate this to avoid fast switching errors(or block switching for a few milis)
      // window.close();
    }
  };

  const handleCreateNewDrawing = async (name: string, sync: boolean = true) => {
    await DrawingStore.saveNewDrawing({ name, sync });
    window.close();
  };

  const handleSaveCurrentDrawing = async () => {
    await DrawingStore.saveCurrentDrawing();
    window.close();
  };

  const handleNewDrawing = async () => {
    await DrawingStore.newDrawing();
    setCurrentDrawingId(undefined);
    window.close();
  };

  const handleAddToFavorites = async (drawingId: string) => {
    await addToFavorites(drawingId);
  };

  const handleRemoveFromFavorites = async (drawingId: string) => {
    await removeFromFavorites(drawingId);
  };

  const handleToggleSync = async (drawingId: string, sync: boolean) => {
    try {
      // Update the UI
      const newDrawing = drawings.map((drawing) => {
        if (drawing.id === drawingId) return { ...drawing, sync };
        return drawing;
      });
      setDrawings(newDrawing);

      // Update local storage
      await browser.storage.local.set({
        [drawingId]: {
          ...drawings.find((drawing) => drawing.id === drawingId),
          sync,
        },
      });

      // If enabling sync, trigger an immediate sync
      if (sync) {
        await browser.runtime.sendMessage({
          type: MessageType.SYNC_DRAWING,
          payload: {
            id: drawingId,
          },
        } as SyncDrawingMessage);
        return;
      }

      if (!sync) {
        await browser.runtime.sendMessage({
          type: MessageType.DELETE_DRAWING_SYNC,
          payload: {
            id: drawingId,
          },
        } as DeleteDrawingSyncMessage);
      }
    } catch (error) {
      XLogger.error("Error toggling sync for drawing", error);
    }
  };

  const currentDrawing = drawings.find(
    (drawing) => drawing.id === currentDrawingId
  );

  const handleLoadItemWithConfirm = async (loadDrawingId: string) => {
    if (!inExcalidrawPage) return;

    if (!currentDrawing && (await DrawingStore.hasUnsavedChanges())) {
      drawingIdToSwitch.current = loadDrawingId;
      setIsConfirmSwitchDialogOpen(true);
    } else {
      handleLoadItem(loadDrawingId);
    }
  };

  const filterDrawings = () => {
    if (sidebarSelected?.startsWith("folder:")) {
      const folder = folders.find((folder) => folder.id === sidebarSelected);

      if (!folder) {
        return [];
      }

      return drawings.filter((drawing) => {
        return folder.drawingIds.includes(drawing.id);
      });
    }

    switch (sidebarSelected) {
      case "Favorites":
        return drawings.filter((drawing) => {
          return favorites.includes(drawing.id);
        });
      case "Results":
        return drawings.filter((drawing) => {
          // TODO: Fix this, this is not enecssary
          return (
            drawing.name &&
            drawing.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
      default:
        return drawings;
    }
  };

  const filteredDrawings = filterDrawings();

  const showDrawings = () => {
    return (
      <Grid columns="2" gapX="3" gapY="5" width="auto" pb="3" pt="3">
        {filteredDrawings.map((drawing, index) => (
          <Drawing
            key={drawing.id}
            index={index}
            drawing={drawing}
            folders={folders}
            folderIdSelected={
              sidebarSelected.startsWith("folder:")
                ? sidebarSelected
                : undefined
            }
            inExcalidrawPage={inExcalidrawPage}
            favorite={favorites.includes(drawing.id)}
            onClick={handleLoadItemWithConfirm}
            isCurrent={currentDrawingId === drawing.id}
            onRenameDrawing={onRenameDrawing}
            onAddToFavorites={handleAddToFavorites}
            onRemoveFromFavorites={handleRemoveFromFavorites}
            onDeleteDrawing={onDeleteDrawing}
            onAddToFolder={addDrawingToFolder}
            onRemoveFromFolder={removeDrawingFromFolder}
            onToggleSync={handleToggleSync}
          />
        ))}
      </Grid>
    );
  };

  /**
   * Handle the resolution of a merge conflict
   * Updates local storage and UI with the chosen version
   * @param useLocal Whether to use the local version (true) or remote version (false)
   */
  const handleResolveConflict = async (useLocal: boolean) => {
    if (!mergeConflict) return;

    // Select the appropriate drawing based on user choice
    const drawingToUse = useLocal
      ? mergeConflict.localDrawing
      : mergeConflict.remoteDrawing;

    // Update local storage with the chosen version
    await browser.storage.local.set({
      [mergeConflict.drawingId]: drawingToUse,
    });

    // Update the UI to reflect the changes
    setDrawings(
      drawings.map((drawing) =>
        drawing.id === mergeConflict.drawingId ? drawingToUse : drawing
      )
    );

    // Try to save to GitHub again
    const result = await syncService.updateDrawing(drawingToUse);

    if (!result.success) {
      XLogger.error("Failed to save drawing after conflict resolution");
    }

    setMergeConflict(null);
  };

  return (
    <Theme
      accentColor="iris"
      style={{
        height: "100%",
      }}
    >
      <section className="Popup">
        <NavBar
          onCreateNewDrawing={handleCreateNewDrawing}
          onNewDrawing={handleNewDrawing}
          isLoading={loading}
          inExcalidrawPage={inExcalidrawPage}
          currentDrawing={currentDrawing}
          isLiveCollaboration={isLiveCollaboration}
          onSaveDrawing={handleSaveCurrentDrawing}
          SearchComponent={
            <TextField.Root
              style={{
                width: "183px",
              }}
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
              <TextField.Input
                autoFocus
                ref={searchInputRef}
                value={searchTerm}
                onChange={(event) => {
                  if (sidebarSelected !== "Results") {
                    setSidebarSelected("Results");
                  }
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search Drawing"
              />

              <TextField.Slot>
                {searchTerm && (
                  <IconButton
                    onClick={() => {
                      setSearchTerm("");
                      searchInputRef.current && searchInputRef.current?.focus();
                    }}
                    title="Cancel search"
                    size="1"
                    variant="ghost"
                  >
                    <CrossCircledIcon height="14" width="14" />
                  </IconButton>
                )}
              </TextField.Slot>
            </TextField.Root>
          }
        />
        <Flex
          style={{
            height: "calc(100% - 60px)",
            width: "100%",
          }}
        >
          <Sidebar
            folders={folders}
            onCreateFolder={createFolder}
            onRemoveFolder={removeFolder}
            selected={sidebarSelected}
            onRenameFolder={renameFolder}
            onChangeSelected={(selected) => setSidebarSelected(selected)}
          />
          <div className="Popup__content">
            {sidebarSelected === "Favorites" &&
              (filteredDrawings.length >= 1 ? (
                showDrawings()
              ) : (
                <Placeholder
                  icon={<HeartFilledIcon width={"30"} height={"30"} />}
                  message={
                    <Text size={"2"}>
                      Your favorite drawings will appear here
                    </Text>
                  }
                />
              ))}

            {sidebarSelected === "Results" &&
              (searchTerm !== "" ? (
                filteredDrawings.length >= 1 ? (
                  showDrawings()
                ) : (
                  <Placeholder
                    icon={<MagnifyingGlassIcon width={"30"} height={"30"} />}
                    message={
                      <Text size={"2"}>No items found for "{searchTerm}"</Text>
                    }
                  />
                )
              ) : (
                <Placeholder
                  icon={<MagnifyingGlassIcon width={"30"} height={"30"} />}
                  message={<Text size={"2"}>Search for something</Text>}
                />
              ))}

            {(sidebarSelected === "All" || sidebarSelected === "") &&
              (filteredDrawings.length > 0 ? (
                showDrawings()
              ) : (
                <Placeholder
                  icon={<BookmarkIcon width={"30"} height={"30"} />}
                  message={
                    <Text size={"2"}>
                      You don't have saved drawings yet. <br />
                      Start saving one by clicking on the <Strong>
                        Save
                      </Strong>{" "}
                      button.
                    </Text>
                  }
                />
              ))}

            {sidebarSelected.startsWith("folder:") &&
              (filteredDrawings.length > 0 ? (
                showDrawings()
              ) : (
                <Placeholder
                  icon={<Cross1Icon width={"30"} height={"30"} />}
                  message={<Text size={"2"}>Collection is empty.</Text>}
                />
              ))}
          </div>
        </Flex>

        {/* -------- CONFIRM DIALOG ---------  */}
        <Dialog.Root
          open={isConfirmSwitchDialogOpen}
          onOpenChange={(isOpen) => setIsConfirmSwitchDialogOpen(isOpen)}
        >
          <Dialog.Content
            style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
            size="1"
          >
            <Dialog.Title size={"4"}>You have unsaved changes</Dialog.Title>

            <DialogDescription>
              <Callout.Root color="red">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <CalloutText>
                  Data will be lost. Are you sure you want to continue?
                </CalloutText>
              </Callout.Root>
              <br />
              <Text
                color="gray"
                size="1"
                style={{
                  marginLeft: "5px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <InfoCircledIcon
                  width="12"
                  height="12"
                  style={{ paddingRight: "5px" }}
                />
                You can click "Cancel" and save your changes before.
              </Text>
              <br />
            </DialogDescription>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Dialog.Close>
                <Button
                  color="red"
                  onClick={() => {
                    setIsConfirmSwitchDialogOpen(false);

                    if (drawingIdToSwitch.current) {
                      handleLoadItem(drawingIdToSwitch.current);
                      drawingIdToSwitch.current = undefined;
                    }
                  }}
                >
                  Yes, continue
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>

        {/* Merge Conflict Dialog */}
        {mergeConflict && (
          <MergeConflictDialog
            isOpen={mergeConflict.isOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setMergeConflict(null);
              }
            }}
            localDrawing={mergeConflict.localDrawing}
            remoteDrawing={mergeConflict.remoteDrawing}
            onResolve={handleResolveConflict}
          />
        )}
      </section>
    </Theme>
  );
};

export default Popup;

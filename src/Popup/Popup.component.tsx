import {
  BookmarkFilledIcon,
  CrossCircledIcon,
  HeartFilledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
  Button,
  Flex,
  Grid,
  IconButton,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import React, { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { CurrentDrawing } from "../components/CurrentDrawing/CurrentDrawing.component";
import { Drawing } from "../components/Drawing/Drawing.component";
import { NavBar } from "../components/NavBar/Navbar.component";
import { Placeholder } from "../components/Placeholder/Placeholder.component";
import { Sidebar } from "../components/Sidebar/Sidebar.component";
import { IDrawing } from "../interfaces/drawing.interface";
import { DrawingStore } from "../lib/drawing-store";
import { TabUtils } from "../lib/utils/tab.utils";
import "./Popup.styles.scss";
import { useCurrentDrawingId } from "./hooks/useCurrentDrawing.hook";
import { useFavorites } from "./hooks/useFavorites.hook";
import { useRestorePoint } from "./hooks/useRestorePoint.hook";

const Popup: React.FC = () => {
  const [drawings, setDrawings] = React.useState<IDrawing[]>([]);
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { currentDrawingId, setCurrentDrawingId } = useCurrentDrawingId();
  const [sidebarSelected, setSidebarSelected] = useState("");
  const { getRestorePoint, setRestorePoint } = useRestorePoint();

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

      const newDrawings: IDrawing[] = Object.entries(result)
        .filter(([key]) => key !== "favorites")
        .map(([_key, value]) => value);

      setDrawings(newDrawings);
    };

    loadDrawings();
  }, []);

  useEffect(() => {
    setRestorePoint({
      searchTerm,
      sidebarSelected: sidebarSelected || "All",
    });
  }, [searchTerm, sidebarSelected]);

  const onRenameDrawing = async (id: string, newName: string) => {
    try {
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

      await browser.storage.local.set({
        [id]: {
          ...drawings.find((drawing) => drawing.id === id),
          name: newName,
        },
      });
    } catch (error) {
      console.error("Error renaming drawing", error);
    }
  };

  const onDeleteDrawing = async (id: string) => {
    try {
      const newDrawing = drawings.filter((drawing) => drawing.id !== id);

      setDrawings(newDrawing);

      if (currentDrawingId === id) {
        setCurrentDrawingId(undefined);
      }

      await DrawingStore.deleteDrawing(id);
    } catch (error) {
      console.error("Error deleting drawing", error);
    }
  };

  const handleLoadItem = async (id: string) => {
    const drawing = drawings.find((drawing) => drawing.id === id);
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab || !drawing) {
      console.error("Error loading drawing: No active tab or drawing found", {
        activeTab,
        drawing,
      });

      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (drawing: IDrawing) => {
        localStorage.setItem("excalidraw", drawing.data["excalidraw"]);
        localStorage.setItem(
          "excalidraw-state",
          drawing.data["excalidrawState"]
        );
        localStorage.setItem("version-files", drawing.data["versionFiles"]);
        localStorage.setItem(
          "version-dataState",
          drawing.data["versionDataState"]
        );
        localStorage.setItem("__drawing_id", drawing["id"]);
        location.reload();
      },
      args: [drawing],
    });

    setCurrentDrawingId(id);
    // TODO: Activate this to avoid fast switching errors(or block switching for a few milis)
    // window.close();
  };

  const handleCreateNewDrawing = async (name: string) => {
    await DrawingStore.saveNewDrawing({ name });
    window.close();
  };

  const handleSaveCurrentDrawing = async () => {
    await DrawingStore.saveCurrentDrawing();
    window.close();
  };

  const handleAddToFavorites = async (drawingId: string) => {
    await addToFavorites(drawingId);
  };

  const handleRemoveFromFavorites = async (drawingId: string) => {
    await removeFromFavorites(drawingId);
  };

  const currentDrawing = drawings.find(
    (drawing) => drawing.id === currentDrawingId
  );

  const filterDrawings = () => {
    switch (sidebarSelected) {
      case "Favorites":
        return drawings.filter((drawing) => {
          return favorites.includes(drawing.id);
        });
      case "Results":
        return drawings.filter((drawing) => {
          return drawing.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
      default:
        return drawings;
    }
  };

  const filteredDrawings = filterDrawings();

  return (
    <Theme
      accentColor="iris"
      style={{
        height: "100%",
      }}
    >
      <section className="Popup">
        {currentDrawing && <CurrentDrawing drawing={currentDrawing} />}
        <NavBar
          onCreateNewDrawing={handleCreateNewDrawing}
          SearchComponent={
            <TextField.Root
              style={{
                width: "240px",
                maxWidth: "240px",
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
          CurrentItemButton={
            currentDrawing && (
              <Button color="green" onClick={handleSaveCurrentDrawing}>
                <BookmarkFilledIcon width="16" height="16" /> Save current
              </Button>
            )
          }
        />
        <Flex
          style={{
            height: "calc(100% - 60px)",
            width: "100%",
          }}
        >
          <Sidebar
            selected={sidebarSelected}
            onChangeSelected={(selected) => setSidebarSelected(selected)}
          />
          <div className="Popup__content">
            {sidebarSelected === "Favorites" &&
              (filteredDrawings.length >= 1 ? (
                <>
                  <Grid
                    columns="2"
                    gapX="3"
                    gapY="5"
                    width="auto"
                    pb="8"
                    pt="3"
                  >
                    {filteredDrawings.map((drawing, index) => (
                      <Drawing
                        key={drawing.id}
                        id={drawing.id}
                        index={index}
                        name={drawing.name}
                        onClick={handleLoadItem}
                        favorite={true}
                        isCurrent={currentDrawingId === drawing.id}
                        img={drawing.imageBase64}
                        onRenameDrawing={onRenameDrawing}
                        onAddToFavorites={handleAddToFavorites}
                        onRemoveFromFavorites={handleRemoveFromFavorites}
                        onDeleteDrawing={onDeleteDrawing}
                      />
                    ))}
                  </Grid>
                </>
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
                  <>
                    <Grid
                      columns="2"
                      gapX="3"
                      gapY="5"
                      width="auto"
                      pb="8"
                      pt="3"
                    >
                      {filteredDrawings.map((drawing, index) => (
                        <Drawing
                          key={drawing.id}
                          id={drawing.id}
                          index={index}
                          name={drawing.name}
                          favorite={favorites.includes(drawing.id)}
                          onClick={handleLoadItem}
                          isCurrent={currentDrawingId === drawing.id}
                          img={drawing.imageBase64}
                          onRenameDrawing={onRenameDrawing}
                          onAddToFavorites={handleAddToFavorites}
                          onRemoveFromFavorites={handleRemoveFromFavorites}
                          onDeleteDrawing={onDeleteDrawing}
                        />
                      ))}
                    </Grid>
                  </>
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

            {(sidebarSelected === "All" || sidebarSelected === "") && (
              <>
                <Grid columns="2" gapX="3" gapY="5" width="auto" pb="8" pt="3">
                  {filteredDrawings.map((drawing, index) => (
                    <Drawing
                      key={drawing.id}
                      id={drawing.id}
                      index={index}
                      onClick={handleLoadItem}
                      isCurrent={currentDrawingId === drawing.id}
                      name={drawing.name}
                      favorite={favorites.includes(drawing.id)}
                      img={drawing.imageBase64}
                      onRenameDrawing={onRenameDrawing}
                      onAddToFavorites={handleAddToFavorites}
                      onRemoveFromFavorites={handleRemoveFromFavorites}
                      onDeleteDrawing={onDeleteDrawing}
                    />
                  ))}
                </Grid>
              </>
            )}
          </div>
        </Flex>
      </section>
    </Theme>
  );
};

export default Popup;

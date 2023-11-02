import {
  BookmarkFilledIcon,
  CrossCircledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
  Button,
  Grid,
  IconButton,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import React, { useEffect } from "react";
import { browser } from "webextension-polyfill-ts";
import { CurrentDrawing } from "../components/CurrentDrawing/CurrentDrawing.component";
import { Drawing } from "../components/Drawing/Drawing.component";
import { NavBar } from "../components/NavBar/Navbar.component";
import { IDrawing } from "../interfaces/drawing.interface";
import { DrawingStore } from "../lib/drawing-store";
import { TabUtils } from "../lib/utils/tab.utils";
import { useCurrentDrawingId } from "./hooks/useCurrentDrawing.hook";
import "./Popup.styles.scss";

const Popup: React.FC = () => {
  const [drawings, setDrawings] = React.useState<IDrawing[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { currentDrawingId, setCurrentDrawingId } = useCurrentDrawingId();

  useEffect(() => {
    const loadDrawings = async () => {
      const result: Record<string, IDrawing> =
        await browser.storage.local.get();

      const newDrawings = Object.values(result);

      setDrawings(newDrawings);
    };

    loadDrawings();
  }, []);

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

  const currentDrawing = drawings.find(
    (drawing) => drawing.id === currentDrawingId
  );

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
            currentDrawingId && (
              <Button color="green" onClick={handleSaveCurrentDrawing}>
                <BookmarkFilledIcon width="16" height="16" /> Save current
              </Button>
            )
          }
        />

        <div className="Popup__content">
          {searchTerm !== "" ? (
            <>
              <Text
                weight="bold"
                size="3"
                color="iris"
                style={{
                  padding: "12px 28px 13px",
                  display: "block",
                }}
              >
                Search Results:
              </Text>
              <Grid columns="2" gapX="3" gapY="5" width="auto" pb="8">
                {drawings
                  .filter((drawing) => {
                    return drawing.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                  })
                  .map((drawing, index) => (
                    <Drawing
                      key={drawing.id}
                      id={drawing.id}
                      index={index}
                      name={drawing.name}
                      onClick={handleLoadItem}
                      isCurrent={currentDrawingId === drawing.id}
                      img={drawing.imageBase64}
                      onRenameDrawing={onRenameDrawing}
                      onDeleteDrawing={onDeleteDrawing}
                    />
                  ))}
              </Grid>
            </>
          ) : (
            <>
              <Text
                weight="bold"
                size="3"
                color="iris"
                style={{
                  padding: "12px 28px 13px",
                  display: "block",
                }}
              >
                Saved:
              </Text>
              <Grid columns="2" gapX="3" gapY="5" width="auto" pb="8">
                {drawings.map((drawing, index) => (
                  <Drawing
                    key={drawing.id}
                    id={drawing.id}
                    index={index}
                    onClick={handleLoadItem}
                    isCurrent={currentDrawingId === drawing.id}
                    name={drawing.name}
                    img={drawing.imageBase64}
                    onRenameDrawing={onRenameDrawing}
                    onDeleteDrawing={onDeleteDrawing}
                  />
                ))}
              </Grid>
            </>
          )}
        </div>
      </section>
    </Theme>
  );
};

export default Popup;

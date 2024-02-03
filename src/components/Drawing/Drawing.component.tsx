import { DotsHorizontalIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Dialog,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { useState } from "react";
import { IDrawing } from "../../interfaces/drawing.interface";
import "./Drawing.styles.scss";
import { AddToFolderModal } from "../AddToFolder/AddToFolder.component";
import { Folder } from "../../interfaces/folder.interface";

const DialogDescription = Dialog.Description as any;

type DrawingProps = {
  favorite?: boolean;
  index: number;
  isCurrent: boolean;
  inExcalidrawPage: boolean;
  drawing: IDrawing;
  folders: Folder[];
  onClick: (id: string) => void;
  onRenameDrawing?: (id: string, newName: string) => void;
  onDeleteDrawing?: (id: string) => void;

  onAddToFavorites?: (id: string) => void;
  onRemoveFromFavorites?: (id: string) => void;

  onAddToFolder: (drawingId: string, folderId: string) => void;
};

export function Drawing(props: DrawingProps) {
  const [newName, setNewName] = useState(props.drawing.name);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addToFolderModalOpen, setAddToFolderModalOpen] = useState(false);

  const handleRenameDrawing = () => {
    setEditModalOpen(false);
    props.onRenameDrawing?.(props.drawing.id, newName);
  };

  const handleDeleteDrawing = () => {
    setDeleteModalOpen(false);
    props.onDeleteDrawing?.(props.drawing.id);
  };

  return (
    <Box className="Drawing">
      <Flex direction="column" gap="2" position={"relative"}>
        <img
          className="Drawing__image"
          onClick={() => props.onClick(props.drawing.id)}
          loading={props.index < 4 ? "eager" : "lazy"}
          style={{
            boxShadow: props.isCurrent ? "0px 0px 0px 2px #30a46c" : undefined,
            position: "relative",
            backgroundColor: props.drawing.viewBackgroundColor || "#fff",
          }}
          src={
            props.drawing.imageBase64
              ? props.drawing.imageBase64
              : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
          }
        />

        <Flex justify="between" align="center" pr="1" pl="1">
          <Text
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "140px",
            }}
            title={props.drawing.name}
            color="gray"
            as="p"
            size="1"
            weight="medium"
          >
            {props.drawing.name}
          </Text>
          {props.favorite === true && (
            <HeartFilledIcon
              className="Drawing__favorite"
              width={"16"}
              height={"16"}
            />
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton size="1" variant="ghost">
                <DotsHorizontalIcon width="18" height="18" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="1">
              <DropdownMenu.Item onClick={() => setEditModalOpen(true)}>
                Rename
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  if (!props.favorite) {
                    props.onAddToFavorites?.(props.drawing.id);
                  } else {
                    props.onRemoveFromFavorites?.(props.drawing.id);
                  }
                }}
              >
                {props.favorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => setAddToFolderModalOpen(true)}>
                Add to folder
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                disabled={!props.inExcalidrawPage}
                color="red"
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          {/* -------- DELETE DIALOG ---------  */}
          <Dialog.Root
            open={deleteModalOpen}
            onOpenChange={(e) => setDeleteModalOpen(e)}
          >
            <Dialog.Content
              style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
              size="1"
            >
              <Dialog.Title size={"4"}>Delete Drawing</Dialog.Title>

              <DialogDescription size="2">
                Are you sure you want to delete <b>{props.drawing.name}</b>{" "}
                drawing?
              </DialogDescription>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button onClick={handleDeleteDrawing} color="red">
                    Yes, Delete
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>

          <AddToFolderModal
            modalOpen={addToFolderModalOpen}
            folders={props.folders}
            drawing={props.drawing}
            setModalOpen={setAddToFolderModalOpen}
            onChooseFolder={async (folder) => {
              await props.onAddToFolder?.(props.drawing.id, folder.id);
            }}
          />

          {/* -------- EDIT DIALOG ---------  */}
          <Dialog.Root
            open={editModalOpen}
            onOpenChange={(isOpen) => setEditModalOpen(isOpen)}
          >
            <Dialog.Content
              style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
              size="1"
            >
              <Dialog.Title size={"4"}>Rename Drawing</Dialog.Title>

              <DialogDescription size="2">
                Edit <b>{props.drawing.name}</b> drawing:
              </DialogDescription>

              <Flex direction="column" mt="3">
                <TextField.Input
                  onChange={(event) => {
                    setNewName(event.target.value);
                  }}
                  onKeyUp={(event) => {
                    if (event.key === "Enter") {
                      handleRenameDrawing();
                    }
                  }}
                  value={newName}
                  placeholder="Rename drawing"
                />
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button
                    disabled={newName === ""}
                    onClick={handleRenameDrawing}
                  >
                    Rename
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </Flex>
    </Box>
  );
}

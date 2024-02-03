import { DotsVerticalIcon } from "@radix-ui/react-icons";
import {
  Button,
  Dialog,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { clsx } from "clsx";
import React, { useState } from "react";
import { HiOutlineFolder } from "react-icons/hi2";
import { Folder } from "../../../interfaces/folder.interface";

const DialogDescription = Dialog.Description as any;

type SidebarProps = {
  folder: Folder;
  isSelected: boolean;
  onClick?: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onRemoveFolder: (folderId: string) => void;
};

export function FolderItem({
  folder,
  onRenameFolder,
  isSelected,
  ...props
}: SidebarProps) {
  const [newName, setNewName] = useState(folder.name);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleRenameFolder = () => {
    setEditModalOpen(false);
    onRenameFolder?.(folder.id, newName);
  };

  const handleDeleteFolder = () => {
    setDeleteModalOpen(false);
    props.onRemoveFolder?.(folder.id);
  };

  return (
    <Text
      as="div"
      key={folder.id}
      weight={"medium"}
      size={"1"}
      onClick={() => props.onClick?.(folder.id)}
      className={clsx(
        "Sidebar__item",
        isSelected && "Sidebar__item--selected",
        openDropdownId === folder.id && "Sidebar__item--optionsOpened"
      )}
    >
      <HiOutlineFolder width={14} height={14} />
      {folder.name}{" "}
      <span className="Sidebar__item__count">{folder.drawingIds.length}</span>
      <DropdownMenu.Root
        onOpenChange={(open) => {
          if (open) {
            setOpenDropdownId(folder.id);
          } else {
            setOpenDropdownId(null);
          }
        }}
      >
        <DropdownMenu.Trigger>
          <IconButton
            style={{ marginLeft: "auto" }}
            size="1"
            className={"Sidebar__item__optionsBtn"}
            variant="ghost"
          >
            <DotsVerticalIcon
              width="14"
              height="14"
              color={isSelected ? "white" : undefined}
            />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content size="1">
          <DropdownMenu.Item onClick={() => setEditModalOpen(true)}>
            Rename
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            color="red"
            onClick={() => setDeleteModalOpen(true)}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      {/* -------- EDIT DIALOG ---------  */}
      <Dialog.Root
        open={editModalOpen}
        onOpenChange={(isOpen) => setEditModalOpen(isOpen)}
      >
        <Dialog.Content
          style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
          size="1"
        >
          <Dialog.Title size={"4"}>Rename Folder</Dialog.Title>

          <DialogDescription size="2">
            Edit <b>{folder.name}</b> folder:
          </DialogDescription>

          <Flex direction="column" mt="3">
            <TextField.Input
              onChange={(event) => {
                setNewName(event.target.value);
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter") {
                  handleRenameFolder();
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
              <Button disabled={newName === ""} onClick={handleRenameFolder}>
                Rename
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
      {/* -------- DELETE DIALOG ---------  */}
      <Dialog.Root
        open={deleteModalOpen}
        onOpenChange={(e) => setDeleteModalOpen(e)}
      >
        <Dialog.Content
          style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
          size="1"
        >
          <Dialog.Title size={"4"}>Delete Folder</Dialog.Title>

          <DialogDescription size="2">
            Are you sure you want to delete <b>{folder.name}</b> folder?
          </DialogDescription>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button onClick={handleDeleteFolder} color="red">
                Yes, Delete
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Text>
  );
}

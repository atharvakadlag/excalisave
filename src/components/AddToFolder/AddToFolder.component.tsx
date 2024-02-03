import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import React from "react";
import { HiOutlineFolder } from "react-icons/hi2";
import { Folder } from "../../interfaces/folder.interface";
import { IDrawing } from "../../interfaces/drawing.interface";

const DialogDescription = Dialog.Description as any;

type CreateFolderProps = {
  drawing: IDrawing;
  folders: Folder[];
  onChooseFolder: (folder: Folder) => void;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
};

export function AddToFolderModal(props: CreateFolderProps) {
  const handleAddToFolder = async (folder: Folder) => {
    await props.onChooseFolder(folder);
    props.setModalOpen(false);
  };

  return (
    <Dialog.Root
      open={props.modalOpen}
      onOpenChange={(isOpen) => props.setModalOpen(isOpen)}
    >
      <Dialog.Content
        style={{ maxWidth: 300, paddingTop: 22, paddingBottom: 20 }}
        size="1"
      >
        <Dialog.Title size={"3"}>Add drawing to folder</Dialog.Title>

        <DialogDescription size="2">
          Add "<b>{props.drawing.name}</b>" to folder:
        </DialogDescription>

        <Flex
          direction={"column"}
          gap="1"
          py="2"
          style={{
            height: "268px",
            overflowY: "scroll",
          }}
        >
          {props.folders.map((folder) => (
            <Text
              as="div"
              key={folder.id}
              weight={"medium"}
              size={"1"}
              onClick={() => handleAddToFolder(folder)}
              className={"Sidebar__item"}
            >
              <HiOutlineFolder width={14} height={14} />
              {folder.name}
            </Text>
          ))}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

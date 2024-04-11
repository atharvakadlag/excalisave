import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import React from "react";
import { LuFolder } from "react-icons/lu";
import { IDrawing } from "../../interfaces/drawing.interface";
import { Folder } from "../../interfaces/folder.interface";
import { Placeholder } from "../Placeholder/Placeholder.component";

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
        <Dialog.Title size={"3"}>Add drawing to collection</Dialog.Title>

        <DialogDescription size="2">
          Add "<b>{props.drawing.name}</b>" to collection:
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
              <LuFolder size={13} />
              {folder.name}
              <span className="Sidebar__item__count">
                {folder.drawingIds.length}
              </span>
            </Text>
          ))}

          {props.folders.length === 0 && (
            <Placeholder
              message={<Text size={"2"}>There are no collections yet</Text>}
            />
          )}
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

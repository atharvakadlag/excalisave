import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Box, Button, Dialog, Flex, TextField } from "@radix-ui/themes";
import React, { useState } from "react";

const DialogDescription = Dialog.Description as any;

type CreateFolderProps = {
  onCreateFolder: (name: string) => void;
};

export function CreateFolder(props: CreateFolderProps) {
  const [name, setName] = useState("");
  const [editModalOpen, setCreateModalOpen] = useState(false);

  const handleCreateFolder = async () => {
    await props.onCreateFolder(name);
    setName("");
    setCreateModalOpen(false);
  };

  return (
    <>
      <Box
        title="Create new collection"
        onClick={() => setCreateModalOpen(true)}
      >
        <PlusCircledIcon
          className="Sidebar__newFolderBtn"
          width="14"
          height="14"
        />
      </Box>
      <Dialog.Root
        open={editModalOpen}
        onOpenChange={(isOpen) => setCreateModalOpen(isOpen)}
      >
        <Dialog.Content
          style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
          size="1"
        >
          <Dialog.Title size={"3"}>Create Collection</Dialog.Title>

          <DialogDescription size="2">
            Give your collection a name
          </DialogDescription>

          <Flex direction="column" mt="3">
            <TextField.Input
              onChange={(event) => {
                setName(event.target.value);
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter") {
                  handleCreateFolder();
                }
              }}
              value={name}
            />
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button disabled={name === ""} onClick={handleCreateFolder}>
                Create
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

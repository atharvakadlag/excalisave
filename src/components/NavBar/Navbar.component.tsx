import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex, IconButton, TextField } from "@radix-ui/themes";
import React, { ReactElement, useState } from "react";

type NavBarProps = {
  SearchComponent: ReactElement;
  CurrentItemButton?: ReactElement;
  onCreateNewDrawing: (name: string) => void;
};

export function NavBar({
  SearchComponent,
  CurrentItemButton,
  ...props
}: NavBarProps) {
  const [name, setName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleRenameDrawing = () => {
    setIsCreateDialogOpen(false);
    props?.onCreateNewDrawing(name);
  };

  return (
    <Flex
      width="100%"
      top="0"
      p="3"
      justify="between"
      align="center"
      style={{
        height: "60px",
        borderBottom: "1px solid #e1e1e1",
        background: "#6965db12",
      }}
    >
      {SearchComponent}
      {CurrentItemButton}
      <IconButton
        size="2"
        onClick={() => {
          setIsCreateDialogOpen(true);
        }}
      >
        <PlusIcon width="20" height="20" />
      </IconButton>

      {/* -------- EDIT DIALOG ---------  */}
      <Dialog.Root
        open={isCreateDialogOpen}
        onOpenChange={(isOpen) => setIsCreateDialogOpen(isOpen)}
      >
        <Dialog.Content
          style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
          size="1"
        >
          <Dialog.Title size={"4"}>Save new Drawing</Dialog.Title>

          <Flex direction="column" mt="3">
            <TextField.Input
              onChange={(event) => {
                setName(event.target.value);
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter") {
                  handleRenameDrawing();
                }
              }}
              value={name}
              placeholder="Name for the drawing"
            />
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button onClick={handleRenameDrawing}>Save</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

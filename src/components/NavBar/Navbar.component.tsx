import { CaretDownIcon } from "@radix-ui/react-icons";
import {
  Button,
  Dialog,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { ReactElement, useEffect, useState } from "react";
import { IDrawing } from "../../interfaces/drawing.interface";
import "./Navbar.styles.scss";

type NavBarProps = {
  SearchComponent: ReactElement;
  CurrentItemButton?: ReactElement;
  onCreateNewDrawing: (name: string) => void;
  onNewDrawing: () => void;
  onSaveDrawing: () => void;
  currentDrawing?: IDrawing;
};

export function NavBar({
  SearchComponent,
  CurrentItemButton,
  ...props
}: NavBarProps) {
  const [name, setName] = useState("");
  const [duplicateName, setDuplicateName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  useEffect(() => {
    if (props.currentDrawing) {
      setDuplicateName(props.currentDrawing.name + " 2");
    }
  }, [props.currentDrawing]);

  const handleRenameDrawing = () => {
    setIsCreateDialogOpen(false);
    props?.onCreateNewDrawing(name);
  };

  const handleDuplicateDrawing = () => {
    setIsDuplicateDialogOpen(false);
    props?.onCreateNewDrawing(duplicateName);
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

      {props.currentDrawing && (
        <Flex
          style={{
            padding: "2px 10px",
            background: "rgb(48 164 108)",
            color: "white",
            border: "1px solid #2b9160",
            width: "250px",
            borderRadius: "5px",
          }}
          align={"center"}
          justify={"center"}
          direction={"column"}
        >
          <Text size={"1"} style={{ fontSize: "10px", lineHeight: 1 }}>
            Working on:
          </Text>
          <Text
            weight={"bold"}
            title={props.currentDrawing?.name}
            style={{
              width: "100%",
              lineHeight: "1.4",
              textOverflow: "ellipsis",
              overflow: "hidden",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
            key={"1"}
            size={"1"}
          >
            {props.currentDrawing?.name}
          </Text>
        </Flex>
      )}

      {/* -------- OPTIONS MENU ---------  */}
      <DropdownMenu.Root>
        <Flex className="Navbar__ActionButton">
          <Button
            onClick={() => {
              if (props.currentDrawing) {
                props.onSaveDrawing();
              } else {
                setIsCreateDialogOpen(true);
              }
            }}
            value={"soft"}
          >
            Save
          </Button>
          <DropdownMenu.Trigger>
            <IconButton size="2">
              <CaretDownIcon width="20" height="20" />
            </IconButton>
          </DropdownMenu.Trigger>
        </Flex>

        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={props.onNewDrawing}>
            New Drawing
          </DropdownMenu.Item>

          {props.currentDrawing && (
            <DropdownMenu.Item onClick={() => setIsDuplicateDialogOpen(true)}>
              Duplicate
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator />
          <DropdownMenu.Item>Add to favorites</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

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
              placeholder="Name for the new drawing"
            />
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button disabled={name === ""} onClick={handleRenameDrawing}>
                Save
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* -------- DUPLICATE DIALOG ---------  */}
      <Dialog.Root
        open={isDuplicateDialogOpen}
        onOpenChange={(isOpen) => setIsDuplicateDialogOpen(isOpen)}
      >
        <Dialog.Content
          style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
          size="1"
        >
          <Dialog.Title size={"4"}>Duplicate Drawing</Dialog.Title>

          <Flex direction="column" mt="3">
            <TextField.Input
              onChange={(event) => {
                setDuplicateName(event.target.value);
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter") {
                  handleDuplicateDrawing();
                }
              }}
              defaultValue={name + " 2"}
              value={duplicateName}
              placeholder="Name for the new drawing"
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
                disabled={duplicateName === ""}
                onClick={handleDuplicateDrawing}
              >
                Save
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

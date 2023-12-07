import {
  CaretDownIcon,
  ClipboardIcon,
  ExclamationTriangleIcon,
  FilePlusIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import {
  Button,
  Callout,
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
import { DrawingStore } from "../../lib/drawing-store";

const DialogDescription = Dialog.Description as any;
const CalloutText = Callout.Text as any;

type NavBarProps = {
  SearchComponent: ReactElement;
  CurrentItemButton?: ReactElement;
  onCreateNewDrawing: (name: string) => void;
  onNewDrawing: () => void;
  onSaveDrawing: () => void;
  currentDrawing?: IDrawing;
  isLoading: boolean;
  inExcalidrawPage: boolean;
  isLiveCollaboration: boolean;
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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

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
            {props.isLoading ? "Loading... " : "Working on:"}
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
            disabled={
              !props.inExcalidrawPage ||
              props.isLoading ||
              props.isLiveCollaboration
            }
            onClick={() => {
              if (props.currentDrawing) {
                props.onSaveDrawing();
              } else {
                setIsCreateDialogOpen(true);
              }
            }}
            value={"soft"}
          >
            {props.currentDrawing ? "Save" : "Save As..."}
          </Button>
          <DropdownMenu.Trigger
            disabled={
              !props.inExcalidrawPage ||
              props.isLoading ||
              props.isLiveCollaboration
            }
          >
            <IconButton>
              <CaretDownIcon width="18" height="18" />
            </IconButton>
          </DropdownMenu.Trigger>
        </Flex>

        <DropdownMenu.Content size="2">
          <DropdownMenu.Item
            style={{
              alignItems: "center",
              justifyContent: "flex-start",
            }}
            onClick={async () => {
              if (
                !props.currentDrawing &&
                (await DrawingStore.hasUnsavedChanges())
              ) {
                setIsConfirmDialogOpen(true);
              } else {
                props.onNewDrawing();
              }
            }}
          >
            <FilePlusIcon
              width="16"
              height="16"
              style={{ paddingRight: "5px" }}
            />
            New Drawing
          </DropdownMenu.Item>

          {props.currentDrawing && (
            <DropdownMenu.Item
              style={{
                alignItems: "center",
                justifyContent: "flex-start",
              }}
              onClick={() => setIsDuplicateDialogOpen(true)}
            >
              <ClipboardIcon
                width="16"
                height="16"
                style={{ paddingRight: "5px" }}
              />
              Duplicate
            </DropdownMenu.Item>
          )}
          {/* <DropdownMenu.Separator /> */}
          {/* <DropdownMenu.Item>Add to favorites</DropdownMenu.Item> */}
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

      {/* -------- CONFIRM DIALOG ---------  */}
      <Dialog.Root
        open={isConfirmDialogOpen}
        onOpenChange={(isOpen) => setIsConfirmDialogOpen(isOpen)}
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
                  setIsConfirmDialogOpen(false);
                  props.onNewDrawing();
                }}
              >
                Yes, continue
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

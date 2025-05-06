import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Callout, Dialog, Flex, Grid, Text } from "@radix-ui/themes";
import React from "react";
import { IDrawing } from "../../interfaces/drawing.interface";
import "./MergeConflict.styles.scss";

const DialogDescription = Dialog.Description as any;
const CalloutText = Callout.Text as any;

type MergeConflictProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  localDrawing: IDrawing;
  remoteDrawing: IDrawing;
  onResolve: (useLocal: boolean) => void;
};

export function MergeConflictDialog(props: MergeConflictProps) {
  return (
    <Dialog.Root
      open={props.isOpen}
      onOpenChange={(isOpen) => props.onOpenChange(isOpen)}
    >
      <Dialog.Content
        style={{ maxWidth: 600, paddingTop: 22, paddingBottom: 20 }}
        size="1"
      >
        <Dialog.Title size={"4"}>Merge Conflict Detected</Dialog.Title>

        <DialogDescription>
          <Callout.Root color="red">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <CalloutText>
              There is a conflict between your local version and the remote
              version of this drawing.
            </CalloutText>
          </Callout.Root>
          <br />
          <Text size="2">Please choose which version you want to keep:</Text>
        </DialogDescription>

        <Grid columns="2" gap="4" mt="4">
          <div className="MergeConflict__option">
            <Text weight="bold" size="2">
              Local Version
            </Text>
            <Text size="1" color="gray">
              Last modified:{" "}
              {new Date(props.localDrawing.createdAt).toLocaleString()}
            </Text>
            <div className="MergeConflict__preview">
              <img
                src={
                  props.localDrawing.imageBase64 ||
                  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
                }
                alt="Local version preview"
                style={{
                  backgroundColor:
                    props.localDrawing.viewBackgroundColor || "#fff",
                }}
              />
            </div>
            <Button
              onClick={() => props.onResolve(true)}
              variant="solid"
              color="blue"
              mt="2"
            >
              Use Local Version
            </Button>
          </div>

          <div className="MergeConflict__option">
            <Text weight="bold" size="2">
              Remote Version
            </Text>
            <Text size="1" color="gray">
              Last modified:{" "}
              {new Date(props.remoteDrawing.createdAt).toLocaleString()}
            </Text>
            <div className="MergeConflict__preview">
              <img
                src={
                  props.remoteDrawing.imageBase64 ||
                  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
                }
                alt="Remote version preview"
                style={{
                  backgroundColor:
                    props.remoteDrawing.viewBackgroundColor || "#fff",
                }}
              />
            </div>
            <Button
              onClick={() => props.onResolve(false)}
              variant="solid"
              color="green"
              mt="2"
            >
              Use Remote Version
            </Button>
          </div>
        </Grid>

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

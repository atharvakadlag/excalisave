import React from "react";
import { Flex, Text } from "@radix-ui/themes";
import { IDrawing } from "../../interfaces/drawing.interface";

type CurrentDrawingProps = {
  drawing: IDrawing;
};

export function CurrentDrawing({ drawing }: CurrentDrawingProps) {
  return (
    <Flex
      width="100%"
      bottom="0"
      p="3"
      position={"fixed"}
      justify="center"
      align="center"
      style={{
        height: "34px",
        color: "white",
        borderBottom: "1px solid #e1e1e1",
        background: "#30a46c",
        borderRadius: "5px 5px 0 0",
      }}
    >
      <Text size="2">
        Working on: "<b>{drawing.name}"</b>
      </Text>
    </Flex>
  );
}

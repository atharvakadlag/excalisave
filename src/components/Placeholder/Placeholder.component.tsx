import { Flex } from "@radix-ui/themes";
import React, { ReactElement } from "react";

type PlaceholderProps = {
  icon?: ReactElement;
  message: ReactElement;
};

export function Placeholder(props: PlaceholderProps) {
  return (
    <Flex
      align={"center"}
      justify={"center"}
      direction={"column"}
      gap={"4"}
      height={"100%"}
      style={{
        borderRadius: "6px",
        color: "var(--gray-a10)",
        textAlign: "center",
      }}
    >
      {props.icon}
      {props.message}
    </Flex>
  );
}

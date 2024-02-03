import {
  HeartIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Box, Flex, Separator, Text } from "@radix-ui/themes";
import { clsx } from "clsx";
import React, { useEffect } from "react";
import { HiOutlineFolder } from "react-icons/hi2";
import { useFolders } from "../../Popup/hooks/useFolders.hook";
import { CreateFolder } from "../CreateFolder/CreateFolder.component";
import "./Sidebar.styles.scss";
import { Folder } from "../../interfaces/folder.interface";

type SidebarProps = {
  onChangeSelected?: (selected: string) => void;
  folders: Folder[];
  onCreateFolder: (name: string) => void;
  onRemoveFolder: (id: string) => void;
  selected: string;
};

export function Sidebar({ folders, onCreateFolder, ...props }: SidebarProps) {
  return (
    <Box
      style={{
        width: "200px",
        borderRight: "1px solid #e1e1e1",
      }}
      p="3"
    >
      <Flex direction="column" gap="1">
        <Text
          as="div"
          weight={"medium"}
          size={"1"}
          onClick={() => props.onChangeSelected?.("All")}
          className={clsx(
            "Sidebar__item",
            props.selected === "All" && "Sidebar__item--selected"
          )}
        >
          <ListBulletIcon width="18" height="18" />
          All
        </Text>
        <Text
          onClick={() => props.onChangeSelected?.("Favorites")}
          as="div"
          weight={"medium"}
          size={"1"}
          className={clsx(
            "Sidebar__item",
            props.selected === "Favorites" && "Sidebar__item--selected"
          )}
        >
          <HeartIcon width="18" height="18" />
          Favorites
        </Text>
        <Text
          as="div"
          weight={"medium"}
          size={"1"}
          onClick={() => props.onChangeSelected?.("Results")}
          className={clsx(
            "Sidebar__item",
            props.selected === "Results" && "Sidebar__item--selected"
          )}
        >
          <MagnifyingGlassIcon width="18" height="18" />
          Search results
        </Text>
      </Flex>

      <Separator my="2" size={"4"} />

      <Flex justify="between" width="100%" mt="1" px="1">
        <Text
          as="div"
          weight={"bold"}
          size={"1"}
          style={{
            flex: 1,
            color: "var(--gray-10)",
            paddingBottom: "8px",
          }}
        >
          Folders
        </Text>
        <CreateFolder onCreateFolder={onCreateFolder} />
      </Flex>
      <Flex
        direction={"column"}
        gap="1"
        style={{
          height: "268px",
          overflowY: "scroll",
        }}
      >
        {folders.map((folder) => (
          <Text
            as="div"
            key={folder.id}
            weight={"medium"}
            size={"1"}
            onClick={() => props.onChangeSelected?.(folder.id)}
            className={clsx(
              "Sidebar__item",
              props.selected === folder.id && "Sidebar__item--selected"
            )}
          >
            <HiOutlineFolder width={14} height={14} />
            {folder.name}
          </Text>
        ))}
      </Flex>
    </Box>
  );
}

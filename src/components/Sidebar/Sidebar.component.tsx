import {
  ExternalLinkIcon,
  GearIcon,
  HeartIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Box, Flex, Text } from "@radix-ui/themes";
import { clsx } from "clsx";
import React from "react";
import "./Sidebar.styles.scss";
import { browser } from "webextension-polyfill-ts";
import { TabUtils } from "../../lib/utils/tab.utils";

type SidebarProps = {
  onChangeSelected?: (selected: string) => void;
  selected: string;
};

export function Sidebar(props: SidebarProps) {
  // const [folders] = useState([
  //   {
  //     id: "1",
  //     name: "Personal",
  //   },
  //   {
  //     id: "2",
  //     name: "Health",
  //   },
  //   {
  //     id: "3",
  //     name: "Travel",
  //   },
  //   {
  //     id: "4",
  //     name: "Entertainment",
  //   },
  //   {
  //     id: "5",
  //     name: "Education",
  //   },
  //   {
  //     id: "6",
  //     name: "Finance",
  //   },
  //   {
  //     id: "7",
  //     name: "Food",
  //   },
  //   {
  //     id: "8",
  //     name: "Sports",
  //   },
  //   {
  //     id: "9",
  //     name: "Technology",
  //   },
  //   {
  //     id: "10",
  //     name: "Music",
  //   },
  // ]);

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

        <Text
          as="div"
          weight={"medium"}
          size={"1"}
          onClick={async () => {
            const activeTab = await TabUtils.getActiveTab();
            const runtimeUrl = browser.runtime.getURL("options.html");
            browser.tabs.create({
              url: runtimeUrl,
              openerTabId: activeTab?.id,
              index: activeTab ? activeTab.index + 1 : undefined,
            });
          }}
          className={clsx(
            "Sidebar__item",
            props.selected === "Settings" && "Sidebar__item--selected"
          )}
        >
          <GearIcon width="18" height="18" />
          Settings
          <ExternalLinkIcon
            style={{ marginLeft: "4px" }}
            width="14"
            height="14"
          />
        </Text>
      </Flex>

      {/* <Separator my="2" size={"4"} /> */}

      {/* <Text
        as="div"
        weight={"bold"}
        size={"1"}
        style={{
          paddingLeft: "10px",
          color: "var(--gray-10)",
          paddingBottom: "8px",
        }}
      >
        Folders
      </Text>

      <Flex
        direction={"column"}
        gap="1"
        style={{
          height: "300px",
          overflowY: "scroll",
        }}
      >
        {folders.map((folder) => (
          <Text
            as="div"
            weight={"medium"}
            size={"1"}
            className={clsx(
              "Sidebar__item",
              props.selected === "Results" && "Sidebar__item--selected"
            )}
          >
            {folder.name}
          </Text>
        ))}
      </Flex> */}
    </Box>
  );
}

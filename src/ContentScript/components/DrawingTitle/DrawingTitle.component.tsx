import React from "react";
import "./DrawingTitle.styles.scss";
import { useLocalStorageString } from "../../hooks/useLocalStorageString.hook";
import { DRAWING_TITLE_KEY_LS } from "../../../lib/constants";
import { browser } from "webextension-polyfill-ts";
import { MessageType } from "../../../constants/message.types";

export function DrawingTitle() {
  const title = useLocalStorageString(DRAWING_TITLE_KEY_LS, "");

  return (
    <>
      <h1
        style={{
          margin: "0",
          fontSize: "1.15rem",
          userSelect: "text",
        }}
      >
        {title}
      </h1>
      <button
        className="excalidraw-button collab-button excalisave-button"
        style={{
          width: "auto",
          marginLeft: "8px",
        }}
        title="Open Excalisave"
        onClick={() => {
          browser.runtime.sendMessage({ type: MessageType.OPEN_POPUP });
        }}
      >
        Excalisave
      </button>
    </>
  );
}

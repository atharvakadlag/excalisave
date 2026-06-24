import React from "react";
import { DrawingTitle } from "./components/DrawingTitle/DrawingTitle.component";
import { mountReactComponent } from "./utils/mount-react-component";

export function initExcalidrawClientUI() {
  const appMenuTopLeft = document.getElementsByClassName(
    "excalidraw-container"
  );

  if (!appMenuTopLeft.length) return;

  mountReactComponent(<DrawingTitle />, appMenuTopLeft[0] as HTMLElement, {
    useShadow: false,
    appendChild: true,
    className: "Excalidraw__title-container",
  });
}

import React from "react";
import { DrawingTitle } from "./components/DrawingTitle/DrawingTitle.component";
import { mountReactComponent } from "./utils/mount-react-component";

// The original working placement (pre a21217b and the commit that introduced the big
// positioned host) mounted into ".excalidraw-container" and used absolute positioning
// via CSS to sit next to the diagram title. We prefer that target for maximum
// compatibility. We also support mounting inside the newer menu bar if present.
function findMountTarget(): HTMLElement | null {
  // Preferred for compatibility with the absolute positioning that has always worked:
  const containers = document.getElementsByClassName("excalidraw-container");
  if (containers.length) return containers[0] as HTMLElement;

  // Newer Excalidraw toolbar area (flows as a sibling in the menu).
  const menu =
    document.querySelector<HTMLElement>(".App-menu_top__left") ||
    document.querySelector<HTMLElement>(".App-menu_top");
  if (menu) return menu;

  return null;
}

function isMenuTarget(el: HTMLElement): boolean {
  return (
    el.classList.contains("App-menu_top__left") ||
    el.classList.contains("App-menu_top")
  );
}

export function initExcalidrawClientUI() {
  // Avoid double mount
  if (document.querySelector(".Excalidraw__title-container")) return;

  const doMount = (target: HTMLElement) => {
    if (document.querySelector(".Excalidraw__title-container")) return;
    const inMenu = isMenuTarget(target);
    try {
      mountReactComponent(<DrawingTitle />, target, {
        useShadow: false,
        appendChild: true,
        className: inMenu
          ? "Excalidraw__title-container excalisave-in-menu"
          : "Excalidraw__title-container",
      });
    } catch (e) {
      // Surface in console so users reloading can see if React mount blew up.
      // (libs order, multiple React, etc.)
      // eslint-disable-next-line no-console
      console.error("[excalisave] failed to mount Excalisave button", e);
    }
  };

  const target = findMountTarget();
  if (target) {
    doMount(target);
    return;
  }

  // Excalidraw renders its UI after the initial HTML. Wait for the target using
  // MutationObserver + a bounded poll so we reliably get a chance to mount.
  const observer = new MutationObserver(() => {
    const t = findMountTarget();
    if (t) {
      observer.disconnect();
      doMount(t);
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });

  // Bounded fallback poll (in case observer is blocked or slow).
  let attempts = 0;
  const maxAttempts = 60; // ~12s
  const poll = window.setInterval(() => {
    const t = findMountTarget();
    if (t || ++attempts > maxAttempts) {
      window.clearInterval(poll);
      observer.disconnect();
      if (t) doMount(t);
    }
  }, 200);
}

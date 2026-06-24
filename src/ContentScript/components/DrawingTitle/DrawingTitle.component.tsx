import React from "react";
import ReactDOM from "react-dom";
import "./DrawingTitle.styles.scss";
import { useLocalStorageString } from "../../hooks/useLocalStorageString.hook";
import { DRAWING_TITLE_KEY_LS } from "../../../lib/constants";
import { browser } from "webextension-polyfill-ts";
import Popup from "../../../Popup/Popup.component";

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
        onClick={async (e) => {
          // Toggle: if our visible host or backdrop exists, treat as close.
          const existingHost = document.querySelector(
            ".excalisave-popup-host"
          ) as HTMLElement | null;
          const existingBackdrop = document.querySelector(
            ".excalisave-popup-overlay"
          ) as HTMLElement | null;
          if (existingHost || existingBackdrop) {
            if (existingHost && existingHost.parentNode)
              existingHost.parentNode.removeChild(existingHost);
            if (existingBackdrop && existingBackdrop.parentNode)
              existingBackdrop.parentNode.removeChild(existingBackdrop);
            document
              .querySelectorAll<HTMLIFrameElement>(
                'iframe[data-excalisave-popup="1"]'
              )
              .forEach((f) => f.parentNode && f.parentNode.removeChild(f));
            return;
          }

          const btn = e.currentTarget as HTMLElement;
          const r = btn.getBoundingClientRect();

          // Minimum width that guarantees the full top navbar row inside the popup
          // (Search + "Working on" pill + primary "Save" button + caret) is visible
          // without the popup needing horizontal scroll. This is the key floor so that
          // by default the primary action ("Save") is immediately reachable.
          // 1400px is a comfortable default for this UI on typical screens.
          const minPrimaryVisible = 1400;

          // Better default width estimate + user-resizable:
          // Goal: on first open (and after restoring a previous user-resized size), the entire
          // top navbar row inside the popup is fully visible WITHOUT the popup container requiring
          // horizontal scroll. The row is:
          //   - Search input (styled 183px in Popup + slots/gaps → ~200-220px)
          //   - "Working on: <diagram name>" pill (~250-280px)
          //   - Primary action group: "Save" / "Save As..." Button + caret IconButton (~160-190px)
          // We also want the left sidebar (~200px) + a couple of drawing cards visible by default,
          // so the primary "Save" button is immediately usable without scrolling or resizing.
          //
          // Strategy:
          // - Compute a generous default (biased high) from explicit measurements.
          // - Immediately check persisted user size (from native resize handle on the host) and prefer it.
          // - Always clamp the chosen width to at least minPrimaryVisible so the primary action is visible
          //   even if an old small size was saved previously.
          // - The host is CSS-resizable (resize: both, bottom-right handle). We persist size to storage
          //   on resize so the user's preference sticks for future opens of this overlay.
          // - Final sizes are clamped to the current viewport.
          const estimatePopupWidth = () => {
            // Measurements from the actual rendered components + host chrome.
            const search = 210; // 183 (Popup TextField) + internal slots/padding/gaps
            const pill = 270; // Navbar "Working on" pill (~250) + margins
            const saveGroup = 180; // primary Save/Save As... Button + caret IconButton + flex gaps
            const hostChrome = 48; // host borders + internal padding around the iframe/content

            // Width strictly needed to fit the entire top action bar (Search + pill + Save group)
            // without the popup content needing horizontal scroll.
            const topBarNeeded = search + pill + saveGroup + hostChrome;

            // Desirable width to also show the left sidebar + some cards without feeling cramped.
            const sidebar = 200;
            const cards = 380; // enough grid to see a couple of drawing previews
            const withSidebarAndCards = sidebar + cards + hostChrome;

            // Use the larger requirement, then add breathing room so the primary "Save" button
            // has comfortable margin from the right edge of the popup (not jammed against it).
            let w = Math.max(topBarNeeded, withSidebarAndCards) + 140;

            // High practical default floor so the primary action (Save) and full top bar are
            // visible by default on typical screens without the user having to scroll horizontally
            // or immediately resize. We align this with minPrimaryVisible (1400).
            const floor = minPrimaryVisible;

            const maxForViewport = Math.max(floor, window.innerWidth - 24);
            return Math.min(maxForViewport, Math.max(floor, w));
          };

          // Start with a generous computed default (so on first open / no saved size, Save is visible).
          let popupW = estimatePopupWidth();
          let popupH = Math.min(
            820,
            Math.max(480, window.innerHeight - (r.bottom + 4) - 24)
          );

          // If the user previously resized this overlay, prefer their saved size.
          // We still enforce minPrimaryVisible below so that even previously saved smaller sizes
          // result in the popup opening wide enough by default to show the primary "Save" action
          // and the complete top action bar (Search + pill + Save group) without horizontal scroll.
          try {
            const saved: any = await browser.storage.local.get(
              "excalisave_popup_size"
            );
            const sz = saved && saved.excalisave_popup_size;
            if (sz && typeof sz.w === "number" && typeof sz.h === "number") {
              const minH = 400;
              popupW = Math.max(popupW, Math.min(sz.w, window.innerWidth - 24));
              popupH = Math.max(
                minH,
                Math.min(sz.h, window.innerHeight - (r.bottom + 4) - 16)
              );
            }
          } catch {}

          // Hard guarantee for the initial open: width must be large enough for the primary action (Save)
          // and the complete top action bar (Search + pill + Save group) to be visible without the
          // popup content requiring horizontal scroll.
          popupW = Math.max(minPrimaryVisible, popupW);

          let left = Math.max(8, r.left);
          if (left + popupW > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - popupW - 8);
          }
          const top = r.bottom + 4;
          const maxH = Math.max(
            380,
            Math.min(popupH, window.innerHeight - top - 16)
          );

          // Backdrop captures clicks outside the popup to close it.
          const backdrop = document.createElement("div");
          backdrop.className = "excalisave-popup-overlay";
          backdrop.style.position = "fixed";
          backdrop.style.inset = "0";
          backdrop.style.zIndex = "2147483646";
          backdrop.style.background = "transparent";

          // Visible host shown immediately under the button.
          // It is always a div we control (white background) and only ever
          // contains either a "Loading..." text or our good popup content.
          // We never put a raw extension iframe here until we know it is good.
          const host = document.createElement("div");
          host.className = "excalisave-popup-host";
          host.style.position = "fixed";
          host.style.left = `${left}px`;
          host.style.top = `${top}px`;
          host.style.width = `${popupW}px`;
          host.style.height = `${maxH}px`;
          host.style.zIndex = "2147483647";
          host.style.border = "1px solid #ccc";
          host.style.borderRadius = "6px";
          host.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
          host.style.background = "#fff";
          host.style.overflow = "hidden";
          host.style.boxSizing = "border-box";

          // Allow user to resize the popup (primary request).
          // Native bottom-right handle; iframe fills 100% so content reflows.
          host.style.resize = "both";
          host.style.minWidth = "620px";
          host.style.minHeight = "380px";
          host.style.maxWidth = `${Math.max(200, window.innerWidth - 16)}px`;
          host.style.maxHeight = `${Math.max(200, window.innerHeight - 16)}px`;

          // Restore previous user size if any (async, non-blocking).
          // This makes a wider/taller choice stick across opens of this overlay.
          try {
            browser.storage.local
              .get("excalisave_popup_size")
              .then((res: any) => {
                const sz = res && res.excalisave_popup_size;
                if (
                  sz &&
                  typeof sz.w === "number" &&
                  typeof sz.h === "number"
                ) {
                  const w = Math.max(
                    620,
                    Math.min(sz.w, window.innerWidth - 16)
                  );
                  const h = Math.max(
                    380,
                    Math.min(sz.h, window.innerHeight - 16)
                  );
                  host.style.width = `${w}px`;
                  host.style.height = `${h}px`;
                }
              })
              .catch(() => {});
          } catch {}

          // Persist size when user resizes the host.
          try {
            let saveTimer: number | undefined;
            const ro = new ResizeObserver((entries) => {
              for (const entry of entries) {
                const cr = entry.contentRect;
                if (saveTimer) window.clearTimeout(saveTimer);
                saveTimer = window.setTimeout(() => {
                  try {
                    browser.storage.local.set({
                      excalisave_popup_size: {
                        w: Math.round(cr.width),
                        h: Math.round(cr.height),
                      },
                    });
                  } catch {}
                }, 200);
              }
            });
            ro.observe(host);
          } catch {}

          const loading = document.createElement("div");
          loading.style.height = "100%";
          loading.style.display = "flex";
          loading.style.alignItems = "center";
          loading.style.justifyContent = "center";
          loading.style.fontSize = "12px";
          loading.style.color = "#666";
          loading.textContent = "Loading Excalisave…";
          host.appendChild(loading);

          // Offscreen container for the iframe. The iframe is appended here first
          // so that even if the browser renders an error/sad-face document inside
          // it (e.g. resource not web_accessible yet, or extension not reloaded
          // after manifest change), that document is fully clipped off-screen and
          // never visible to the user.
          const offscreen = document.createElement("div");
          offscreen.style.position = "fixed";
          offscreen.style.left = "-3000px";
          offscreen.style.top = "-3000px";
          offscreen.style.width = `${popupW}px`;
          offscreen.style.height = `${maxH}px`;
          offscreen.style.overflow = "hidden";
          offscreen.style.pointerEvents = "none";
          offscreen.style.background = "#fff";

          const iframe = document.createElement("iframe");
          iframe.src = browser.runtime.getURL("popup.html");
          iframe.setAttribute("data-excalisave-popup", "1");
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "0";
          iframe.style.background = "white";

          // When the popup app inside the iframe mounts, it posts this message.
          // Only then do we consider the iframe content "good" and safe to show.
          const onReady = (ev: MessageEvent) => {
            if (ev.data && ev.data.__excalisave === "popup-ready") {
              // Reveal: replace the loading text in the visible host with the
              // (now known good) iframe. The iframe element is moved from the
              // offscreen container into the host.
              if (loading.parentNode) loading.parentNode.removeChild(loading);
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              host.appendChild(iframe);
              // Drop the offscreen container (no longer needed).
              if (offscreen.parentNode)
                offscreen.parentNode.removeChild(offscreen);
              window.removeEventListener("message", onReady as any);
            }
          };
          window.addEventListener("message", onReady as any);

          // The popup's internal close actions (Save, New, etc.) post this so we
          // can tear down the overlay without closing the excalidraw tab.
          const onMsg = (ev: MessageEvent) => {
            if (ev.data && ev.data.__excalisave === "close-popup") {
              cleanup();
            }
          };
          window.addEventListener("message", onMsg as any);

          const cleanup = () => {
            if (host.parentNode) host.parentNode.removeChild(host);
            if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
            if (offscreen.parentNode)
              offscreen.parentNode.removeChild(offscreen);
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            window.removeEventListener("message", onReady as any);
            window.removeEventListener("message", onMsg as any);
            document.removeEventListener("keydown", onEsc as any);
            clearTimeout(failSafe);
          };

          backdrop.addEventListener("click", cleanup, { once: true });

          const onEsc = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") {
              cleanup();
              document.removeEventListener("keydown", onEsc as any);
            }
          };
          document.addEventListener("keydown", onEsc as any, { once: true });

          // Start the iframe load while it is still off-screen (and any error
          // document it might render is invisible).
          offscreen.appendChild(iframe);
          document.body.appendChild(offscreen);

          // Show the controlled host box (white, with loading text) immediately
          // under the triggering button.
          document.body.appendChild(backdrop);
          document.body.appendChild(host);

          // Preflight the popup document. If it is not fetchable as a
          // web_accessible_resource from this page (common after manifest
          // changes until the extension is reloaded), do not create any iframe
          // in a visible spot. Just remove the loading host and fall back to the
          // normal action popup (positioned by the browser, usually on the right).
          const popupUrl = browser.runtime.getURL("popup.html");
          let canLoad = false;
          try {
            const res = await fetch(popupUrl, {
              method: "GET",
              cache: "no-store",
            });
            canLoad = !!res && res.ok;
          } catch {
            canLoad = false;
          }
          if (!canLoad) {
            // Never showed a broken iframe; the host only had our loading text.
            cleanup();
            try {
              browser.runtime.sendMessage({ type: "OpenPopup" });
            } catch {}
            return;
          }

          // Hard timeout: if "popup-ready" never arrives (subresources blocked,
          // bundle error, extension not reloaded, etc.), clean up the loading
          // host (without ever having exposed the iframe) and fall back.
          const failSafe = setTimeout(() => {
            if (!iframe.parentNode || iframe.parentNode === offscreen) {
              cleanup();
              try {
                browser.runtime.sendMessage({ type: "OpenPopup" });
              } catch {}
            }
          }, 2200);
        }}
      >
        Excalisave
      </button>
    </>
  );
}

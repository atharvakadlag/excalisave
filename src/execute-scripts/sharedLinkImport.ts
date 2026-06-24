import { browser } from "webextension-polyfill-ts";
import { MessageType } from "../constants/message.types";
import {
  getDrawingDataState,
} from "../ContentScript/contentScript.utils";
import {
  DRAWING_ID_KEY_LS,
  DRAWING_TITLE_KEY_LS,
} from "../lib/constants";
import { XLogger } from "../lib/logger";
import {
  setLocalStorageItemAndNotify,
} from "../lib/localStorage.utils";
import { waitForElement } from "../lib/utils/wait-for-element.util";
import { IdUtils } from "../lib/utils/id.utils";
import { getFormattedToday } from "../lib/utils/date.utils";
import { saveCurrentDrawingToStorage, saveNewDrawingToStorage } from "../lib/utils/drawing-message.utils";

// ─── Native dialog selectors ───────────────────────────────────────
// Excalidraw's "Load from link" modal container (matches both .excalidraw.excalidraw-modal-container)
const MODAL_SELECTOR = ".excalidraw.excalidraw-modal-container";
// The "Replace my content" button
const REPLACE_BUTTON_SELECTOR =
  ".excalidraw.excalidraw-modal-container .OverwriteConfirm__Description.OverwriteConfirm__Description--color-danger button";

function clickReplaceMyContent(): boolean {
  const btn = document.querySelector<HTMLButtonElement>(REPLACE_BUTTON_SELECTOR);
  if (!btn) return false;
  btn.click();
  return true;
}

// ─── Actions ───────────────────────────────────────────────────────

async function handleCreateNew(name: string): Promise<void> {
  // 1. Save current drawing
  await saveCurrentDrawingToStorage();

  // 2. Create new drawing ID and save initial record
  const newId = IdUtils.createDrawingId();
  const data = await getDrawingDataState();
  await saveNewDrawingToStorage(newId, name, data);

  // 3. Set new drawing ID in localStorage BEFORE clicking replace
  //    so auto-save (2s polling) associates future changes with this drawing
  setLocalStorageItemAndNotify(DRAWING_ID_KEY_LS, newId);
  setLocalStorageItemAndNotify(DRAWING_TITLE_KEY_LS, name);

  // 4. Click "Replace my content" — shared data loads into canvas
  if (!clickReplaceMyContent()) {
    XLogger.error("[SharedLinkImport] Replace button not found");
    showNativeDialog();
  }
}

async function handleOverrideCurrent(): Promise<void> {
  if (!clickReplaceMyContent()) {
    XLogger.error("[SharedLinkImport] Replace button not found");
    showNativeDialog();
  }
}

async function handleOverrideExisting(drawingId: string, drawingName: string): Promise<void> {
  // Save current drawing before switching
  await saveCurrentDrawingToStorage();

  // Set the selected drawing as current
  setLocalStorageItemAndNotify(DRAWING_ID_KEY_LS, drawingId);
  setLocalStorageItemAndNotify(DRAWING_TITLE_KEY_LS, drawingName);

  if (!clickReplaceMyContent()) {
    XLogger.error("[SharedLinkImport] Replace button not found");
    showNativeDialog();
  }
}

// ─── Dialog UI ─────────────────────────────────────────────────────

let nativeModal: HTMLElement | null = null;

function hideNativeDialog(): void {
  nativeModal = document.querySelector<HTMLElement>(MODAL_SELECTOR);
  if (nativeModal) {
    nativeModal.style.display = "none";
  }
}

function showNativeDialog(): void {
  if (nativeModal) {
    nativeModal.style.display = "";
    nativeModal = null;
  }
}

function removeOverlay(): void {
  const overlay = document.getElementById("excalisave-import-overlay");
  if (overlay) overlay.remove();
}

async function fetchDrawingsList(): Promise<Array<{ id: string; name: string }>> {
  try {
    const result = await browser.runtime.sendMessage({
      type: MessageType.GET_ALL_DRAWINGS,
    });
    return result?.drawings ?? [];
  } catch (error) {
    XLogger.error("[SharedLinkImport] Error fetching drawings list", error);
    return [];
  }
}

function createOverlayDialog(): void {
  // Helper to read a CSS variable from the Excalidraw container (falls back to default)
  const excalidrawEl = document.querySelector(".excalidraw");
  const cssVar = (name: string, fallback: string): string => {
    if (!excalidrawEl) return fallback;
    return getComputedStyle(excalidrawEl).getPropertyValue(name).trim() || fallback;
  };

  const islandBg = cssVar("--island-bg-color", "#232329");
  const textPrimary = cssVar("--text-primary-color", "#e8e8e8");
  const textSecondary = cssVar("--color-gray-40", "#a0a0a0");
  const borderColor = cssVar("--default-border-color", "#3a3a44");
  const colorPrimary = cssVar("--color-primary", "#6965db");
  const colorDanger = cssVar("--color-danger", "#e03131");
  const inputBg = cssVar("--input-bg-color", "#1b1b1f");
  const buttonHoverBg = cssVar("--button-hover-bg", "rgba(255, 255, 255, 0.08)");

  const overlay = document.createElement("div");
  overlay.id = "excalisave-import-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "999999",
    fontFamily: "Assistant, system-ui, -apple-system, sans-serif",
  });

  const dialog = document.createElement("div");
  Object.assign(dialog.style, {
    backgroundColor: islandBg,
    color: textPrimary,
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "400px",
    width: "90%",
    boxShadow: `0 2px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px ${borderColor}`,
  });

  // Title
  const title = document.createElement("h2");
  title.textContent = "Import Shared Drawing";
  Object.assign(title.style, {
    margin: "0 0 16px 0",
    fontSize: "16px",
    fontWeight: "700",
    letterSpacing: "0.2px",
  });
  dialog.appendChild(title);

  // Name input
  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Drawing name";
  Object.assign(nameLabel.style, {
    display: "block",
    fontSize: "12px",
    color: textSecondary,
    marginBottom: "4px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  });
  dialog.appendChild(nameLabel);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = `Shared drawing - ${getFormattedToday()}`;
  Object.assign(nameInput.style, {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: `1px solid ${borderColor}`,
    backgroundColor: inputBg,
    color: textPrimary,
    fontSize: "14px",
    marginBottom: "16px",
    boxSizing: "border-box",
    outline: "none",
  });
  nameInput.addEventListener("focus", () => { nameInput.style.borderColor = colorPrimary; });
  nameInput.addEventListener("blur", () => { nameInput.style.borderColor = borderColor; });
  dialog.appendChild(nameInput);

  // Dropdown for "Override existing" (hidden by default)
  const dropdownContainer = document.createElement("div");
  dropdownContainer.id = "excalisave-dropdown-container";
  Object.assign(dropdownContainer.style, {
    display: "none",
    marginBottom: "12px",
  });

  const dropdownLabel = document.createElement("label");
  dropdownLabel.textContent = "Select drawing to override";
  Object.assign(dropdownLabel.style, {
    display: "block",
    fontSize: "12px",
    color: textSecondary,
    marginBottom: "4px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  });
  dropdownContainer.appendChild(dropdownLabel);

  const dropdown = document.createElement("select");
  dropdown.id = "excalisave-drawing-select";
  Object.assign(dropdown.style, {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: `1px solid ${borderColor}`,
    backgroundColor: inputBg,
    color: textPrimary,
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  });
  dropdownContainer.appendChild(dropdown);
  dialog.appendChild(dropdownContainer);

  // Buttons container
  const buttonsContainer = document.createElement("div");
  Object.assign(buttonsContainer.style, {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  });

  const btnBase: Record<string, string> = {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
    transition: "filter 0.1s, background-color 0.1s",
    fontFamily: "inherit",
  };

  function makeButton(
    text: string,
    bg: string,
    color: string,
    opts?: { border?: string }
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      ...btnBase,
      backgroundColor: bg,
      color,
      ...(opts?.border ? { border: opts.border } : {}),
    });
    btn.addEventListener("mouseenter", () => { btn.style.filter = "brightness(1.15)"; });
    btn.addEventListener("mouseleave", () => { btn.style.filter = "none"; });
    return btn;
  }

  // Button: Create new drawing (primary)
  const btnCreate = makeButton("Create new drawing", colorPrimary, "#fff");
  btnCreate.addEventListener("click", async () => {
    removeOverlay();
    await handleCreateNew(nameInput.value || `Shared drawing - ${getFormattedToday()}`);
  });
  buttonsContainer.appendChild(btnCreate);

  // Button: Override current drawing (secondary)
  const btnOverrideCurrent = makeButton(
    "Override current drawing",
    buttonHoverBg,
    textPrimary,
    { border: `1px solid ${borderColor}` }
  );
  btnOverrideCurrent.addEventListener("click", async () => {
    removeOverlay();
    await handleOverrideCurrent();
  });
  buttonsContainer.appendChild(btnOverrideCurrent);

  // Button: Cancel (ghost)
  const btnCancel = makeButton("Cancel", "transparent", textSecondary);
  Object.assign(btnCancel.style, { marginTop: "2px", fontWeight: "500" });
  btnCancel.addEventListener("click", () => {
    removeOverlay();
    showNativeDialog();
  });

  // Button: Override existing drawing (secondary)
  const btnOverrideExisting = makeButton(
    "Override existing drawing",
    buttonHoverBg,
    textPrimary,
    { border: `1px solid ${borderColor}` }
  );

  let dropdownLoaded = false;

  btnOverrideExisting.addEventListener("click", async () => {
    if (!dropdownLoaded) {
      btnOverrideExisting.textContent = "Loading drawings...";
      btnOverrideExisting.disabled = true;

      const drawings = await fetchDrawingsList();
      if (drawings.length === 0) {
        btnOverrideExisting.textContent = "No saved drawings found";
        btnOverrideExisting.disabled = true;
        return;
      }

      dropdown.innerHTML = "";
      for (const d of drawings) {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.name;
        opt.dataset.name = d.name;
        dropdown.appendChild(opt);
      }

      dropdownContainer.style.display = "block";
      dropdownLoaded = true;
      btnOverrideExisting.style.display = "none";

      // Show confirm button (danger)
      const confirmOverrideBtn = makeButton("Confirm override", colorDanger, "#fff");
      confirmOverrideBtn.addEventListener("click", async () => {
        const selectedId = dropdown.value;
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        const selectedName = selectedOption?.dataset.name ?? "";
        removeOverlay();
        await handleOverrideExisting(selectedId, selectedName);
      });
      buttonsContainer.insertBefore(confirmOverrideBtn, btnCancel);
    }
  });
  buttonsContainer.appendChild(btnOverrideExisting);

  // Append cancel last (visually at bottom)
  buttonsContainer.appendChild(btnCancel);

  dialog.appendChild(buttonsContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus the name input
  nameInput.focus();
  nameInput.select();
}

// ─── Main ──────────────────────────────────────────────────────────

(async () => {
  XLogger.log("[SharedLinkImport] Script injected, waiting for native dialog...");

  try {
    await waitForElement(MODAL_SELECTOR, 10000);
  } catch {
    XLogger.log("[SharedLinkImport] Native dialog not found within timeout, aborting");
    return;
  }

  XLogger.log("[SharedLinkImport] Native dialog found, taking over");
  hideNativeDialog();
  createOverlayDialog();
})();

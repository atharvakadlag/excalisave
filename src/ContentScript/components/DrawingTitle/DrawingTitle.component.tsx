import React, { useState, useEffect, useRef, useCallback } from "react";
import "./DrawingTitle.styles.scss";
import { useLocalStorageString } from "../../hooks/useLocalStorageString.hook";
import {
  DRAWING_ID_KEY_LS,
  DRAWING_TITLE_KEY_LS,
} from "../../../lib/constants";
import { browser } from "webextension-polyfill-ts";
import { MessageType } from "../../../constants/message.types";
import { XLogger } from "../../../lib/logger";
import { getDefaultDrawingName } from "../../../lib/utils/date.utils";
import { saveCurrentDrawingToStorage } from "../../../lib/utils/drawing-message.utils";

type DrawingListItem = {
  id: string;
  name: string;
  createdAt?: string;
  roomUrl?: string;
};

export function DrawingTitle() {
  const title = useLocalStorageString(DRAWING_TITLE_KEY_LS, "");
  const currentDrawingId = useLocalStorageString(DRAWING_ID_KEY_LS, "");
  const [isOpen, setIsOpen] = useState(false);
  const [drawings, setDrawings] = useState<DrawingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DrawingListItem[] | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isUnsaved = !currentDrawingId;

  // Reset menu state when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setOpenMenuId(null);
      setRenamingId(null);
      setDeletingId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        return;
      }
      if (openMenuId) {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".excalisave-dropdown__context-menu") &&
          !target.closest(".excalisave-dropdown__dots-btn")
        ) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, openMenuId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    setNewName(getDefaultDrawingName());
    setSearch("");

    setLoading(true);
    browser.runtime
      .sendMessage({ type: MessageType.GET_ALL_DRAWINGS })
      .then((response: any) => {
        if (response?.success) {
          const sorted = (response.drawings || []).sort(
            (a: DrawingListItem, b: DrawingListItem) => {
              if (!a.createdAt) return 1;
              if (!b.createdAt) return -1;
              return b.createdAt.localeCompare(a.createdAt);
            }
          );
          setDrawings(sorted);
        }
      })
      .catch((err) => XLogger.error("Failed to fetch drawings", err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const query = search.trim();
    if (!query) {
      setSearchResults(null);
      return undefined;
    }

    const timer = setTimeout(() => {
      browser.runtime
        .sendMessage({
          type: MessageType.SEARCH_DRAWINGS,
          payload: { query },
        })
        .then((response: any) => {
          if (response?.success) {
            setSearchResults(response.drawings || []);
          }
        })
        .catch((err) => XLogger.error("Failed to search drawings", err));
    }, 250);

    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const handleSave = useCallback(async () => {
    if (!currentDrawingId || saving) return;

    setSaving(true);
    try {
      await saveCurrentDrawingToStorage();
    } catch (err) {
      XLogger.error("Failed to save drawing", err);
    } finally {
      setSaving(false);
    }
  }, [currentDrawingId, saving]);

  const handleSaveNew = useCallback(async () => {
    if (saving || !newName.trim()) return;

    setSaving(true);
    try {
      await browser.runtime.sendMessage({
        type: MessageType.MESSAGE_AUTO_SAVE,
        payload: { name: newName.trim(), setCurrent: true },
      });
      setIsOpen(false);
    } catch (err) {
      XLogger.error("Failed to save new drawing", err);
    } finally {
      setSaving(false);
    }
  }, [saving, newName]);

  const handleLoadDrawing = useCallback(async (id: string) => {
    setIsOpen(false);
    try {
      await browser.runtime.sendMessage({
        type: MessageType.LOAD_DRAWING,
        payload: { id },
      });
    } catch (err) {
      XLogger.error("Failed to load drawing", err);
    }
  }, []);

  const handleNewDrawing = useCallback(async () => {
    setIsOpen(false);
    try {
      await browser.runtime.sendMessage({
        type: MessageType.CREATE_NEW_DRAWING,
      });
    } catch (err) {
      XLogger.error("Failed to create new drawing", err);
    }
  }, []);

  const handleOpenFullUI = useCallback(async () => {
    setIsOpen(false);
    try {
      await browser.runtime.sendMessage({
        type: MessageType.OPEN_POPUP,
      });
    } catch (err) {
      XLogger.error("Failed to open full UI", err);
    }
  }, []);

  // Close context menu on list scroll
  useEffect(() => {
    if (!openMenuId || !listRef.current) return undefined;
    const list = listRef.current;
    const handleScroll = () => setOpenMenuId(null);
    list.addEventListener("scroll", handleScroll);
    return () => list.removeEventListener("scroll", handleScroll);
  }, [openMenuId]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleMenuToggle = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setRenamingId(null);
      setDeletingId(null);
      if (openMenuId === id) {
        setOpenMenuId(null);
      } else {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setOpenMenuId(id);
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.left - 100,
        });
      }
    },
    [openMenuId]
  );

  const handleRenameConfirm = useCallback(
    async (id: string) => {
      const trimmedName = renameValue.trim();
      if (!trimmedName) {
        setRenamingId(null);
        return;
      }

      try {
        const stored = await browser.storage.local.get(id);
        const drawing = stored[id];
        if (drawing) {
          await browser.storage.local.set({
            [id]: { ...drawing, name: trimmedName },
          });
        }

        if (currentDrawingId === id) {
          localStorage.setItem(DRAWING_TITLE_KEY_LS, trimmedName);
          window.dispatchEvent(
            new CustomEvent("localStorageChange", {
              detail: { key: DRAWING_TITLE_KEY_LS, value: trimmedName },
            })
          );
        }

        setDrawings((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, name: trimmedName } : d
          )
        );
        setSearchResults((prev) =>
          prev
            ? prev.map((d) =>
                d.id === id ? { ...d, name: trimmedName } : d
              )
            : null
        );

        await browser.runtime.sendMessage({
          type: MessageType.SYNC_DRAWING,
          payload: { id },
        });
      } catch (err) {
        XLogger.error("Failed to rename drawing", err);
      }

      setRenamingId(null);
    },
    [renameValue, currentDrawingId]
  );

  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      try {
        await browser.runtime.sendMessage({
          type: MessageType.DELETE_DRAWING,
          payload: { id },
        });

        await browser.storage.local.remove(id);

        const favResult = await browser.storage.local.get("favorites");
        const favorites = favResult["favorites"] || [];
        await browser.storage.local.set({
          favorites: favorites.filter((fav: string) => fav !== id),
        });

        const foldersResult = await browser.storage.local.get("folders");
        const folders = foldersResult["folders"] || [];
        await browser.storage.local.set({
          folders: folders.map((folder: any) => ({
            ...folder,
            drawingIds: (folder.drawingIds || []).filter(
              (did: string) => did !== id
            ),
          })),
        });

        if (currentDrawingId === id) {
          localStorage.removeItem(DRAWING_ID_KEY_LS);
          localStorage.removeItem(DRAWING_TITLE_KEY_LS);
          window.dispatchEvent(
            new CustomEvent("localStorageChange", {
              detail: { key: DRAWING_TITLE_KEY_LS, value: null },
            })
          );
          window.dispatchEvent(
            new CustomEvent("localStorageChange", {
              detail: { key: DRAWING_ID_KEY_LS, value: null },
            })
          );
        }

        setDrawings((prev) => prev.filter((d) => d.id !== id));
        setSearchResults((prev) =>
          prev ? prev.filter((d) => d.id !== id) : null
        );
      } catch (err) {
        XLogger.error("Failed to delete drawing", err);
      }

      setDeletingId(null);
    },
    [currentDrawingId]
  );

  const renderDrawingItem = (drawing: DrawingListItem) => {
    if (deletingId === drawing.id) {
      return (
        <div
          key={drawing.id}
          className="excalisave-dropdown__item excalisave-dropdown__item--confirm"
        >
          <span className="excalisave-dropdown__confirm-text">
            Delete &ldquo;{drawing.name}&rdquo;?
          </span>
          <div className="excalisave-dropdown__confirm-actions">
            <button
              className="excalisave-dropdown__confirm-btn excalisave-dropdown__confirm-btn--yes"
              onClick={() => handleDeleteConfirm(drawing.id)}
            >
              Yes
            </button>
            <button
              className="excalisave-dropdown__confirm-btn excalisave-dropdown__confirm-btn--no"
              onClick={() => setDeletingId(null)}
            >
              No
            </button>
          </div>
        </div>
      );
    }

    if (renamingId === drawing.id) {
      return (
        <div
          key={drawing.id}
          className="excalisave-dropdown__item excalisave-dropdown__item--renaming"
        >
          <input
            ref={renameInputRef}
            className="excalisave-dropdown__rename-input"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameConfirm(drawing.id);
              if (e.key === "Escape") setRenamingId(null);
            }}
            onBlur={() => handleRenameConfirm(drawing.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      );
    }

    return (
      <div
        key={drawing.id}
        className={`excalisave-dropdown__item ${
          drawing.id === currentDrawingId
            ? "excalisave-dropdown__item--active"
            : ""
        }`}
      >
        <button
          className="excalisave-dropdown__item-content"
          onClick={() => handleLoadDrawing(drawing.id)}
          title={drawing.name}
        >
          {drawing.roomUrl && (
            <span
              className="excalisave-dropdown__shared-icon"
              title="Shared session"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle cx="8" cy="8" r="7" fill="#22c55e" />
                <path
                  d="M5.5 8.5L7 10L10.5 6.5"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
          <span className="excalisave-dropdown__item-name">
            {drawing.name}
          </span>
        </button>
        <button
          className="excalisave-dropdown__dots-btn"
          onClick={(e) => handleMenuToggle(e, drawing.id)}
          title="Options"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="excalisave-title-wrapper">
        <h1
          className="excalisave-title"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {title}
        </h1>
        {showTooltip && title && (
          <div className="excalisave-title-tooltip">{title}</div>
        )}
      </div>
      <div ref={dropdownRef} style={{ position: "relative", marginLeft: "8px" }}>
        <button
          className="excalidraw-button collab-button excalisave-button"
          style={{ width: "auto" }}
          title="Open Excalisave"
          onClick={() => setIsOpen(!isOpen)}
        >
          Excalisave
        </button>
        {isOpen && (
          <div className="excalisave-dropdown">
            <div className="excalisave-dropdown__actions">
              {isUnsaved ? (
                <div className="excalisave-dropdown__save-new">
                  <input
                    className="excalisave-dropdown__name-input"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveNew()}
                    placeholder="Drawing name"
                    autoFocus
                  />
                  <button
                    className="excalisave-dropdown__action-btn"
                    onClick={handleSaveNew}
                    disabled={saving || !newName.trim()}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="excalisave-dropdown__action-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="excalisave-dropdown__action-btn"
                    onClick={handleNewDrawing}
                  >
                    New Drawing
                  </button>
                </>
              )}
            </div>
            <div className="excalisave-dropdown__divider" />
            {!loading && drawings.length > 0 && (
              <div className="excalisave-dropdown__search">
                <input
                  className="excalisave-dropdown__name-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search drawings..."
                />
              </div>
            )}
            <div ref={listRef} className="excalisave-dropdown__list">
              {loading ? (
                <div className="excalisave-dropdown__empty">Loading...</div>
              ) : drawings.length === 0 ? (
                <div className="excalisave-dropdown__empty">
                  No drawings saved
                </div>
              ) : (
                (() => {
                  const displayList = searchResults !== null ? searchResults : drawings;
                  return displayList.length === 0 ? (
                    <div className="excalisave-dropdown__empty">
                      No matches
                    </div>
                  ) : (
                    displayList.map((drawing) => renderDrawingItem(drawing))
                  );
                })()
              )}
            </div>
            <div className="excalisave-dropdown__divider" />
            <div className="excalisave-dropdown__footer">
              <button
                className="excalisave-dropdown__footer-btn"
                onClick={handleOpenFullUI}
              >
                Open Full UI
              </button>
            </div>
            {openMenuId && menuPosition && (
              <div
                className="excalisave-dropdown__context-menu"
                style={{
                  position: "fixed",
                  top: menuPosition.top,
                  left: menuPosition.left,
                }}
              >
                <button
                  className="excalisave-dropdown__context-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    const drawing =
                      drawings.find((d) => d.id === openMenuId) ||
                      searchResults?.find((d) => d.id === openMenuId);
                    if (drawing) {
                      setRenamingId(openMenuId);
                      setRenameValue(drawing.name);
                    }
                    setOpenMenuId(null);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Rename
                </button>
                <div className="excalisave-dropdown__context-separator" />
                <button
                  className="excalisave-dropdown__context-item excalisave-dropdown__context-item--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(openMenuId);
                    setOpenMenuId(null);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

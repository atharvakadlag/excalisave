import { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { Folder } from "../../interfaces/folder.interface";
import { RandomUtils } from "../../lib/utils/random.utils";

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);

  const createFolder = async (name: string) => {
    const currentFolders =
      (await browser.storage.local.get("folders"))?.folders || [];

    const newFolder: Folder = {
      id: `folder:${RandomUtils.generateRandomId()}`,
      name,
      drawingIds: [],
    };

    const newFolders = [...currentFolders, newFolder];

    await browser.storage.local.set({ folders: newFolders });
    setFolders(newFolders);
  };

  const renameFolder = async (folderId: string, name: string) => {
    const newFolders = folders.map((folder) => {
      if (folder.id === folderId) {
        return {
          ...folder,
          name,
        };
      }

      return folder;
    });

    await browser.storage.local.set({ folders: newFolders });
    setFolders(newFolders);
  };

  const removeFolder = async (folderId: string) => {
    const newFolders = folders.filter((folder) => folder.id !== folderId);
    await browser.storage.local.set({ folders: newFolders });
    setFolders(newFolders);
  };

  const addDrawingToFolder = async (drawingId: string, folderId: string) => {
    const newFolders = folders.map((folder) => {
      if (folder.id === folderId) {
        return {
          ...folder,
          drawingIds: [...folder.drawingIds, drawingId],
        };
      }

      return folder;
    });

    await browser.storage.local.set({ folders: newFolders });
    setFolders(newFolders);
  };

  const removeDrawingFromFolder = async (
    drawingId: string,
    folderId: string
  ) => {
    const newFolders = folders.map((folder) => {
      if (folder.id === folderId) {
        return {
          ...folder,
          drawingIds: folder.drawingIds.filter((id) => id !== drawingId),
        };
      }

      return folder;
    });

    await browser.storage.local.set({ folders: newFolders });
    setFolders(newFolders);
  };

  useEffect(() => {
    const loadFolders = async () => {
      const result: Record<string, Folder[]> =
        await browser.storage.local.get("folders");

      if (result.folders) {
        setFolders(result.folders);
      }
    };

    loadFolders();
  }, []);

  return {
    folders,
    createFolder,
    renameFolder,
    removeFolder,
    addDrawingToFolder,
    removeDrawingFromFolder,
  };
}

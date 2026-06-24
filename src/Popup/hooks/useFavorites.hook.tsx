import { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import type { UUID } from "../../lib/utils/id.utils";

export function useFavorites() {
  const [favorites, setFavorites] = useState<UUID[]>([]);

  const addToFavorites = async (drawingId: UUID) => {
    await browser.storage.local.set({ favorites: [...favorites, drawingId] });
    setFavorites((prevFavorites) => [...prevFavorites, drawingId]);
  };

  const removeFromFavorites = async (drawingId: UUID) => {
    const newFavorites = favorites.filter((fav) => fav !== drawingId);
    await browser.storage.local.set({ favorites: newFavorites });
    setFavorites(newFavorites);
  };

  useEffect(() => {
    const loadFavorites = async () => {
      const result: Record<string, UUID[]> =
        await browser.storage.local.get("favorites");

      if (result.favorites) {
        setFavorites(result.favorites);
      }
    };

    loadFavorites();
  }, []);

  return {
    favorites,
    addToFavorites,
    removeFromFavorites,
  };
}

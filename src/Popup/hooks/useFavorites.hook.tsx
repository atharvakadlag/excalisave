import { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const addToFavorites = async (drawingId: string) => {
    await browser.storage.local.set({ favorites: [...favorites, drawingId] });
    setFavorites((prevFavorites) => [...prevFavorites, drawingId]);
  };

  const removeFromFavorites = async (drawingId: string) => {
    const newFavorites = favorites.filter((fav) => fav !== drawingId);
    await browser.storage.local.set({ favorites: newFavorites });
    setFavorites(newFavorites);
  };

  useEffect(() => {
    const loadFavorites = async () => {
      const result: Record<string, string[]> =
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

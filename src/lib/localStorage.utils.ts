/**
 * Helper to dispatch localStorage change events
 * This ensures components listening to localStorage changes get notified
 * Works for both same-tab (custom event) and cross-tab (storage event)
 */
export function dispatchLocalStorageChange(key: string, value: string | null) {
  // Dispatch custom event for same-tab listeners
  window.dispatchEvent(
    new CustomEvent("localStorageChange", {
      detail: { key, value },
    })
  );

  // Note: The 'storage' event fires automatically for cross-tab changes
}

export function setLocalStorageItemAndNotify(key: string, value: string) {
  localStorage.setItem(key, value);
  dispatchLocalStorageChange(key, value);
}

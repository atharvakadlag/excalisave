import { useState, useEffect } from "react";

export function useLocalStorageString(
  key: string,
  initialValue: string = ""
): string {
  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(key) || initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    // Re-read localStorage to catch any changes that occurred
    // between useState init and this effect running (race condition
    // with executed scripts that set values during mount gap).
    const current = localStorage.getItem(key);
    if (current !== null) {
      setValue(current || initialValue);
    }

    // Handle changes in the same tab
    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        key: string;
        value: string | null;
      }>;
      if (customEvent.detail.key === key) {
        setValue(customEvent.detail.value ?? initialValue);
      }
    };

    // Handler for storage events (cross-tab changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setValue(e.newValue ?? initialValue);
      }
    };

    window.addEventListener("localStorageChange", handleCustomStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "localStorageChange",
        handleCustomStorageChange
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key, initialValue]);

  return value;
}

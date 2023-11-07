import { useEffect, useRef, useState } from "react";

/**
 * ! Used to block loading another drawing while one is already loading. This prevents an issue with on fast-switching when
 * ! the data is not loaded correctly.
 *
 */

export function useDrawingLoading() {
  const savedTimeout = useRef<number>();
  const [loading, setLoading] = useState(false);

  const startLoading = () => {
    setLoading(true);
    savedTimeout.current = window.setTimeout(() => {
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (savedTimeout.current) {
        window.clearTimeout(savedTimeout.current);
      }
    };
  }, []);

  return {
    loading,
    startLoading,
  };
}

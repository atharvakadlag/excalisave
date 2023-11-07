import React from "react";
import { RestorePoint } from "../../interfaces/restore-point.interface";
import { browser } from "webextension-polyfill-ts";

const restorePointKey = "restorePoint";

/**
 * Restores data that can be used to improve the user experience, like search term, selected sidebar item, etc.
 */
export function useRestorePoint() {
  const getRestorePoint = async (): Promise<RestorePoint> => {
    const restorePoint = await browser.storage.session.get(restorePointKey);

    return restorePoint.restorePoint;
  };

  const setRestorePoint = async (data: RestorePoint): Promise<void> => {
    await browser.storage.session.set({
      restorePoint: data,
    });
  };

  return {
    getRestorePoint,
    setRestorePoint,
  };
}

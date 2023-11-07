import * as ExcalidrawLib from "@excalidraw/excalidraw";
import type {
  ExcalidrawElement,
  NonDeleted,
} from "@excalidraw/excalidraw/types/element/types";
import type { AppState } from "@excalidraw/excalidraw/types/types";

export {};

declare global {
  interface Window {
    __SCRIPT_PARAMS__: Record<string, any>;
    ExcalidrawLib: typeof ExcalidrawLib;
    dbConnection: IDBDatabase;
  }

  // Aliases:
  type ExcalidrawElements = readonly NonDeleted<ExcalidrawElement>[];
  type ExcalidrawAppState = Partial<Omit<AppState, "offsetTop" | "offsetLeft">>;
}

declare module "webextension-polyfill-ts" {
  namespace Storage {
    interface Static {
      session: Storage.StorageArea;
    }
  }
}

import * as ExcalidrawLib from "@excalidraw/excalidraw";

export {};

declare global {
  interface Window {
    __SCRIPT_PARAMS__: Record<string, any>;
    ExcalidrawLib: typeof ExcalidrawLib;
    dbConnection: IDBDatabase;
  }
}

declare module "webextension-polyfill-ts" {
  namespace Storage {
    interface Static {
      session: Storage.StorageArea;
    }
  }
}

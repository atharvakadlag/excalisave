interface Window {
  __SCRIPT_PARAMS__: Record<string, any>;
  ExcalidrawLib: {
    exportToBlob: (opts: {
      elements: any[];
      appState?: any;
      files: any[];
      maxWidthOrHeight?: number;
      getDimensions?: (
        width: number,
        height: number
      ) => {
        width: number;
        height: number;
        scale?: number;
      };
      exportPadding?: number;
      mimeType?: string;
      quality?: number;
      [key: string]: any;
    }) => Promise<Blob>;
  };
}

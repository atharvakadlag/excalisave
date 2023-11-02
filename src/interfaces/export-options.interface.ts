export interface ExportOptions {
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
}

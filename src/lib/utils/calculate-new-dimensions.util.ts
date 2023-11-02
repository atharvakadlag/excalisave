import { MAX_HEIGHT_THUMBNAIL, MAX_WIDTH_THUMBNAIL } from "../constants";

export function calculateNewDimensions(width: number, height: number) {
  if (width <= MAX_WIDTH_THUMBNAIL && height <= MAX_HEIGHT_THUMBNAIL) {
    return {
      width: Math.max(1, width),
      height: Math.max(1, height),
      scale: 1,
    };
  }

  const widthScale = width / MAX_WIDTH_THUMBNAIL;
  const heightScale = height / MAX_HEIGHT_THUMBNAIL;

  console.log("widthScale", widthScale);
  console.log("heightScale", heightScale);

  const scale = Math.max(widthScale, heightScale);

  console.log("scale", scale);

  width = Math.max(1, Math.round(width / scale));
  height = Math.max(1, Math.round(height / scale));

  return {
    width,
    height,
    scale: 1.0 / scale,
  };
}

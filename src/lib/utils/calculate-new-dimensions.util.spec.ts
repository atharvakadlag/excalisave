import { MAX_HEIGHT_THUMBNAIL, MAX_WIDTH_THUMBNAIL } from "../constants";
import { calculateNewDimensions } from "./calculate-new-dimensions.util";

/**
 * Limites are defined in src/lib/constants.ts
 */

describe("calculateNewDimensions", () => {
  it("should return same dimension if not exceed limits", () => {
    expect(calculateNewDimensions(100, 100)).toEqual({
      width: 100,
      height: 100,
      scale: 1,
    });

    expect(
      calculateNewDimensions(MAX_WIDTH_THUMBNAIL, MAX_HEIGHT_THUMBNAIL)
    ).toEqual({
      width: MAX_WIDTH_THUMBNAIL,
      height: MAX_HEIGHT_THUMBNAIL,
      scale: 1,
    });
  });

  it("should return new dimension for too width", () => {
    // To match limits we need to scale down to 0.375
    expect(calculateNewDimensions(1000, 100)).toEqual({
      width: MAX_WIDTH_THUMBNAIL,
      height: 38,
      scale: 0.375,
    });
  });

  it("should return new dimension for too height", () => {
    // To match limits we need to scale down to 0.375
    expect(calculateNewDimensions(200, 520)).toEqual({
      width: 75,
      height: 195,
      scale: 0.375,
    });
  });

  it("should not return a dimension lower than 1 for 10_000x1", () => {
    // To match limits we need to scale down to 0.375
    expect(calculateNewDimensions(10_000, 1)).toEqual({
      width: MAX_WIDTH_THUMBNAIL,
      height: 1,
      scale: 0.0375,
    });
  });

  it("Real example 1: It must fit the height", () => {
    expect(calculateNewDimensions(13734.345703125, 11249.04800415039)).toEqual({
      width: 238,
      height: MAX_HEIGHT_THUMBNAIL,
      scale: 0.017334800236255887,
    });
  });
});

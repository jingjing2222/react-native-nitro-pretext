import { describe, expect, it, jest } from "@jest/globals";

jest.mock("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => ({
      measure: jest.fn(() => 42),
      measureBatch: jest.fn(() => [10, 20, 30]),
    })),
  },
}));

import { NitroModules } from "react-native-nitro-modules";
import { TextMeasure, measure, measureBatch } from "../index";

describe("react-native-nitro-pretext", () => {
  it("creates the Pretext hybrid object", () => {
    expect(NitroModules.createHybridObject).toHaveBeenCalledWith("Pretext");
  });

  it("forwards measure calls to the Nitro hybrid object", () => {
    const measureMock = jest.mocked(TextMeasure.measure);

    expect(measure("test", "System", 16)).toBe(42);
    expect(TextMeasure.measure("hello", "serif", 18)).toBe(42);
    expect(measureMock).toHaveBeenNthCalledWith(1, "test", "System", 16);
    expect(measureMock).toHaveBeenNthCalledWith(2, "hello", "serif", 18);
  });

  it("forwards batch measure calls to the Nitro hybrid object", () => {
    const measureBatchMock = jest.mocked(TextMeasure.measureBatch);

    expect(measureBatch(["a", "bb", "ccc"], "System", 16)).toEqual([
      10, 20, 30,
    ]);
    expect(TextMeasure.measureBatch(["word"], "monospace", 14)).toEqual([
      10, 20, 30,
    ]);
    expect(measureBatchMock).toHaveBeenNthCalledWith(
      1,
      ["a", "bb", "ccc"],
      "System",
      16,
    );
    expect(measureBatchMock).toHaveBeenNthCalledWith(
      2,
      ["word"],
      "monospace",
      14,
    );
  });
});

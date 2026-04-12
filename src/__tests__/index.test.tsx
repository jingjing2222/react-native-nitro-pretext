import { describe, expect, it, jest } from "@jest/globals";

jest.mock("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => ({
      measure: jest.fn(() => 42),
      measureBatch: jest.fn((texts: string[]) =>
        texts.map((text) => text.length * 10),
      ),
      prepareParagraphs: jest.fn(() => ({
        id: 7,
        paragraphCount: 2,
      })),
      prepareParagraphsWithStats: jest.fn(() => ({
        prepared: {
          id: 7,
          paragraphCount: 2,
        },
        stats: {
          tokenizeMs: 1.5,
          measurementMs: 4.25,
          buildPreparedMs: 0.5,
          totalMs: 6.25,
          paragraphCount: 2,
          totalTokenCount: 14,
          uniqueTokenCount: 8,
        },
      })),
      layoutParagraphs: jest.fn(() => [
        {
          brokenText: "alpha\nbeta",
          lineCount: 2,
          height: 48,
          maxLineWidth: 180,
        },
        {
          brokenText: "gamma",
          lineCount: 1,
          height: 24,
          maxLineWidth: 92,
        },
      ]),
      layoutParagraphsMetadata: jest.fn(() => [
        {
          lineCount: 2,
          height: 48,
          maxLineWidth: 180,
        },
        {
          lineCount: 1,
          height: 24,
          maxLineWidth: 92,
        },
      ]),
      layoutParagraphLines: jest.fn(() => [
        {
          lineCount: 2,
          height: 48,
          maxLineWidth: 180,
          lines: [
            {
              textStart: 0,
              textEnd: 5,
              top: 0,
              left: 0,
              width: 92,
              height: 24,
            },
            {
              textStart: 6,
              textEnd: 10,
              top: 24,
              left: 0,
              width: 88,
              height: 24,
            },
          ],
        },
        {
          lineCount: 1,
          height: 24,
          maxLineWidth: 92,
          lines: [
            {
              textStart: 0,
              textEnd: 5,
              top: 0,
              left: 0,
              width: 92,
              height: 24,
            },
          ],
        },
      ]),
      releaseParagraphs: jest.fn(),
    })),
  },
}));

import { NitroModules } from "react-native-nitro-modules";
import {
  layoutParagraphLines,
  layoutParagraphs,
  layoutParagraphsMetadata,
  layoutPreparedBenchmarkCorpus,
  measure,
  measureBatch,
  ParagraphEngine,
  prepareParagraphs,
  prepareParagraphsWithStats,
  prepareBenchmarkCorpus,
  releaseParagraphs,
  releasePreparedBenchmarkCorpus,
} from "../index";

describe("react-native-nitro-pretext", () => {
  it("creates the Pretext hybrid object", () => {
    expect(NitroModules.createHybridObject).toHaveBeenCalledWith("Pretext");
  });

  it("forwards measure calls to the Nitro hybrid object", () => {
    const measureMock = jest.mocked(ParagraphEngine.measure);

    expect(measure("test", "System", 16)).toBe(42);
    expect(ParagraphEngine.measure("hello", "serif", 18)).toBe(42);
    expect(measureMock).toHaveBeenNthCalledWith(1, "test", "System", 16);
    expect(measureMock).toHaveBeenNthCalledWith(2, "hello", "serif", 18);
  });

  it("forwards batch measure calls to the Nitro hybrid object", () => {
    const measureBatchMock = jest.mocked(ParagraphEngine.measureBatch);

    expect(measureBatch(["a", "bb", "ccc"], "System", 16)).toEqual([
      10, 20, 30,
    ]);
    expect(ParagraphEngine.measureBatch(["word"], "monospace", 14)).toEqual([
      40,
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

  it("forwards paragraph prepare calls to the Nitro hybrid object", () => {
    const prepareMock = jest.mocked(ParagraphEngine.prepareParagraphs);

    expect(
      prepareParagraphs(["alpha", "beta"], {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
      }),
    ).toEqual({
      id: 7,
      paragraphCount: 2,
    });
    expect(prepareMock).toHaveBeenCalledWith(["alpha", "beta"], {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
    });
  });

  it("keeps benchmark prepare as a compatibility alias", () => {
    const prepareMock = jest.mocked(ParagraphEngine.prepareParagraphs);

    expect(prepareBenchmarkCorpus(["alpha", "beta"], "System", 16)).toEqual({
      id: 7,
      paragraphCount: 2,
    });
    expect(prepareMock).toHaveBeenCalledWith(["alpha", "beta"], {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 16,
      letterSpacing: 0,
    });
  });

  it("returns prepare stats for cold setup cost breakdown", () => {
    const prepareWithStatsMock = jest.mocked(
      ParagraphEngine.prepareParagraphsWithStats,
    );

    expect(
      prepareParagraphsWithStats(["alpha", "beta"], {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
      }),
    ).toEqual({
      prepared: {
        id: 7,
        paragraphCount: 2,
      },
      stats: {
        tokenizeMs: 1.5,
        measurementMs: 4.25,
        buildPreparedMs: 0.5,
        totalMs: 6.25,
        paragraphCount: 2,
        totalTokenCount: 14,
        uniqueTokenCount: 8,
      },
    });
    expect(prepareWithStatsMock).toHaveBeenCalledWith(["alpha", "beta"], {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
    });
  });

  it("forwards paragraph layout calls to the Nitro hybrid object", () => {
    const layoutMock = jest.mocked(ParagraphEngine.layoutParagraphs);

    expect(layoutParagraphs(7, 320)).toEqual([
      {
        brokenText: "alpha\nbeta",
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
      },
      {
        brokenText: "gamma",
        lineCount: 1,
        height: 24,
        maxLineWidth: 92,
      },
    ]);
    expect(layoutMock).toHaveBeenCalledWith(7, 320);
  });

  it("forwards metadata-only layout calls for hot-path benchmarking", () => {
    const layoutMetadataMock = jest.mocked(
      ParagraphEngine.layoutParagraphsMetadata,
    );

    expect(layoutParagraphsMetadata(7, 320)).toEqual([
      {
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
      },
      {
        lineCount: 1,
        height: 24,
        maxLineWidth: 92,
      },
    ]);
    expect(layoutMetadataMock).toHaveBeenCalledWith(7, 320);
  });

  it("forwards line range layout calls for renderer-oriented consumers", () => {
    const layoutLinesMock = jest.mocked(ParagraphEngine.layoutParagraphLines);

    expect(layoutParagraphLines(7, 320)).toEqual([
      {
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
        lines: [
          {
            textStart: 0,
            textEnd: 5,
            top: 0,
            left: 0,
            width: 92,
            height: 24,
          },
          {
            textStart: 6,
            textEnd: 10,
            top: 24,
            left: 0,
            width: 88,
            height: 24,
          },
        ],
      },
      {
        lineCount: 1,
        height: 24,
        maxLineWidth: 92,
        lines: [
          {
            textStart: 0,
            textEnd: 5,
            top: 0,
            left: 0,
            width: 92,
            height: 24,
          },
        ],
      },
    ]);
    expect(layoutLinesMock).toHaveBeenCalledWith(7, 320);
  });

  it("keeps benchmark layout and release aliases wired to the paragraph API", () => {
    const layoutMock = jest.mocked(ParagraphEngine.layoutParagraphs);
    const releaseMock = jest.mocked(ParagraphEngine.releaseParagraphs);

    expect(layoutPreparedBenchmarkCorpus(7, 320)).toEqual([
      {
        brokenText: "alpha\nbeta",
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
      },
      {
        brokenText: "gamma",
        lineCount: 1,
        height: 24,
        maxLineWidth: 92,
      },
    ]);
    releasePreparedBenchmarkCorpus(7);
    releaseParagraphs(9);

    expect(layoutMock).toHaveBeenCalledWith(7, 320);
    expect(releaseMock).toHaveBeenCalledWith(7);
    expect(releaseMock).toHaveBeenCalledWith(9);
  });
});

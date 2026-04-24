import { describe, expect, it, jest } from "@jest/globals";

function mockCreateParagraphEngine() {
  return {
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
    prepareInlineParagraphSegments: jest.fn(() => ({
      id: 13,
      paragraphCount: 1,
    })),
    prepareInlineParagraphSegmentsWithStats: jest.fn(() => ({
      prepared: {
        id: 13,
        paragraphCount: 1,
      },
      stats: {
        tokenizeMs: 1.1,
        measurementMs: 2.2,
        buildPreparedMs: 0.4,
        totalMs: 3.7,
        paragraphCount: 1,
        totalTokenCount: 5,
        uniqueTokenCount: 3,
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
            ascent: -18,
            descent: 6,
          },
          {
            textStart: 6,
            textEnd: 10,
            top: 24,
            left: 0,
            width: 88,
            height: 24,
            ascent: -18,
            descent: 6,
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
            ascent: -18,
            descent: 6,
          },
        ],
      },
    ]),
    layoutParagraphsWithRequest: jest.fn(() => [
      {
        brokenText: "alpha\nbeta",
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
      },
    ]),
    layoutParagraphsMetadataWithRequest: jest.fn(() => [
      {
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
      },
    ]),
    layoutParagraphLinesWithRequest: jest.fn(() => [
      {
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
        lines: [
          {
            textStart: 0,
            textEnd: 5,
            top: 0,
            left: 20,
            width: 92,
            height: 24,
            ascent: -18,
            descent: 6,
          },
        ],
      },
    ]),
    createParagraphLineCursor: jest.fn(() => ({
      id: 11,
      paragraphIndex: 0,
      lineCount: 2,
      height: 48,
    })),
    nextParagraphLine: jest.fn(() => ({
      done: false,
      textStart: 0,
      textEnd: 5,
      top: 0,
      left: 20,
      width: 92,
      height: 24,
      ascent: -18,
      descent: 6,
    })),
    releaseParagraphLineCursor: jest.fn(),
    releaseParagraphs: jest.fn(),
  };
}

jest.mock("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockCreateParagraphEngine()),
  },
}));

import { NitroModules } from "react-native-nitro-modules";
import {
  createParagraphLayoutRequest,
  createParagraphLineCursor,
  layoutParagraphLines,
  layoutParagraphLinesWithRequest,
  layoutParagraphs,
  layoutParagraphsWithRequest,
  layoutParagraphsMetadata,
  layoutParagraphsMetadataWithRequest,
  layoutPreparedBenchmarkCorpus,
  measure,
  measureBatch,
  nextParagraphLine,
  ParagraphEngine,
  PreparedParagraphLinesView,
  PreparedParagraphText,
  PreparedParagraphView,
  prepareInlineParagraphs,
  prepareInlineParagraphsWithStats,
  prepareParagraphs,
  prepareParagraphsWithStats,
  prepareBenchmarkCorpus,
  releaseParagraphLineCursor,
  releaseParagraphs,
  releasePreparedBenchmarkCorpus,
} from "../index";

const nativeParagraphEngineMock = jest.mocked(NitroModules.createHybridObject)
  .mock.results[0]?.value as ReturnType<typeof mockCreateParagraphEngine>;

describe("react-native-nitro-pretext", () => {
  it("exports renderer surfaces", () => {
    expect(PreparedParagraphView).toBeDefined();
    expect(PreparedParagraphLinesView).toBeDefined();
    expect(PreparedParagraphText).toBeDefined();
  });

  it("creates the Pretext hybrid object", () => {
    expect(NitroModules.createHybridObject).toHaveBeenCalledWith("Pretext");
  });

  it("forwards measure calls to the Nitro hybrid object", () => {
    expect(measure("test", "System", 16)).toBe(42);
    expect(ParagraphEngine.measure("hello", "serif", 18)).toBe(42);
    expect(nativeParagraphEngineMock.measure.mock.calls[0]).toEqual([
      "test",
      "System",
      16,
    ]);
    expect(nativeParagraphEngineMock.measure.mock.calls[1]).toEqual([
      "hello",
      "serif",
      18,
    ]);
  });

  it("forwards batch measure calls to the Nitro hybrid object", () => {
    expect(measureBatch(["a", "bb", "ccc"], "System", 16)).toEqual([
      10, 20, 30,
    ]);
    expect(ParagraphEngine.measureBatch(["word"], "monospace", 14)).toEqual([
      40,
    ]);
    expect(nativeParagraphEngineMock.measureBatch.mock.calls[0]).toEqual([
      ["a", "bb", "ccc"],
      "System",
      16,
    ]);
    expect(nativeParagraphEngineMock.measureBatch.mock.calls[1]).toEqual([
      ["word"],
      "monospace",
      14,
    ]);
  });

  it("forwards paragraph prepare calls to the Nitro hybrid object", () => {
    expect(
      prepareParagraphs(["alpha", "beta"], {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
        locale: "ko-KR",
        includeFontPadding: false,
        textDirection: "rtl",
      }),
    ).toEqual({
      id: 7,
      paragraphCount: 2,
    });
    expect(
      nativeParagraphEngineMock.prepareParagraphs.mock.calls.at(-1),
    ).toEqual([
      ["alpha", "beta"],
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
        locale: "ko-KR",
        includeFontPadding: false,
        textDirection: "rtl",
      },
    ]);
  });

  it("keeps benchmark prepare as a compatibility alias", () => {
    expect(prepareBenchmarkCorpus(["alpha", "beta"], "System", 16)).toEqual({
      id: 7,
      paragraphCount: 2,
    });
    expect(
      nativeParagraphEngineMock.prepareParagraphs.mock.calls.at(-1),
    ).toEqual([
      ["alpha", "beta"],
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 16,
        letterSpacing: 0,
        locale: "",
      },
    ]);
  });

  it("returns prepare stats for cold setup cost breakdown", () => {
    expect(
      prepareParagraphsWithStats(["alpha", "beta"], {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
        locale: "ko-KR",
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
    expect(
      nativeParagraphEngineMock.prepareParagraphsWithStats.mock.calls.at(-1),
    ).toEqual([
      ["alpha", "beta"],
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
        locale: "ko-KR",
      },
    ]);
  });

  it("forwards inline paragraph prepare calls to the Nitro hybrid object", () => {
    expect(
      prepareInlineParagraphs(
        [
          [
            {
              text: "@mention",
              breakBehavior: "never",
              fontWeight: "700",
              fontSize: 20,
              lineHeight: 28,
            },
            {
              text: " moves with the next word",
              breakBehavior: "normal",
              fontStyle: "italic",
            },
          ],
        ],
        {
          fontFamily: "System",
          fontSize: 16,
          lineHeight: 24,
          letterSpacing: 0,
          locale: "ko-KR",
        },
      ),
    ).toEqual({
      id: 13,
      paragraphCount: 1,
    });
    expect(
      nativeParagraphEngineMock.prepareInlineParagraphSegments.mock.calls.at(
        -1,
      ),
    ).toEqual([
      JSON.stringify([
        [
          {
            text: "@mention",
            breakBehavior: "never",
            fontWeight: "700",
            fontSize: 20,
            lineHeight: 28,
          },
          {
            text: " moves with the next word",
            breakBehavior: "normal",
            fontStyle: "italic",
          },
        ],
      ]),
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
        locale: "ko-KR",
      },
    ]);
  });

  it("returns stats for inline paragraph preparation", () => {
    expect(
      prepareInlineParagraphsWithStats(
        [[{ text: "@mention", breakBehavior: "never" }]],
        {
          fontFamily: "System",
          fontSize: 16,
          lineHeight: 24,
          letterSpacing: 0,
          locale: "ko-KR",
        },
      ),
    ).toEqual({
      prepared: {
        id: 13,
        paragraphCount: 1,
      },
      stats: {
        tokenizeMs: 1.1,
        measurementMs: 2.2,
        buildPreparedMs: 0.4,
        totalMs: 3.7,
        paragraphCount: 1,
        totalTokenCount: 5,
        uniqueTokenCount: 3,
      },
    });
    expect(
      nativeParagraphEngineMock.prepareInlineParagraphSegmentsWithStats.mock.calls.at(
        -1,
      ),
    ).toEqual([
      JSON.stringify([[{ text: "@mention", breakBehavior: "never" }]]),
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
        locale: "ko-KR",
      },
    ]);
  });

  it("forwards paragraph layout calls to the Nitro hybrid object", () => {
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
    expect(
      nativeParagraphEngineMock.layoutParagraphs.mock.calls.at(-1),
    ).toEqual([7, 320]);
  });

  it("forwards metadata-only layout calls for hot-path benchmarking", () => {
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
    expect(
      nativeParagraphEngineMock.layoutParagraphsMetadata.mock.calls.at(-1),
    ).toEqual([7, 320]);
  });

  it("forwards line range layout calls for renderer-oriented consumers", () => {
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
            ascent: -18,
            descent: 6,
          },
          {
            textStart: 6,
            textEnd: 10,
            top: 24,
            left: 0,
            width: 88,
            height: 24,
            ascent: -18,
            descent: 6,
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
            ascent: -18,
            descent: 6,
          },
        ],
      },
    ]);
    expect(
      nativeParagraphEngineMock.layoutParagraphLines.mock.calls.at(-1),
    ).toEqual([7, 320]);
  });

  it("builds request objects and forwards request-based relayout calls", () => {
    const request = createParagraphLayoutRequest(280, {
      left: 20,
      whiteSpace: "pre",
      wordBreak: "break-all",
      shapeSlices: [
        {
          top: 0,
          height: 24,
          left: 20,
          width: 180,
        },
      ],
    });

    expect(request).toEqual({
      width: 280,
      left: 20,
      whiteSpace: "pre",
      wordBreak: "break-all",
      shapeSlices: [
        {
          top: 0,
          height: 24,
          left: 20,
          width: 180,
        },
      ],
    });
    expect(layoutParagraphsWithRequest(7, request)).toEqual([
      {
        brokenText: "alpha\nbeta",
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
      },
    ]);
    expect(layoutParagraphsMetadataWithRequest(7, request)).toEqual([
      {
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
      },
    ]);
    expect(layoutParagraphLinesWithRequest(7, request)).toEqual([
      {
        lineCount: 2,
        height: 48,
        maxLineWidth: 180,
        lines: [
          {
            textStart: 0,
            textEnd: 5,
            top: 0,
            left: 20,
            width: 92,
            height: 24,
            ascent: -18,
            descent: 6,
          },
        ],
      },
    ]);
    expect(
      nativeParagraphEngineMock.layoutParagraphsWithRequest.mock.calls.at(-1),
    ).toEqual([7, request]);
    expect(
      nativeParagraphEngineMock.layoutParagraphsMetadataWithRequest.mock.calls.at(
        -1,
      ),
    ).toEqual([7, request]);
    expect(
      nativeParagraphEngineMock.layoutParagraphLinesWithRequest.mock.calls.at(
        -1,
      ),
    ).toEqual([7, request]);
  });

  it("forwards paragraph line cursor calls", () => {
    const request = createParagraphLayoutRequest(260, {
      shapeSlices: [
        {
          top: 0,
          height: 24,
          left: 12,
          width: 180,
        },
      ],
    });

    expect(createParagraphLineCursor(7, 0, request)).toEqual({
      id: 11,
      paragraphIndex: 0,
      lineCount: 2,
      height: 48,
    });
    expect(nextParagraphLine(11)).toEqual({
      done: false,
      textStart: 0,
      textEnd: 5,
      top: 0,
      left: 20,
      width: 92,
      height: 24,
      ascent: -18,
      descent: 6,
    });
    releaseParagraphLineCursor(11);

    expect(
      nativeParagraphEngineMock.createParagraphLineCursor.mock.calls.at(-1),
    ).toEqual([7, 0, request]);
    expect(
      nativeParagraphEngineMock.nextParagraphLine.mock.calls.at(-1),
    ).toEqual([11]);
    expect(
      nativeParagraphEngineMock.releaseParagraphLineCursor.mock.calls.at(-1),
    ).toEqual([11]);
  });

  it("keeps benchmark layout and release aliases wired to the paragraph API", () => {
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

    expect(
      nativeParagraphEngineMock.layoutParagraphs.mock.calls.at(-1),
    ).toEqual([7, 320]);
    expect(
      nativeParagraphEngineMock.releaseParagraphs.mock.calls,
    ).toContainEqual([7]);
    expect(
      nativeParagraphEngineMock.releaseParagraphs.mock.calls,
    ).toContainEqual([9]);
  });
});

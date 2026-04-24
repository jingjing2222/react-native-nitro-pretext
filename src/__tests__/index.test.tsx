import { describe, expect, it, jest } from "@jest/globals";

function mockCreateParagraphEngine() {
  return {
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
    layoutParagraphLinesWithDiagnostics: jest.fn(() => [
      {
        lineCount: 1,
        height: 24,
        maxLineWidth: 92,
        lines: [],
        diagnostics: {
          normalizedRequest: {
            width: 280,
            left: 0,
            whiteSpace: "normal",
            wordBreak: "normal",
            shapeSlices: [],
          },
          ruleLayer: "pretext_native_rules",
          canvasPixelParityTarget: false,
          textDirection: "auto",
          layoutEngine: "ios_core_text",
          heightMetricSource: "platform_text_engine_metrics",
          driftKinds: [],
          heightMetricDrivers: ["font_metrics"],
          breakTable: {
            hardBreaks: [],
            nativeSoftBreaks: [],
            graphemeBoundaries: [0],
            atomicSpans: [],
          },
          boundaryMap: {
            utf16Length: 0,
            graphemeBoundaries: [0],
            runBoundaries: [0],
            hardBreaks: [],
            nativeSoftBreaks: [],
            atomicSpanBoundaries: [],
            clusterViolationOffsets: [],
          },
          complexShapeCounters: {
            bidiRunCount: 0,
            emojiClusterCount: 0,
            complexClusterCount: 0,
            clusterViolationCount: 0,
          },
          lineDiagnostics: [],
        },
      },
    ]),
    layoutRichParagraphLines: jest.fn(() => [
      {
        lineCount: 1,
        height: 40,
        maxLineWidth: 120,
        lines: [],
        boxFrames: [
          {
            boxId: "avatar",
            paragraphIndex: 0,
            lineIndex: 0,
            textStart: 5,
            textEnd: 6,
            left: 44,
            top: 4,
            width: 24,
            height: 24,
            baseline: 28,
          },
        ],
        diagnostics: {
          normalizedRequest: {
            width: 280,
            left: 0,
            whiteSpace: "normal",
            wordBreak: "normal",
            shapeSlices: [],
          },
          ruleLayer: "pretext_native_rules",
          canvasPixelParityTarget: false,
          textDirection: "auto",
          layoutEngine: "ios_core_text",
          heightMetricSource: "platform_text_engine_metrics",
          driftKinds: [],
          heightMetricDrivers: ["font_metrics"],
          breakTable: {
            hardBreaks: [],
            nativeSoftBreaks: [],
            graphemeBoundaries: [0],
            atomicSpans: [],
          },
          boundaryMap: {
            utf16Length: 0,
            graphemeBoundaries: [0],
            runBoundaries: [0],
            hardBreaks: [],
            nativeSoftBreaks: [],
            atomicSpanBoundaries: [],
            clusterViolationOffsets: [],
          },
          complexShapeCounters: {
            bidiRunCount: 0,
            emojiClusterCount: 0,
            complexClusterCount: 0,
            clusterViolationCount: 0,
          },
          lineDiagnostics: [],
        },
      },
    ]),
    releaseParagraphs: jest.fn(),
  };
}

jest.mock("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockCreateParagraphEngine()),
  },
}));

import { NitroModules } from "react-native-nitro-modules";

import * as PublicApi from "../index";

const nativeParagraphEngineMock = jest.mocked(NitroModules.createHybridObject)
  .mock.results[0]?.value as ReturnType<typeof mockCreateParagraphEngine>;

describe("react-native-nitro-pretext public API", () => {
  it("exports only the layout-only public surface", () => {
    expect(Object.keys(PublicApi).sort()).toEqual([
      "PreText",
      "layout",
      "prepare",
      "usePreTextLayout",
    ]);
    expect(PublicApi).not.toHaveProperty("PreparedParagraphView");
    expect(PublicApi).not.toHaveProperty("PreparedParagraphText");
    expect(PublicApi).not.toHaveProperty("prepareParagraphsWithStats");
    expect(PublicApi).not.toHaveProperty("layoutParagraphsMetadata");
  });

  it("creates the Pretext hybrid object for native layout calls", () => {
    expect(NitroModules.createHybridObject).toHaveBeenCalledWith("Pretext");
  });

  it("prepares text without exposing the native prepared id", () => {
    const prepared = PublicApi.prepare(["alpha", "beta"], {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 24,
    });

    expect(prepared).toEqual({
      paragraphCount: 2,
      stats: {
        tokenizeMs: 1.5,
        measurementMs: 4.25,
        buildPreparedMs: 0.5,
        totalMs: 6.25,
        paragraphCount: 2,
        totalTokenCount: 14,
        uniqueTokenCount: 8,
      },
      release: expect.any(Function),
    });
    expect("id" in prepared).toBe(false);
    expect(
      nativeParagraphEngineMock.prepareParagraphsWithStats.mock.calls.at(-1),
    ).toEqual([
      ["alpha", "beta"],
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        includeFontPadding: true,
        letterSpacing: 0,
        locale: "",
        textDirection: "auto",
      },
    ]);
  });

  it("prepares inline paragraph sources through the serialized native path", () => {
    PublicApi.prepare(
      [[{ text: "@pretext", breakBehavior: "never" }]],
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
      },
    );

    expect(
      nativeParagraphEngineMock.prepareInlineParagraphSegmentsWithStats.mock.calls.at(
        -1,
      ),
    ).toEqual([
      JSON.stringify([[{ text: "@pretext", breakBehavior: "never" }]]),
      {
        fontFamily: "System",
        fontSize: 16,
        lineHeight: 24,
        includeFontPadding: true,
        letterSpacing: 0,
        locale: "",
        textDirection: "auto",
      },
    ]);
  });

  it("layouts prepared text as metrics by default", () => {
    const prepared = PublicApi.prepare("alpha", {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 24,
    });

    expect(PublicApi.layout(prepared, { width: 280, left: 20 })).toEqual({
      output: "metrics",
      paragraphs: [
        {
          lineCount: 2,
          height: 48,
          maxLineWidth: 180,
        },
      ],
    });
    expect(
      nativeParagraphEngineMock.layoutParagraphsMetadataWithRequest.mock.calls.at(
        -1,
      ),
    ).toEqual([
      7,
      {
        width: 280,
        left: 20,
        whiteSpace: "normal",
        wordBreak: "normal",
        shapeSlices: [],
      },
    ]);
  });

  it("supports lines, diagnostics, and rich layout outputs", () => {
    const prepared = PublicApi.PreText.prepare("alpha", {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 24,
    });

    expect(PublicApi.PreText.layout(prepared, { output: "lines", width: 260 }))
      .toMatchObject({ output: "lines", paragraphs: [{ lineCount: 2 }] });
    expect(
      PublicApi.PreText.layout(prepared, {
        output: "diagnostics",
        width: 260,
      }),
    ).toMatchObject({
      output: "diagnostics",
      paragraphs: [{ diagnostics: { layoutEngine: "ios_core_text" } }],
    });
    expect(PublicApi.PreText.layout(prepared, { output: "rich", width: 260 }))
      .toMatchObject({
        output: "rich",
        paragraphs: [{ boxFrames: [{ boxId: "avatar" }] }],
      });
  });

  it("releases prepared native state once and rejects later layout calls", () => {
    const prepared = PublicApi.prepare("alpha", {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 24,
    });

    prepared.release();
    prepared.release();

    expect(
      nativeParagraphEngineMock.releaseParagraphs.mock.calls,
    ).toContainEqual([7]);
    expect(() => PublicApi.layout(prepared, { width: 280 })).toThrow(
      "PreText prepared layout has already been released.",
    );
  });
});

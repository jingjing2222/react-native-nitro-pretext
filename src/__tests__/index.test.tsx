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
    layoutParagraphLinesWithDiagnostics: jest.fn(
      (_preparedId: number, request: { left: number }) => [
        {
          lineCount: 1,
          height: 24,
          maxLineWidth: 92,
          lines: [
            {
              textStart: 0,
              textEnd: 5,
              top: 0,
              left: request.left,
              width: 92,
              height: 24,
              ascent: -18,
              descent: 6,
            },
          ],
          diagnostics: {
            normalizedRequest: request,
            ruleLayer: "pretext_native_rules",
            canvasPixelParityTarget: false,
            textDirection: "auto",
            layoutEngine: "ios_core_text",
            heightMetricSource: "platform_text_engine_metrics",
            driftKinds: ["algorithm_rule_drift", "line_break_strategy_drift"],
            heightMetricDrivers: [
              "font_metrics",
              "explicit_line_height",
              "fallback_font",
              "emoji_fallback",
              "locale",
              "include_font_padding",
              "line_break_strategy",
            ],
            breakTable: {
              hardBreaks: [
                {
                  offset: 6,
                  kind: "hard_break",
                  source: "source_text",
                },
              ],
              nativeSoftBreaks: [],
              graphemeBoundaries: [0, 1, 2, 3, 4, 5, 6],
              atomicSpans: [
                {
                  textStart: 0,
                  textEnd: 5,
                  source: "inline_break_never",
                },
              ],
            },
            boundaryMap: {
              utf16Length: 6,
              graphemeBoundaries: [0, 1, 2, 3, 4, 5, 6],
              runBoundaries: [0, 5, 6],
              hardBreaks: [6],
              nativeSoftBreaks: [],
              atomicSpanBoundaries: [0, 5],
              clusterViolationOffsets: [],
            },
            complexShapeCounters: {
              bidiRunCount: 1,
              emojiClusterCount: 0,
              complexClusterCount: 0,
              clusterViolationCount: 0,
            },
            lineDiagnostics: [
              {
                textStart: 0,
                textEnd: 5,
                textDirection: "auto",
                layoutEngine: "ios_core_text",
                heightMetricSource: "platform_text_engine_metrics",
                driftKinds: [],
                clusterViolationOffsets: [],
              },
            ],
          },
        },
      ],
    ),
    layoutRichParagraphLines: jest.fn(
      (_preparedId: number, request: { left: number }) => [
        {
          lineCount: 1,
          height: 40,
          maxLineWidth: 120,
          lines: [
            {
              textStart: 0,
              textEnd: 6,
              top: 0,
              left: request.left,
              width: 120,
              height: 40,
              ascent: -28,
              descent: 12,
            },
          ],
          boxFrames: [
            {
              boxId: "avatar",
              paragraphIndex: 0,
              lineIndex: 0,
              textStart: 5,
              textEnd: 6,
              left: request.left + 44,
              top: 4,
              width: 24,
              height: 24,
              baseline: 28,
              accessibilityLabel: "Avatar badge",
              accessibilityHint: "Inline box",
              accessibilityRole: "image",
            },
          ],
          diagnostics: {
            normalizedRequest: request,
            ruleLayer: "pretext_native_rules",
            canvasPixelParityTarget: false,
            textDirection: "auto",
            layoutEngine: "ios_core_text",
            heightMetricSource: "platform_text_engine_metrics",
            driftKinds: ["algorithm_rule_drift", "line_break_strategy_drift"],
            heightMetricDrivers: [
              "font_metrics",
              "explicit_line_height",
              "fallback_font",
              "emoji_fallback",
              "locale",
              "include_font_padding",
              "line_break_strategy",
            ],
            breakTable: {
              hardBreaks: [],
              nativeSoftBreaks: [],
              graphemeBoundaries: [0, 1, 2, 3, 4, 5, 6],
              atomicSpans: [
                {
                  textStart: 5,
                  textEnd: 6,
                  source: "inline_box",
                },
              ],
            },
            boundaryMap: {
              utf16Length: 6,
              graphemeBoundaries: [0, 1, 2, 3, 4, 5, 6],
              runBoundaries: [0, 6],
              hardBreaks: [],
              nativeSoftBreaks: [],
              atomicSpanBoundaries: [5, 6],
              clusterViolationOffsets: [],
            },
            complexShapeCounters: {
              bidiRunCount: 1,
              emojiClusterCount: 0,
              complexClusterCount: 0,
              clusterViolationCount: 0,
            },
            lineDiagnostics: [
              {
                textStart: 0,
                textEnd: 6,
                textDirection: "auto",
                layoutEngine: "ios_core_text",
                heightMetricSource: "platform_text_engine_metrics",
                driftKinds: [],
                clusterViolationOffsets: [],
              },
            ],
          },
        },
      ],
    ),
    hitTestPreparedTextPosition: jest.fn(
      (
        _preparedId: number,
        paragraphIndex: number,
        request: { left: number },
        x: number,
        y: number,
      ) => ({
        paragraphIndex,
        lineIndex: 0,
        offset: 3,
        lineTextStart: 0,
        lineTextEnd: 6,
        x,
        y,
        layoutEngine: request.left === 12 ? "ios_core_text" : "unknown",
        heightMetricSource: "platform_text_engine_metrics",
      }),
    ),
    layoutPreparedTextSelectionRects: jest.fn(
      (_preparedId: number, range: { paragraphIndex: number }) => [
        {
          paragraphIndex: range.paragraphIndex,
          lineIndex: 0,
          textStart: 0,
          textEnd: 6,
          left: 12,
          top: 0,
          width: 96,
          height: 40,
          layoutEngine: "ios_core_text",
          heightMetricSource: "platform_text_engine_metrics",
        },
      ],
    ),
    selectAllPreparedText: jest.fn(
      (_preparedId: number, paragraphIndex: number) => ({
        paragraphIndex,
        textStart: 0,
        textEnd: 10,
      }),
    ),
    getPreparedTextSelection: jest.fn(() => "alpha"),
    copyPreparedTextSelection: jest.fn(() => "alpha"),
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
  copyPreparedTextSelection,
  createParagraphLayoutRequest,
  createParagraphLineCursor,
  getPreparedTextSelection,
  hitTestPreparedTextPosition,
  layoutPreparedTextSelectionRects,
  layoutParagraphLines,
  layoutParagraphLinesWithDiagnostics,
  layoutParagraphLinesWithRequest,
  layoutParagraphs,
  layoutParagraphsWithRequest,
  layoutParagraphsMetadata,
  layoutParagraphsMetadataWithRequest,
  layoutPreparedBenchmarkCorpus,
  layoutRichParagraphLines,
  measure,
  measureBatch,
  nextParagraphLine,
  ParagraphEngine,
  PreparedParagraphLinesView,
  PreparedParagraphText,
  PreparedParagraphView,
  PreparedParagraphsView,
  prepareInlineParagraphs,
  prepareInlineParagraphsWithStats,
  prepareParagraphs,
  prepareParagraphsWithStats,
  prepareBenchmarkCorpus,
  selectAllPreparedText,
  releaseParagraphLineCursor,
  releaseParagraphs,
  releasePreparedBenchmarkCorpus,
  usePreparedInlineParagraphs,
  usePreparedParagraphs,
} from "../index";

const nativeParagraphEngineMock = jest.mocked(NitroModules.createHybridObject)
  .mock.results[0]?.value as ReturnType<typeof mockCreateParagraphEngine>;

describe("react-native-nitro-pretext", () => {
  it("exports renderer surfaces", () => {
    expect(PreparedParagraphView).toBeDefined();
    expect(PreparedParagraphsView).toBeDefined();
    expect(PreparedParagraphLinesView).toBeDefined();
    expect(PreparedParagraphText).toBeDefined();
    expect(usePreparedParagraphs).toBeDefined();
    expect(usePreparedInlineParagraphs).toBeDefined();
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
            {
              kind: "box",
              boxId: "avatar",
              width: 24,
              height: 24,
              baseline: 18,
              breakBehavior: "never",
              accessibilityLabel: "Avatar badge",
              accessibilityHint: "Inline box",
              accessibilityRole: "image",
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
          {
            kind: "box",
            boxId: "avatar",
            width: 24,
            height: 24,
            baseline: 18,
            breakBehavior: "never",
            accessibilityLabel: "Avatar badge",
            accessibilityHint: "Inline box",
            accessibilityRole: "image",
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

  it("forwards diagnostic layout calls with pretext-native rule traces", () => {
    const result = layoutParagraphLinesWithDiagnostics(7, 280, {
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
    const expectedRequest = {
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
    };

    expect(
      nativeParagraphEngineMock.layoutParagraphLinesWithDiagnostics.mock.calls.at(
        -1,
      ),
    ).toEqual([7, expectedRequest]);
    expect(result[0]?.diagnostics).toMatchObject({
      normalizedRequest: expectedRequest,
      ruleLayer: "pretext_native_rules",
      canvasPixelParityTarget: false,
      textDirection: "auto",
      heightMetricSource: "platform_text_engine_metrics",
      driftKinds: ["algorithm_rule_drift", "line_break_strategy_drift"],
      breakTable: {
        hardBreaks: [
          {
            offset: 6,
            kind: "hard_break",
          },
        ],
        nativeSoftBreaks: [],
        graphemeBoundaries: [0, 1, 2, 3, 4, 5, 6],
        atomicSpans: [
          {
            textStart: 0,
            textEnd: 5,
          },
        ],
      },
      boundaryMap: {
        utf16Length: 6,
        graphemeBoundaries: [0, 1, 2, 3, 4, 5, 6],
        runBoundaries: [0, 5, 6],
        hardBreaks: [6],
        nativeSoftBreaks: [],
        atomicSpanBoundaries: [0, 5],
        clusterViolationOffsets: [],
      },
      complexShapeCounters: {
        bidiRunCount: 1,
        emojiClusterCount: 0,
        complexClusterCount: 0,
        clusterViolationCount: 0,
      },
      lineDiagnostics: [
        {
          textStart: 0,
          textEnd: 5,
          textDirection: "auto",
          layoutEngine: "ios_core_text",
          heightMetricSource: "platform_text_engine_metrics",
          clusterViolationOffsets: [],
        },
      ],
    });
  });

  it("forwards rich layout calls with inline box frames", () => {
    const result = layoutRichParagraphLines(13, 280, {
      left: 12,
    });

    expect(
      nativeParagraphEngineMock.layoutRichParagraphLines.mock.calls.at(-1),
    ).toEqual([
      13,
      {
        width: 280,
        left: 12,
        whiteSpace: "normal",
        wordBreak: "normal",
        shapeSlices: [],
      },
    ]);
    expect(result[0]?.boxFrames).toEqual([
      {
        boxId: "avatar",
        paragraphIndex: 0,
        lineIndex: 0,
        textStart: 5,
        textEnd: 6,
        left: 56,
        top: 4,
        width: 24,
        height: 24,
        baseline: 28,
        accessibilityLabel: "Avatar badge",
        accessibilityHint: "Inline box",
        accessibilityRole: "image",
      },
    ]);
    expect(result[0]?.diagnostics.breakTable.atomicSpans).toEqual([
      {
        textStart: 5,
        textEnd: 6,
        source: "inline_box",
      },
    ]);
    expect(result[0]?.diagnostics.complexShapeCounters).toMatchObject({
      bidiRunCount: 1,
      emojiClusterCount: 0,
      complexClusterCount: 0,
      clusterViolationCount: 0,
    });
  });

  it("forwards prepared selection and hit-test calls", () => {
    const request = createParagraphLayoutRequest(280, { left: 12 });
    const range = {
      paragraphIndex: 0,
      textStart: 0,
      textEnd: 6,
    };

    expect(hitTestPreparedTextPosition(7, 0, request, 32, 10)).toEqual({
      paragraphIndex: 0,
      lineIndex: 0,
      offset: 3,
      lineTextStart: 0,
      lineTextEnd: 6,
      x: 32,
      y: 10,
      layoutEngine: "ios_core_text",
      heightMetricSource: "platform_text_engine_metrics",
    });
    expect(layoutPreparedTextSelectionRects(7, range, request)).toEqual([
      {
        paragraphIndex: 0,
        lineIndex: 0,
        textStart: 0,
        textEnd: 6,
        left: 12,
        top: 0,
        width: 96,
        height: 40,
        layoutEngine: "ios_core_text",
        heightMetricSource: "platform_text_engine_metrics",
      },
    ]);
    expect(selectAllPreparedText(7, 0)).toEqual({
      paragraphIndex: 0,
      textStart: 0,
      textEnd: 10,
    });
    expect(getPreparedTextSelection(7, range)).toBe("alpha");
    expect(copyPreparedTextSelection(7, range)).toBe("alpha");

    expect(
      nativeParagraphEngineMock.hitTestPreparedTextPosition.mock.calls.at(-1),
    ).toEqual([7, 0, request, 32, 10]);
    expect(
      nativeParagraphEngineMock.layoutPreparedTextSelectionRects.mock.calls.at(
        -1,
      ),
    ).toEqual([7, range, request]);
    expect(
      nativeParagraphEngineMock.selectAllPreparedText.mock.calls.at(-1),
    ).toEqual([7, 0]);
    expect(
      nativeParagraphEngineMock.getPreparedTextSelection.mock.calls.at(-1),
    ).toEqual([7, range]);
    expect(
      nativeParagraphEngineMock.copyPreparedTextSelection.mock.calls.at(-1),
    ).toEqual([7, range]);
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

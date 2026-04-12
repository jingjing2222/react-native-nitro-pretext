import type {
  InlineSegment,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphLayoutRequest,
  LaidOutParagraphLines,
  LaidOutParagraph,
  LaidOutParagraphMetrics,
  ParagraphLineRange,
  ParagraphShapeSlice,
  ParagraphStyle,
  PreparedParagraphState,
  PreparedParagraphResult,
} from "./Pretext.nitro";
import type { Pretext } from "./PublicTypes";

const UNSUPPORTED_PLATFORM_ERROR =
  "'react-native-nitro-pretext' is only supported on iOS and Android.";

export const ParagraphEngine: Pretext = {
  name: "Pretext",
  equals(_other) {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  dispose() {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  measure(_text: string, _fontFamily: string, _fontSize: number): number {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  measureBatch(
    _texts: string[],
    _fontFamily: string,
    _fontSize: number,
  ): number[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  prepareParagraphs(
    _texts: string[],
    _style: ParagraphStyle,
  ): PreparedParagraphState {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  prepareInlineParagraphs(
    _paragraphs: InlineSegment[][],
    _style: ParagraphStyle,
  ): PreparedParagraphState {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  prepareParagraphsWithStats(
    _texts: string[],
    _style: ParagraphStyle,
  ): PreparedParagraphResult {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  prepareInlineParagraphsWithStats(
    _paragraphs: InlineSegment[][],
    _style: ParagraphStyle,
  ): PreparedParagraphResult {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphs(_preparedId: number, _width: number): LaidOutParagraph[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphsMetadata(
    _preparedId: number,
    _width: number,
  ): LaidOutParagraphMetrics[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphLines(
    _preparedId: number,
    _width: number,
  ): LaidOutParagraphLines[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphsWithRequest(
    _preparedId: number,
    _request: ParagraphLayoutRequest,
  ): LaidOutParagraph[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphsMetadataWithRequest(
    _preparedId: number,
    _request: ParagraphLayoutRequest,
  ): LaidOutParagraphMetrics[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphLinesWithRequest(
    _preparedId: number,
    _request: ParagraphLayoutRequest,
  ): LaidOutParagraphLines[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  createParagraphLineCursor(
    _preparedId: number,
    _paragraphIndex: number,
    _request: ParagraphLayoutRequest,
  ): ParagraphLineCursorState {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  nextParagraphLine(_cursorId: number): ParagraphLineCursorStep {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  releaseParagraphLineCursor(_cursorId: number): void {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  releaseParagraphs(_preparedId: number): void {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
};
export const TextMeasure = ParagraphEngine;

export function createParagraphLayoutRequest(
  width: number,
  overrides: Partial<ParagraphLayoutRequest> = {},
): ParagraphLayoutRequest {
  return {
    width,
    left: overrides.left ?? 0,
    whiteSpace: overrides.whiteSpace ?? "normal",
    wordBreak: overrides.wordBreak ?? "normal",
    shapeSlices: overrides.shapeSlices ?? [],
  };
}

export function measure(
  text: string,
  fontFamily: string,
  fontSize: number,
): number {
  return TextMeasure.measure(text, fontFamily, fontSize);
}

export function measureBatch(
  texts: string[],
  fontFamily: string,
  fontSize: number,
): number[] {
  return ParagraphEngine.measureBatch(texts, fontFamily, fontSize);
}

export function prepareParagraphs(
  texts: string[],
  style: ParagraphStyle,
): PreparedParagraphState {
  return ParagraphEngine.prepareParagraphs(texts, style);
}

export function prepareInlineParagraphs(
  paragraphs: InlineSegment[][],
  style: ParagraphStyle,
): PreparedParagraphState {
  return ParagraphEngine.prepareInlineParagraphs(paragraphs, style);
}

export function prepareParagraphsWithStats(
  texts: string[],
  style: ParagraphStyle,
): PreparedParagraphResult {
  return ParagraphEngine.prepareParagraphsWithStats(texts, style);
}

export function prepareInlineParagraphsWithStats(
  paragraphs: InlineSegment[][],
  style: ParagraphStyle,
): PreparedParagraphResult {
  return ParagraphEngine.prepareInlineParagraphsWithStats(paragraphs, style);
}

export function layoutParagraphs(
  preparedId: number,
  width: number,
): LaidOutParagraph[] {
  return ParagraphEngine.layoutParagraphs(preparedId, width);
}

export function layoutParagraphsMetadata(
  preparedId: number,
  width: number,
): LaidOutParagraphMetrics[] {
  return ParagraphEngine.layoutParagraphsMetadata(preparedId, width);
}

export function layoutParagraphLines(
  preparedId: number,
  width: number,
): LaidOutParagraphLines[] {
  return ParagraphEngine.layoutParagraphLines(preparedId, width);
}

export function layoutParagraphsWithRequest(
  preparedId: number,
  request: ParagraphLayoutRequest,
): LaidOutParagraph[] {
  return ParagraphEngine.layoutParagraphsWithRequest(preparedId, request);
}

export function layoutParagraphsMetadataWithRequest(
  preparedId: number,
  request: ParagraphLayoutRequest,
): LaidOutParagraphMetrics[] {
  return ParagraphEngine.layoutParagraphsMetadataWithRequest(
    preparedId,
    request,
  );
}

export function layoutParagraphLinesWithRequest(
  preparedId: number,
  request: ParagraphLayoutRequest,
): LaidOutParagraphLines[] {
  return ParagraphEngine.layoutParagraphLinesWithRequest(preparedId, request);
}

export function createParagraphLineCursor(
  preparedId: number,
  paragraphIndex: number,
  request: ParagraphLayoutRequest,
): ParagraphLineCursorState {
  return ParagraphEngine.createParagraphLineCursor(
    preparedId,
    paragraphIndex,
    request,
  );
}

export function nextParagraphLine(cursorId: number): ParagraphLineCursorStep {
  return ParagraphEngine.nextParagraphLine(cursorId);
}

export function releaseParagraphLineCursor(cursorId: number): void {
  ParagraphEngine.releaseParagraphLineCursor(cursorId);
}

export function releaseParagraphs(preparedId: number): void {
  ParagraphEngine.releaseParagraphs(preparedId);
}

export function prepareBenchmarkCorpus(
  texts: string[],
  fontFamily: string,
  fontSize: number,
): PreparedParagraphState {
  return prepareParagraphs(texts, {
    fontFamily,
    fontSize,
    lineHeight: fontSize,
    letterSpacing: 0,
    locale: "",
  });
}

export function layoutPreparedBenchmarkCorpus(
  preparedId: number,
  width: number,
): LaidOutParagraph[] {
  return layoutParagraphs(preparedId, width);
}

export function releasePreparedBenchmarkCorpus(preparedId: number): void {
  releaseParagraphs(preparedId);
}

export default ParagraphEngine;

export type {
  InlineSegment,
  LaidOutParagraphLines,
  ParagraphLayoutRequest,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphLineRange,
  ParagraphShapeSlice,
};

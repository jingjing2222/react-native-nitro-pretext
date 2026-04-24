import type {
  InlineSegment,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphMetrics,
  LaidOutRichParagraphLines,
  ParagraphBoundaryMap,
  ParagraphComplexShapeCounters,
  ParagraphLayoutRequest,
  ParagraphLineRange,
  ParagraphShapeSlice,
  ParagraphStyle,
  PreparedParagraphResult,
  PreparedParagraphState,
  PrepareParagraphStats,
} from "./Pretext.nitro";
import type { Pretext } from "./PublicTypes";

const UNSUPPORTED_PLATFORM_ERROR =
  "'react-native-nitro-pretext' is only supported on iOS and Android.";

function unsupported(): never {
  throw new Error(UNSUPPORTED_PLATFORM_ERROR);
}

export const ParagraphEngine: Pretext = {
  name: "Pretext",
  equals(_other) {
    unsupported();
  },
  dispose() {
    unsupported();
  },
  prepareParagraphsWithStats(
    _texts: string[],
    _style: ParagraphStyle,
  ): PreparedParagraphResult {
    unsupported();
  },
  prepareInlineParagraphsWithStats(
    _paragraphs: InlineSegment[][],
    _style: ParagraphStyle,
  ): PreparedParagraphResult {
    unsupported();
  },
  layoutParagraphsMetadataWithRequest(
    _preparedId: number,
    _request: ParagraphLayoutRequest,
  ): LaidOutParagraphMetrics[] {
    unsupported();
  },
  layoutParagraphLinesWithRequest(
    _preparedId: number,
    _request: ParagraphLayoutRequest,
  ): LaidOutParagraphLines[] {
    unsupported();
  },
  layoutParagraphLinesWithDiagnostics(
    _preparedId: number,
    _request: ParagraphLayoutRequest,
  ): LaidOutParagraphLinesWithDiagnostics[] {
    unsupported();
  },
  layoutRichParagraphLines(
    _preparedId: number,
    _request: ParagraphLayoutRequest,
  ): LaidOutRichParagraphLines[] {
    unsupported();
  },
  releaseParagraphs(_preparedId: number): void {
    unsupported();
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

export function layoutParagraphLinesWithDiagnostics(
  preparedId: number,
  request: ParagraphLayoutRequest,
): LaidOutParagraphLinesWithDiagnostics[] {
  return ParagraphEngine.layoutParagraphLinesWithDiagnostics(
    preparedId,
    request,
  );
}

export function layoutRichParagraphLines(
  preparedId: number,
  request: ParagraphLayoutRequest,
): LaidOutRichParagraphLines[] {
  return ParagraphEngine.layoutRichParagraphLines(preparedId, request);
}

export function releaseParagraphs(preparedId: number): void {
  ParagraphEngine.releaseParagraphs(preparedId);
}

export default ParagraphEngine;

export type {
  InlineSegment,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphMetrics,
  LaidOutRichParagraphLines,
  ParagraphBoundaryMap,
  ParagraphComplexShapeCounters,
  ParagraphLayoutRequest,
  ParagraphLineRange,
  ParagraphShapeSlice,
  ParagraphStyle,
  PreparedParagraphResult,
  PreparedParagraphState,
  PrepareParagraphStats,
};

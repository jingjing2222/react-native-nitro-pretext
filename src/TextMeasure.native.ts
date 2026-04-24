import { NitroModules } from "react-native-nitro-modules";
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
  Pretext as NitroPretext,
} from "./Pretext.nitro";
import type { Pretext } from "./PublicTypes";
import { serializeInlineParagraphs } from "./inlineParagraphSegments";

const NativeParagraphEngine =
  NitroModules.createHybridObject<NitroPretext>("Pretext");

export const ParagraphEngine: Pretext = {
  get name() {
    return NativeParagraphEngine.name;
  },
  equals(other) {
    const candidate =
      other === ParagraphEngine
        ? NativeParagraphEngine
        : (other as NitroPretext);

    return NativeParagraphEngine.equals(candidate);
  },
  dispose() {
    NativeParagraphEngine.dispose();
  },
  prepareParagraphsWithStats(texts, style) {
    return NativeParagraphEngine.prepareParagraphsWithStats(texts, style);
  },
  prepareInlineParagraphsWithStats(paragraphs, style) {
    return NativeParagraphEngine.prepareInlineParagraphSegmentsWithStats(
      serializeInlineParagraphs(paragraphs),
      style,
    );
  },
  layoutParagraphsMetadataWithRequest(preparedId, request) {
    return NativeParagraphEngine.layoutParagraphsMetadataWithRequest(
      preparedId,
      request,
    );
  },
  layoutParagraphLinesWithRequest(preparedId, request) {
    return NativeParagraphEngine.layoutParagraphLinesWithRequest(
      preparedId,
      request,
    );
  },
  layoutParagraphLinesWithDiagnostics(preparedId, request) {
    return NativeParagraphEngine.layoutParagraphLinesWithDiagnostics(
      preparedId,
      request,
    );
  },
  layoutRichParagraphLines(preparedId, request) {
    return NativeParagraphEngine.layoutRichParagraphLines(preparedId, request);
  },
  releaseParagraphs(preparedId) {
    NativeParagraphEngine.releaseParagraphs(preparedId);
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

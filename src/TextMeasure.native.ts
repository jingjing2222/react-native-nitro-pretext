import { NitroModules } from "react-native-nitro-modules";
import type {
  InlineSegment,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphLayoutRequest,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphLines,
  LaidOutParagraph,
  LaidOutParagraphMetrics,
  ParagraphLineRange,
  ParagraphShapeSlice,
  ParagraphStyle,
  Pretext as NitroPretext,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
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
  measure(text, fontFamily, fontSize) {
    return NativeParagraphEngine.measure(text, fontFamily, fontSize);
  },
  measureBatch(texts, fontFamily, fontSize) {
    return NativeParagraphEngine.measureBatch(texts, fontFamily, fontSize);
  },
  prepareParagraphs(texts, style) {
    return NativeParagraphEngine.prepareParagraphs(texts, style);
  },
  prepareInlineParagraphs(paragraphs, style) {
    return NativeParagraphEngine.prepareInlineParagraphSegments(
      serializeInlineParagraphs(paragraphs),
      style,
    );
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
  layoutParagraphs(preparedId, width) {
    return NativeParagraphEngine.layoutParagraphs(preparedId, width);
  },
  layoutParagraphsMetadata(preparedId, width) {
    return NativeParagraphEngine.layoutParagraphsMetadata(preparedId, width);
  },
  layoutParagraphLines(preparedId, width) {
    return NativeParagraphEngine.layoutParagraphLines(preparedId, width);
  },
  layoutParagraphsWithRequest(preparedId, request) {
    return NativeParagraphEngine.layoutParagraphsWithRequest(
      preparedId,
      request,
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
  createParagraphLineCursor(preparedId, paragraphIndex, request) {
    return NativeParagraphEngine.createParagraphLineCursor(
      preparedId,
      paragraphIndex,
      request,
    );
  },
  nextParagraphLine(cursorId) {
    return NativeParagraphEngine.nextParagraphLine(cursorId);
  },
  releaseParagraphLineCursor(cursorId) {
    NativeParagraphEngine.releaseParagraphLineCursor(cursorId);
  },
  releaseParagraphs(preparedId) {
    NativeParagraphEngine.releaseParagraphs(preparedId);
  },
};
export const TextMeasure = ParagraphEngine;

export function measure(
  text: string,
  fontFamily: string,
  fontSize: number,
): number {
  return ParagraphEngine.measure(text, fontFamily, fontSize);
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

export function layoutParagraphLinesWithDiagnostics(
  preparedId: number,
  widthOrRequest: number | ParagraphLayoutRequest,
  overrides: Partial<ParagraphLayoutRequest> = {},
): LaidOutParagraphLinesWithDiagnostics[] {
  const request =
    typeof widthOrRequest === "number"
      ? createParagraphLayoutRequest(widthOrRequest, overrides)
      : widthOrRequest;

  return ParagraphEngine.layoutParagraphLinesWithDiagnostics(
    preparedId,
    request,
  );
}

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

export type {
  InlineSegment,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphLines,
  LaidOutParagraph,
  LaidOutParagraphMetrics,
  ParagraphLineRange,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphLayoutRequest,
  ParagraphShapeSlice,
  ParagraphStyle,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
};

export function releasePreparedBenchmarkCorpus(preparedId: number): void {
  releaseParagraphs(preparedId);
}

export default ParagraphEngine;

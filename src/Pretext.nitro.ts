import type { HybridObject } from "react-native-nitro-modules";

export type ParagraphTextDirection = "auto" | "ltr" | "rtl";

export interface ParagraphStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  locale: string;
  fontWeight?: string;
  fontStyle?: string;
  includeFontPadding?: boolean;
  textDirection?: ParagraphTextDirection;
}

export interface PrepareParagraphStats {
  tokenizeMs: number;
  measurementMs: number;
  buildPreparedMs: number;
  totalMs: number;
  paragraphCount: number;
  totalTokenCount: number;
  uniqueTokenCount: number;
}

export interface InlineSegment {
  text: string;
  breakBehavior: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  locale?: string;
  fontWeight?: string;
  fontStyle?: string;
}

export interface InlineParagraphSegments {
  segments: InlineSegment[];
  paragraphSegmentOffsets: number[];
}

export interface PreparedParagraphState {
  id: number;
  paragraphCount: number;
}

export interface PreparedParagraphResult {
  prepared: PreparedParagraphState;
  stats: PrepareParagraphStats;
}

export interface ParagraphLineRange {
  textStart: number;
  textEnd: number;
  top: number;
  left: number;
  width: number;
  height: number;
  ascent: number;
  descent: number;
}

export interface ParagraphShapeSlice {
  top: number;
  height: number;
  left: number;
  width: number;
}

export interface ParagraphLayoutRequest {
  width: number;
  left: number;
  whiteSpace: string;
  wordBreak: string;
  shapeSlices: ParagraphShapeSlice[];
}

export interface LaidOutParagraph {
  brokenText: string;
  lineCount: number;
  height: number;
  maxLineWidth: number;
}

export interface LaidOutParagraphMetrics {
  lineCount: number;
  height: number;
  maxLineWidth: number;
}

export interface LaidOutParagraphLines {
  lineCount: number;
  height: number;
  maxLineWidth: number;
  lines: ParagraphLineRange[];
}

export interface ParagraphLineCursorState {
  id: number;
  paragraphIndex: number;
  lineCount: number;
  height: number;
}

export interface ParagraphLineCursorStep {
  done: boolean;
  textStart: number;
  textEnd: number;
  top: number;
  left: number;
  width: number;
  height: number;
  ascent: number;
  descent: number;
}

export interface Pretext extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  measure(text: string, fontFamily: string, fontSize: number): number;
  measureBatch(texts: string[], fontFamily: string, fontSize: number): number[];
  prepareParagraphs(
    texts: string[],
    style: ParagraphStyle,
  ): PreparedParagraphState;
  prepareInlineParagraphSegments(
    paragraphsPayload: string,
    style: ParagraphStyle,
  ): PreparedParagraphState;
  prepareParagraphsWithStats(
    texts: string[],
    style: ParagraphStyle,
  ): PreparedParagraphResult;
  prepareInlineParagraphSegmentsWithStats(
    paragraphsPayload: string,
    style: ParagraphStyle,
  ): PreparedParagraphResult;
  layoutParagraphs(preparedId: number, width: number): LaidOutParagraph[];
  layoutParagraphsMetadata(
    preparedId: number,
    width: number,
  ): LaidOutParagraphMetrics[];
  layoutParagraphLines(
    preparedId: number,
    width: number,
  ): LaidOutParagraphLines[];
  layoutParagraphsWithRequest(
    preparedId: number,
    request: ParagraphLayoutRequest,
  ): LaidOutParagraph[];
  layoutParagraphsMetadataWithRequest(
    preparedId: number,
    request: ParagraphLayoutRequest,
  ): LaidOutParagraphMetrics[];
  layoutParagraphLinesWithRequest(
    preparedId: number,
    request: ParagraphLayoutRequest,
  ): LaidOutParagraphLines[];
  createParagraphLineCursor(
    preparedId: number,
    paragraphIndex: number,
    request: ParagraphLayoutRequest,
  ): ParagraphLineCursorState;
  nextParagraphLine(cursorId: number): ParagraphLineCursorStep;
  releaseParagraphLineCursor(cursorId: number): void;
  releaseParagraphs(preparedId: number): void;
}

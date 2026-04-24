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
  kind?: string;
  text?: string;
  breakBehavior: string;
  boxId?: string;
  width?: number;
  height?: number;
  baseline?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  locale?: string;
  fontWeight?: string;
  fontStyle?: string;
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

export interface InlineBoxFrame {
  boxId: string;
  paragraphIndex: number;
  lineIndex: number;
  textStart: number;
  textEnd: number;
  left: number;
  top: number;
  width: number;
  height: number;
  baseline: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

export interface ParagraphBreakOpportunity {
  offset: number;
  kind: string;
  source: string;
}

export interface ParagraphAtomicSpan {
  textStart: number;
  textEnd: number;
  source: string;
}

export interface ParagraphBreakTable {
  hardBreaks: ParagraphBreakOpportunity[];
  nativeSoftBreaks: ParagraphBreakOpportunity[];
  graphemeBoundaries: number[];
  atomicSpans: ParagraphAtomicSpan[];
}

export interface ParagraphBoundaryMap {
  utf16Length: number;
  graphemeBoundaries: number[];
  runBoundaries: number[];
  hardBreaks: number[];
  nativeSoftBreaks: number[];
  atomicSpanBoundaries: number[];
  clusterViolationOffsets: number[];
}

export interface ParagraphComplexShapeCounters {
  bidiRunCount: number;
  emojiClusterCount: number;
  complexClusterCount: number;
  clusterViolationCount: number;
}

export interface ParagraphLineDiagnostics {
  textStart: number;
  textEnd: number;
  textDirection: ParagraphTextDirection;
  layoutEngine: string;
  heightMetricSource: string;
  fallbackReason?: string;
  driftKinds: string[];
  clusterViolationOffsets: number[];
}

export interface ParagraphLayoutDiagnostics {
  normalizedRequest: ParagraphLayoutRequest;
  ruleLayer: string;
  canvasPixelParityTarget: boolean;
  textDirection: ParagraphTextDirection;
  layoutEngine: string;
  heightMetricSource: string;
  fallbackReason?: string;
  driftKinds: string[];
  heightMetricDrivers: string[];
  breakTable: ParagraphBreakTable;
  boundaryMap: ParagraphBoundaryMap;
  complexShapeCounters: ParagraphComplexShapeCounters;
  lineDiagnostics: ParagraphLineDiagnostics[];
}

export interface LaidOutParagraphLinesWithDiagnostics {
  lineCount: number;
  height: number;
  maxLineWidth: number;
  lines: ParagraphLineRange[];
  diagnostics: ParagraphLayoutDiagnostics;
}

export interface LaidOutRichParagraphLines {
  lineCount: number;
  height: number;
  maxLineWidth: number;
  lines: ParagraphLineRange[];
  boxFrames: InlineBoxFrame[];
  diagnostics: ParagraphLayoutDiagnostics;
}

export interface Pretext extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  prepareParagraphsWithStats(
    texts: string[],
    style: ParagraphStyle,
  ): PreparedParagraphResult;
  prepareInlineParagraphSegmentsWithStats(
    paragraphsPayload: string,
    style: ParagraphStyle,
  ): PreparedParagraphResult;
  layoutParagraphsMetadataWithRequest(
    preparedId: number,
    request: ParagraphLayoutRequest,
  ): LaidOutParagraphMetrics[];
  layoutParagraphLinesWithRequest(
    preparedId: number,
    request: ParagraphLayoutRequest,
  ): LaidOutParagraphLines[];
  layoutParagraphLinesWithDiagnostics(
    preparedId: number,
    request: ParagraphLayoutRequest,
  ): LaidOutParagraphLinesWithDiagnostics[];
  layoutRichParagraphLines(
    preparedId: number,
    request: ParagraphLayoutRequest,
  ): LaidOutRichParagraphLines[];
  releaseParagraphs(preparedId: number): void;
}

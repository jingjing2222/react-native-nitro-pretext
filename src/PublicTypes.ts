import type {
  InlineSegment,
  LaidOutParagraph,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphMetrics,
  ParagraphAtomicSpan,
  ParagraphBreakOpportunity,
  ParagraphBreakTable,
  ParagraphLayoutDiagnostics,
  ParagraphLayoutRequest,
  ParagraphLineDiagnostics,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphStyle,
  ParagraphTextDirection,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
  Pretext as NitroPretext,
} from "./Pretext.nitro";

export interface Pretext extends Omit<
  NitroPretext,
  "prepareInlineParagraphSegments" | "prepareInlineParagraphSegmentsWithStats"
> {
  prepareInlineParagraphs(
    paragraphs: InlineSegment[][],
    style: ParagraphStyle,
  ): PreparedParagraphState;
  prepareInlineParagraphsWithStats(
    paragraphs: InlineSegment[][],
    style: ParagraphStyle,
  ): PreparedParagraphResult;
}

export type {
  InlineSegment,
  LaidOutParagraph,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphMetrics,
  ParagraphAtomicSpan,
  ParagraphBreakOpportunity,
  ParagraphBreakTable,
  ParagraphLayoutDiagnostics,
  ParagraphLayoutRequest,
  ParagraphLineDiagnostics,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphStyle,
  ParagraphTextDirection,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
};

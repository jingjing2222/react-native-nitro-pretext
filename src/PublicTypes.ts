import type {
  InlineSegment,
  InlineBoxFrame,
  LaidOutParagraph,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutRichParagraphLines,
  LaidOutParagraphMetrics,
  ParagraphAtomicSpan,
  ParagraphBoundaryMap,
  ParagraphBreakOpportunity,
  ParagraphBreakTable,
  ParagraphComplexShapeCounters,
  ParagraphLayoutDiagnostics,
  ParagraphLayoutRequest,
  ParagraphLineDiagnostics,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphStyle,
  ParagraphTextDirection,
  PreparedTextPosition,
  PreparedTextRange,
  PreparedTextSelectionRect,
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
  InlineBoxFrame,
  LaidOutParagraph,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutRichParagraphLines,
  LaidOutParagraphMetrics,
  ParagraphAtomicSpan,
  ParagraphBoundaryMap,
  ParagraphBreakOpportunity,
  ParagraphBreakTable,
  ParagraphComplexShapeCounters,
  ParagraphLayoutDiagnostics,
  ParagraphLayoutRequest,
  ParagraphLineDiagnostics,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphStyle,
  ParagraphTextDirection,
  PreparedTextPosition,
  PreparedTextRange,
  PreparedTextSelectionRect,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
};

import type {
  InlineSegment,
  LaidOutParagraph,
  LaidOutParagraphLines,
  LaidOutParagraphMetrics,
  ParagraphLayoutRequest,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphStyle,
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
  LaidOutParagraphMetrics,
  ParagraphLayoutRequest,
  ParagraphLineCursorState,
  ParagraphLineCursorStep,
  ParagraphStyle,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
};

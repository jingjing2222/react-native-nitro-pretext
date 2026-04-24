import type {
  InlineBoxFrame,
  InlineSegment,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphMetrics,
  LaidOutRichParagraphLines,
  ParagraphAtomicSpan,
  ParagraphBoundaryMap,
  ParagraphBreakOpportunity,
  ParagraphBreakTable,
  ParagraphComplexShapeCounters,
  ParagraphLayoutDiagnostics,
  ParagraphLayoutRequest,
  ParagraphLineDiagnostics,
  ParagraphStyle,
  ParagraphTextDirection,
  PreparedParagraphResult,
  PreparedParagraphState,
  PrepareParagraphStats,
  Pretext as NitroPretext,
} from "./Pretext.nitro";

type NativeLayoutPretext = Pick<
  NitroPretext,
  | "dispose"
  | "equals"
  | "layoutParagraphLinesWithDiagnostics"
  | "layoutParagraphLinesWithRequest"
  | "layoutParagraphsMetadataWithRequest"
  | "layoutRichParagraphLines"
  | "name"
  | "prepareParagraphsWithStats"
  | "releaseParagraphs"
>;

export interface Pretext extends NativeLayoutPretext {
  prepareInlineParagraphsWithStats(
    paragraphs: InlineSegment[][],
    style: ParagraphStyle,
  ): PreparedParagraphResult;
}

export type {
  InlineBoxFrame,
  InlineSegment,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphMetrics,
  LaidOutRichParagraphLines,
  ParagraphAtomicSpan,
  ParagraphBoundaryMap,
  ParagraphBreakOpportunity,
  ParagraphBreakTable,
  ParagraphComplexShapeCounters,
  ParagraphLayoutDiagnostics,
  ParagraphLayoutRequest,
  ParagraphLineDiagnostics,
  ParagraphStyle,
  ParagraphTextDirection,
  PreparedParagraphResult,
  PreparedParagraphState,
  PrepareParagraphStats,
};

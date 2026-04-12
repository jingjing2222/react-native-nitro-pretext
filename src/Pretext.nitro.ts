import type { HybridObject } from "react-native-nitro-modules";

export interface ParagraphStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
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
  prepareParagraphsWithStats(
    texts: string[],
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
  releaseParagraphs(preparedId: number): void;
}

import { NitroModules } from "react-native-nitro-modules";
import type {
  LaidOutParagraphLines,
  LaidOutParagraph,
  LaidOutParagraphMetrics,
  ParagraphLineRange,
  ParagraphStyle,
  Pretext,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
} from "./Pretext.nitro";

export const ParagraphEngine =
  NitroModules.createHybridObject<Pretext>("Pretext");
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

export function prepareParagraphsWithStats(
  texts: string[],
  style: ParagraphStyle,
): PreparedParagraphResult {
  return ParagraphEngine.prepareParagraphsWithStats(texts, style);
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
  });
}

export function layoutPreparedBenchmarkCorpus(
  preparedId: number,
  width: number,
): LaidOutParagraph[] {
  return layoutParagraphs(preparedId, width);
}

export type {
  LaidOutParagraphLines,
  LaidOutParagraph,
  LaidOutParagraphMetrics,
  ParagraphLineRange,
  ParagraphStyle,
  PrepareParagraphStats,
  PreparedParagraphResult,
  PreparedParagraphState,
};

export function releasePreparedBenchmarkCorpus(preparedId: number): void {
  releaseParagraphs(preparedId);
}

export default ParagraphEngine;

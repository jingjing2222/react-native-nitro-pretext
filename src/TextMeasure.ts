import type {
  LaidOutParagraphLines,
  LaidOutParagraph,
  LaidOutParagraphMetrics,
  ParagraphLineRange,
  ParagraphStyle,
  PreparedParagraphResult,
  PreparedParagraphState,
} from "./Pretext.nitro";

const UNSUPPORTED_PLATFORM_ERROR =
  "'react-native-nitro-pretext' is only supported on iOS and Android.";

export const ParagraphEngine = {
  measure(_text: string, _fontFamily: string, _fontSize: number): number {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  measureBatch(
    _texts: string[],
    _fontFamily: string,
    _fontSize: number,
  ): number[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  prepareParagraphs(
    _texts: string[],
    _style: ParagraphStyle,
  ): PreparedParagraphState {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  prepareParagraphsWithStats(
    _texts: string[],
    _style: ParagraphStyle,
  ): PreparedParagraphResult {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphs(_preparedId: number, _width: number): LaidOutParagraph[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphsMetadata(
    _preparedId: number,
    _width: number,
  ): LaidOutParagraphMetrics[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  layoutParagraphLines(
    _preparedId: number,
    _width: number,
  ): LaidOutParagraphLines[] {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
  releaseParagraphs(_preparedId: number): void {
    throw new Error(UNSUPPORTED_PLATFORM_ERROR);
  },
};
export const TextMeasure = ParagraphEngine;

export function measure(
  text: string,
  fontFamily: string,
  fontSize: number,
): number {
  return TextMeasure.measure(text, fontFamily, fontSize);
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

export function releasePreparedBenchmarkCorpus(preparedId: number): void {
  releaseParagraphs(preparedId);
}

export default ParagraphEngine;

export type { LaidOutParagraphLines, ParagraphLineRange };

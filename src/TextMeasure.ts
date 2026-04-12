const UNSUPPORTED_PLATFORM_ERROR =
  "'react-native-pretext' is only supported on iOS and Android.";

export const TextMeasure = {
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
};

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
  return TextMeasure.measureBatch(texts, fontFamily, fontSize);
}

export default TextMeasure;

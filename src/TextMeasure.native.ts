import { NitroModules } from "react-native-nitro-modules";
import type { Pretext } from "./Pretext.nitro";

export const TextMeasure = NitroModules.createHybridObject<Pretext>("Pretext");

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

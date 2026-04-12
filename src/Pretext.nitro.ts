import type { HybridObject } from "react-native-nitro-modules";

export interface Pretext extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  measure(text: string, fontFamily: string, fontSize: number): number;
  measureBatch(texts: string[], fontFamily: string, fontSize: number): number[];
}

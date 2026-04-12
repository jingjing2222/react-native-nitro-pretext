import { NitroModules } from "react-native-nitro-modules";
import type { Pretext } from "./Pretext.nitro";

const PretextHybridObject = NitroModules.createHybridObject<Pretext>("Pretext");

export function multiply(a: number, b: number): number {
  return PretextHybridObject.multiply(a, b);
}

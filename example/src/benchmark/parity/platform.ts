import { Platform } from "react-native";

import type { ParityPlatform } from "./types";

export function normalizeParityPlatform(): ParityPlatform {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    return Platform.OS;
  }

  return "unknown";
}

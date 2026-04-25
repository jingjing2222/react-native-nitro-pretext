import type { PretextStyle } from "react-native-nitro-pretext";

export type ParityCaseCategory =
  | "emoji"
  | "indic"
  | "japanese"
  | "korean-cjk"
  | "latin"
  | "rtl"
  | "style"
  | "style-cross"
  | "thai"
  | "whitespace";

export type ParityRnTextProps = {
  android_hyphenationFrequency?: "full" | "none" | "normal";
  lineBreakStrategyIOS?: "hangul-word" | "none" | "push-out" | "standard";
  textBreakStrategy?: "balanced" | "highQuality" | "simple";
};

export type ParityCase = {
  caseId: string;
  category: ParityCaseCategory;
  description: string;
  rnTextProps?: ParityRnTextProps;
  style: PretextStyle;
  text: string;
  width: number;
};

export type ParityLineGeometry = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type ParityLineSnapshot = {
  geometry: ParityLineGeometry;
  text: string;
};

export type ParityMismatchKind = "line-count" | "line-geometry" | "line-text";

export type ParityPlatform = "android" | "ios" | "unknown";

export type ParityFirstDiff = {
  field: "count" | "height" | "left" | "text" | "top" | "width";
  lineIndex: number | null;
  pretextValue: number | string;
  rnValue: number | string;
};

export type ParityMismatch = {
  caseId: string;
  category: ParityCaseCategory;
  firstDiff: ParityFirstDiff;
  kind: ParityMismatchKind;
  platform: ParityPlatform;
  pretextLines: ParityLineSnapshot[];
  rnLines: ParityLineSnapshot[];
  style: PretextStyle;
  width: number;
};

export type ParityCaseResult = {
  caseId: string;
  category: ParityCaseCategory;
  errorMessage: string | null;
  mismatches: ParityMismatch[];
  platform: ParityPlatform;
};

export type ParityFailedCaseResult = {
  caseId: string;
  category: ParityCaseCategory;
  errorMessage: string;
  platform: ParityPlatform;
};

export type ParityAutomationStatus =
  | "completed"
  | "failed"
  | "idle"
  | "running";

export type ParityAutomationReport = {
  caseCount: number;
  completedAt: string | null;
  completedCases: number;
  failedCaseResults: ParityFailedCaseResult[];
  failedCases: number;
  geometryTolerance: number;
  lineCountMismatches: number;
  lineGeometryMismatches: number;
  lineTextMismatches: number;
  mismatchCount: number;
  mismatches: ParityMismatch[];
  platform: ParityPlatform;
  screen: "benchmark/parity";
  status: ParityAutomationStatus;
};

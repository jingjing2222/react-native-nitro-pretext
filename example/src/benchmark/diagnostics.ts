import { Platform } from "react-native";

import type { BenchmarkMode } from "../relayoutBenchmark";
import type {
  BenchmarkDiagnostics,
  BenchmarkDriftKind,
  BenchmarkHeightDriftBucket,
  BenchmarkHeightMetricDriver,
  BenchmarkLayoutEngine,
  BenchmarkParityRole,
  BenchmarkPlatform,
  BenchmarkRendererKind,
} from "./types";

export const HEIGHT_METRIC_DRIVERS: BenchmarkHeightMetricDriver[] = [
  "font_metrics",
  "explicit_line_height",
  "fallback_font",
  "emoji_fallback",
  "locale",
  "include_font_padding",
  "line_break_strategy",
];

const EMPTY_HEIGHT_DRIFT_BUCKETS: Record<BenchmarkHeightDriftBucket, number> = {
  emoji_fallback: 0,
  explicit_line_height: 0,
  fallback_font: 0,
  font_metrics: 0,
  include_font_padding: 0,
  line_break_strategy: 0,
  locale: 0,
  unclassified: 0,
};

function normalizePlatform(platform: string): BenchmarkPlatform {
  if (platform === "android" || platform === "ios") {
    return platform;
  }

  return "unknown";
}

export function getBenchmarkPlatform(): BenchmarkPlatform {
  return normalizePlatform(Platform.OS);
}

export function getCanonicalPreparedLayoutEngine(
  platform: BenchmarkPlatform,
): BenchmarkLayoutEngine {
  if (platform === "android") {
    return "android_measured_text_line_breaker";
  }

  if (platform === "ios") {
    return "ios_core_text";
  }

  return "unknown";
}

function getRendererKind(mode: BenchmarkMode): BenchmarkRendererKind {
  if (mode === "baseline") {
    return "rn_text";
  }

  if (mode === "pretext-compute") {
    return "prepared_compute";
  }

  return "prepared_native_batch";
}

function getParityRole(mode: BenchmarkMode): BenchmarkParityRole {
  if (mode === "baseline") {
    return "rn_text_compat_oracle";
  }

  if (mode === "pretext-compute") {
    return "canonical_prepared_compute";
  }

  return "canonical_prepared_native_render";
}

function getLayoutEngine(
  mode: BenchmarkMode,
  platform: BenchmarkPlatform,
): BenchmarkLayoutEngine {
  if (mode === "baseline") {
    return "rn_text_compat";
  }

  return getCanonicalPreparedLayoutEngine(platform);
}

export function createBenchmarkDiagnostics(
  mode: BenchmarkMode,
  platform: BenchmarkPlatform = getBenchmarkPlatform(),
): BenchmarkDiagnostics {
  const parityRole = getParityRole(mode);

  return {
    driftKinds: [],
    heightDriftBuckets: { ...EMPTY_HEIGHT_DRIFT_BUCKETS },
    heightMetricDrivers: [...HEIGHT_METRIC_DRIVERS],
    heightMetricSource: "platform_text_engine_metrics",
    includeFontPadding: platform === "android" ? true : null,
    layoutEngine: getLayoutEngine(mode, platform),
    parityBucket: parityRole,
    parityRole,
    rendererKind: getRendererKind(mode),
  };
}

export function resolveBenchmarkDrift(args: {
  diagnostics: BenchmarkDiagnostics;
  lineTextParityMismatches: number;
  parityMismatches: number;
}): Pick<BenchmarkDiagnostics, "driftKinds" | "heightDriftBuckets"> {
  const driftKinds = new Set<BenchmarkDriftKind>();
  const heightDriftBuckets = { ...EMPTY_HEIGHT_DRIFT_BUCKETS };
  const hasLineCountDrift = args.parityMismatches > 0;
  const hasLineTextDrift = args.lineTextParityMismatches > 0;

  if (hasLineCountDrift) {
    driftKinds.add("height_metric_drift");
    heightDriftBuckets.unclassified = args.parityMismatches;
  }

  if (hasLineTextDrift) {
    driftKinds.add("algorithm_rule_drift");
  }

  if (
    (hasLineCountDrift || hasLineTextDrift) &&
    args.diagnostics.parityRole === "canonical_prepared_native_render"
  ) {
    driftKinds.add("renderer_drift");
  }

  if (
    (hasLineCountDrift || hasLineTextDrift) &&
    args.diagnostics.parityRole === "rn_text_compat_oracle"
  ) {
    driftKinds.add("compat_drift");
  }

  if (hasLineCountDrift && args.diagnostics.includeFontPadding === false) {
    driftKinds.add("padding_drift");
    heightDriftBuckets.include_font_padding = args.parityMismatches;
  }

  return {
    driftKinds: [...driftKinds],
    heightDriftBuckets,
  };
}

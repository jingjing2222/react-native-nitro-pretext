import { Platform } from "react-native";
import type { ParagraphLayoutDiagnostics } from "react-native-nitro-pretext";

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

function getRuntimeAndroidApiLevel(): number | null {
  if (Platform.OS !== "android") {
    return null;
  }

  const version = Platform.Version;
  if (typeof version === "number") {
    return version;
  }

  const parsed = Number.parseInt(version, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getCanonicalPreparedLayoutEngine(
  platform: BenchmarkPlatform,
  androidApiLevel: number | null = getRuntimeAndroidApiLevel(),
): BenchmarkLayoutEngine {
  if (platform === "android") {
    if (androidApiLevel !== null && androidApiLevel < 29) {
      return "android_static_layout_compat";
    }

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

  return "rn_text";
}

function getParityRole(mode: BenchmarkMode): BenchmarkParityRole {
  if (mode === "baseline") {
    return "rn_text_compat_oracle";
  }

  if (mode === "pretext-compute" || mode === "pretext-render") {
    return "canonical_prepared_compute";
  }

  return "fallback_legacy";
}

function getLayoutEngine(
  mode: BenchmarkMode,
  platform: BenchmarkPlatform,
  androidApiLevel: number | null,
): BenchmarkLayoutEngine {
  if (mode === "baseline") {
    return "rn_text_compat";
  }

  return getCanonicalPreparedLayoutEngine(platform, androidApiLevel);
}

export function createBenchmarkDiagnostics(
  mode: BenchmarkMode,
  platform: BenchmarkPlatform = getBenchmarkPlatform(),
  androidApiLevel: number | null = getRuntimeAndroidApiLevel(),
): BenchmarkDiagnostics {
  const parityRole = getParityRole(mode);

  return {
    driftKinds: [],
    heightDriftBuckets: { ...EMPTY_HEIGHT_DRIFT_BUCKETS },
    heightMetricDrivers: [...HEIGHT_METRIC_DRIVERS],
    heightMetricSource: "platform_text_engine_metrics",
    includeFontPadding: platform === "android" ? true : null,
    layoutEngine: getLayoutEngine(mode, platform, androidApiLevel),
    parityBucket: parityRole,
    parityRole,
    rendererKind: getRendererKind(mode),
  };
}

export function createBenchmarkDiagnosticsFromNative(
  mode: BenchmarkMode,
  nativeDiagnostics: ParagraphLayoutDiagnostics | null,
  platform: BenchmarkPlatform = getBenchmarkPlatform(),
  androidApiLevel: number | null = getRuntimeAndroidApiLevel(),
): BenchmarkDiagnostics {
  const fallback = createBenchmarkDiagnostics(mode, platform, androidApiLevel);
  if (mode === "baseline" || nativeDiagnostics === null) {
    return fallback;
  }

  return {
    ...fallback,
    driftKinds: normalizeDriftKinds(nativeDiagnostics.driftKinds),
    heightMetricDrivers: normalizeHeightMetricDrivers(
      nativeDiagnostics.heightMetricDrivers,
    ),
    heightMetricSource:
      nativeDiagnostics.heightMetricSource as BenchmarkDiagnostics["heightMetricSource"],
    layoutEngine:
      nativeDiagnostics.layoutEngine as BenchmarkDiagnostics["layoutEngine"],
  };
}

function normalizeDriftKinds(driftKinds: string[]): BenchmarkDriftKind[] {
  return driftKinds.flatMap((driftKind) =>
    isBenchmarkDriftKind(driftKind) ? [driftKind] : [],
  );
}

function normalizeHeightMetricDrivers(
  drivers: string[],
): BenchmarkHeightMetricDriver[] {
  const normalized = drivers.flatMap((driver) =>
    isBenchmarkHeightMetricDriver(driver) ? [driver] : [],
  );

  return normalized.length > 0 ? normalized : [...HEIGHT_METRIC_DRIVERS];
}

function isBenchmarkDriftKind(
  driftKind: string,
): driftKind is BenchmarkDriftKind {
  return [
    "algorithm_rule_drift",
    "compat_drift",
    "engine_drift",
    "emoji_metric_drift",
    "fallback_font_drift",
    "height_metric_drift",
    "locale_metric_drift",
    "line_break_strategy_drift",
    "padding_drift",
    "renderer_drift",
  ].includes(driftKind);
}

function isBenchmarkHeightMetricDriver(
  driver: string,
): driver is BenchmarkHeightMetricDriver {
  return HEIGHT_METRIC_DRIVERS.includes(driver as BenchmarkHeightMetricDriver);
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
    driftKinds.add("line_break_strategy_drift");
    heightDriftBuckets.line_break_strategy = args.lineTextParityMismatches;
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

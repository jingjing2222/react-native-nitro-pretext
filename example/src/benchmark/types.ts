import type {
  BenchmarkMode,
  PreTextParagraphMetrics as ImportedPreTextParagraphMetrics,
  PreTextPreparedCorpus as ImportedPreTextPreparedCorpus,
  PreTextPrepareStats,
} from "../relayoutBenchmark";

export type AppStackParamList = {
  Home: undefined;
  BenchmarkIndex: undefined;
  BenchmarkBaseText: undefined;
  BenchmarkPreTextLayout: undefined;
  ExampleIndex: undefined;
  ExampleMeasuredLayout: undefined;
};

export type PreTextPreparedCorpus = ImportedPreTextPreparedCorpus;
export type PreTextParagraphMetrics = ImportedPreTextParagraphMetrics;

export type BenchmarkPlatform = "android" | "ios" | "unknown";

export type BenchmarkLayoutEngine =
  | "android_legacy_fallback"
  | "android_measured_text_line_breaker"
  | "android_static_layout_compat"
  | "ios_core_text"
  | "rn_text_compat"
  | "unknown";

export type BenchmarkRendererKind = "prepared_compute" | "rn_text" | "unknown";

export type BenchmarkParityRole =
  | "canonical_prepared_compute"
  | "fallback_legacy"
  | "rn_text_compat_oracle";

export type BenchmarkParityBucket = BenchmarkParityRole;

export type BenchmarkHeightMetricSource =
  | "font_size_only"
  | "platform_text_engine_metrics"
  | "unknown";

export type BenchmarkHeightMetricDriver =
  | "emoji_fallback"
  | "explicit_line_height"
  | "fallback_font"
  | "font_metrics"
  | "include_font_padding"
  | "line_break_strategy"
  | "locale";

export type BenchmarkHeightDriftBucket =
  | BenchmarkHeightMetricDriver
  | "unclassified";

export type BenchmarkDriftKind =
  | "algorithm_rule_drift"
  | "compat_drift"
  | "engine_drift"
  | "emoji_metric_drift"
  | "fallback_font_drift"
  | "height_metric_drift"
  | "locale_metric_drift"
  | "line_break_strategy_drift"
  | "padding_drift"
  | "renderer_drift";

export type BenchmarkDiagnostics = {
  driftKinds: BenchmarkDriftKind[];
  heightDriftBuckets: Record<BenchmarkHeightDriftBucket, number>;
  heightMetricDrivers: BenchmarkHeightMetricDriver[];
  heightMetricSource: BenchmarkHeightMetricSource;
  includeFontPadding: boolean | null;
  layoutEngine: BenchmarkLayoutEngine;
  parityBucket: BenchmarkParityBucket;
  parityRole: BenchmarkParityRole;
  rendererKind: BenchmarkRendererKind;
};

export type BenchmarkSummary = BenchmarkDiagnostics & {
  interactionMedianMs: number | null;
  interactionP95Ms: number | null;
  layoutOnlyMedianMs: number | null;
  totalJankCount: number;
  parityMismatches: number;
  parityChecks: number;
  lineTextParityMismatches: number;
  lineTextParityChecks: number;
  amortizedAfterRuns: number | null;
};

export type ModeRunMetric = {
  interactionMs: number;
  layoutOnlyMs: number | null;
  jankCount: number;
  parityMismatches: number;
  parityChecks: number;
  lineTextParityMismatches: number;
  lineTextParityChecks: number;
};

export type RunStatus = {
  mode: BenchmarkMode | null;
  runIndex: number;
  totalRuns: number;
  width: number | null;
  label: string;
};

export type RenderPassObservation = {
  interactionMs: number;
  jankCount: number;
  sampleLineCounts: number[];
  sampleLineTexts: string[][];
};

export type ActiveRenderPass = {
  expectedParagraphs: number;
  sampleLineCounts: number[];
  sampleLineTexts: string[][];
  seenParagraphs: Set<number>;
  startedAt: number;
  resolve: (observation: RenderPassObservation) => void;
  stopJankTracking: () => number;
};

export type SummaryRecord = Record<BenchmarkMode, BenchmarkSummary | null>;
export type WidthSampleLineCounts = Record<number, number[]>;
export type WidthSampleLineTexts = Record<number, string[][]>;

export type BaseTextResultState = {
  completedAt: string | null;
  sampleLineCountsByWidth: WidthSampleLineCounts | null;
  sampleLineTextsByWidth: WidthSampleLineTexts | null;
  summary: BenchmarkSummary | null;
};

export type PreparedViewResultState = {
  completedAt: string | null;
  computeSummary: BenchmarkSummary | null;
  prepareMs: number | null;
  prepareStats: PreTextPrepareStats | null;
  renderSummary: BenchmarkSummary | null;
};

export type BenchmarkHarnessCompletion = {
  completedAt: string;
  sampleLineCountsByWidth?: WidthSampleLineCounts;
  sampleLineTextsByWidth?: WidthSampleLineTexts;
  summaries: SummaryRecord;
};

export type BenchmarkHarnessArgs = {
  baselineInteractionMedianMs: number | null;
  baselineSampleLineCountsByWidth: WidthSampleLineCounts | null;
  baselineSampleLineTextsByWidth: WidthSampleLineTexts | null;
  initialCompletedAt: string | null;
  initialSummaries: Partial<SummaryRecord>;
  modes: BenchmarkMode[];
  onCompleted: (completion: BenchmarkHarnessCompletion) => void;
  prepareMs: number | null;
  preparedParagraphs: PreTextPreparedCorpus | null;
};

export type BenchmarkHarnessState = {
  activeMode: BenchmarkMode;
  handleParagraphLayout: (index: number) => void;
  handleParagraphTextLayout: (
    index: number,
    lineCount: number,
    lineTexts: string[],
  ) => void;
  isRunning: boolean;
  lastCompletedAt: string | null;
  paragraphWidth: number;
  renderedParagraphs: string[];
  runBenchmarkSuite: () => Promise<void>;
  runStatus: RunStatus;
  summaries: SummaryRecord;
  totalRuns: number;
  widthSequence: number[];
};

export type SurfaceCardProps = {
  activeMode: BenchmarkMode;
  lastCompletedAt: string | null;
  onParagraphLayout: (index: number) => void;
  onParagraphTextLayout: (
    index: number,
    lineCount: number,
    lineTexts: string[],
  ) => void;
  paragraphWidth: number;
  texts: string[];
};

export type PreTextLayoutSurfaceCardProps = {
  activeMode: BenchmarkMode;
  lastCompletedAt: string | null;
  onParagraphLayout: (index: number) => void;
  paragraphMetrics: PreTextParagraphMetrics[];
  paragraphWidth: number;
  prepared: PreTextPreparedCorpus | null;
};

export const EMPTY_BASELINE_RESULTS: BaseTextResultState = {
  completedAt: null,
  sampleLineCountsByWidth: null,
  sampleLineTextsByWidth: null,
  summary: null,
};

export const EMPTY_PREPARED_VIEW_RESULTS: PreparedViewResultState = {
  completedAt: null,
  computeSummary: null,
  prepareMs: null,
  prepareStats: null,
  renderSummary: null,
};

export function createSummaryRecord(
  partial?: Partial<SummaryRecord>,
): SummaryRecord {
  return {
    baseline: partial?.baseline ?? null,
    "pretext-compute": partial?.["pretext-compute"] ?? null,
    "pretext-render": partial?.["pretext-render"] ?? null,
  };
}

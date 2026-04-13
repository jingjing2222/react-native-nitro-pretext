import type {
  BenchmarkMode,
  PreparedParagraphPrepareStats,
  PreparedParagraphMetrics as ImportedPreparedParagraphMetrics,
  PreparedParagraph as ImportedPreparedParagraph,
} from "../relayoutBenchmark";

export type AppStackParamList = {
  Home: undefined;
  BenchmarkIndex: undefined;
  BenchmarkBaseText: undefined;
  BenchmarkPreparedView: undefined;
  ExampleIndex: undefined;
  ExamplePreparedView: undefined;
  ExamplePreparedLines: undefined;
  ExamplePreparedText: undefined;
  ExampleInlineSegments: undefined;
  ExampleLineCursor: undefined;
};

export type PreparedParagraph = ImportedPreparedParagraph;
export type PreparedParagraphMetrics = ImportedPreparedParagraphMetrics;

export type BenchmarkSummary = {
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
  prepareStats: PreparedParagraphPrepareStats | null;
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
  preparedParagraphs: PreparedParagraph | null;
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

export type PreparedParagraphSurfaceCardProps = {
  activeMode: BenchmarkMode;
  lastCompletedAt: string | null;
  onParagraphLayout: (index: number) => void;
  paragraphMetrics: PreparedParagraphMetrics[];
  paragraphWidth: number;
  prepared: PreparedParagraph | null;
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

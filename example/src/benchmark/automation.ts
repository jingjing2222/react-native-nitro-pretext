import type {
  BaseTextResultState,
  BenchmarkSummary,
  PreparedViewResultState,
  RunStatus,
} from "./types";

export type AutomationStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "running"
  | "completed"
  | "partial";

type SerializableSummary = {
  amortizedAfterRuns: number | null;
  interactionMedianMs: number | null;
  interactionP95Ms: number | null;
  layoutOnlyMedianMs: number | null;
  lineTextParityChecks: number;
  lineTextParityMismatches: number;
  parityChecks: number;
  parityMismatches: number;
  totalJankCount: number;
};

type BaseTextAutomationReport = {
  completedAt: string | null;
  interactionMedianMs: number | null;
  interactionP95Ms: number | null;
  jankCount: number | null;
  layoutOnlyMedianMs: number | null;
  lineTextParityChecks: number | null;
  lineTextParityMismatches: number | null;
  parityChecks: number | null;
  parityMismatches: number | null;
  screen: "benchmark/base-text";
  status: AutomationStatus;
  totalRuns: number;
};

type PreparedViewAutomationReport = {
  buildPreparedMs: number | null;
  completedAt: string | null;
  computeLayoutOnlyMedianMs: number | null;
  measureMs: number | null;
  prepareMs: number | null;
  computeLineTextParityChecks: number | null;
  computeLineTextParityMismatches: number | null;
  computeParityChecks: number | null;
  computeParityMismatches: number | null;
  renderInteractionMedianMs: number | null;
  renderInteractionP95Ms: number | null;
  renderJankCount: number | null;
  renderLineTextParityChecks: number | null;
  renderLineTextParityMismatches: number | null;
  renderParityChecks: number | null;
  renderParityMismatches: number | null;
  screen: "benchmark/prepared-view";
  status: AutomationStatus;
  tokenizeMs: number | null;
  totalRuns: number;
};

type CombinedAutomationReport = {
  baseCompletedAt: string | null;
  baseMedianMs: number | null;
  medianDeltaMs: number | null;
  measurementMs: number | null;
  p95DeltaMs: number | null;
  prepareMs: number | null;
  preparedComputeLineTextParityChecks: number | null;
  preparedComputeLineTextParityMismatches: number | null;
  preparedComputeParityChecks: number | null;
  preparedComputeParityMismatches: number | null;
  preparedCompletedAt: string | null;
  preparedLayoutOnlyMedianMs: number | null;
  preparedMedianMs: number | null;
  preparedP95Ms: number | null;
  preparedRenderJankCount: number | null;
  preparedRenderLineTextParityChecks: number | null;
  preparedRenderLineTextParityMismatches: number | null;
  preparedRenderParityChecks: number | null;
  preparedRenderParityMismatches: number | null;
  screen: "benchmark/index";
  status: AutomationStatus;
};

function roundMetric(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(2));
}

function serializeSummary(
  summary: BenchmarkSummary | null,
): SerializableSummary | null {
  if (summary === null) {
    return null;
  }

  return {
    amortizedAfterRuns: summary.amortizedAfterRuns,
    interactionMedianMs: roundMetric(summary.interactionMedianMs),
    interactionP95Ms: roundMetric(summary.interactionP95Ms),
    layoutOnlyMedianMs: roundMetric(summary.layoutOnlyMedianMs),
    lineTextParityChecks: summary.lineTextParityChecks,
    lineTextParityMismatches: summary.lineTextParityMismatches,
    parityChecks: summary.parityChecks,
    parityMismatches: summary.parityMismatches,
    totalJankCount: summary.totalJankCount,
  };
}

function summarizeRunStatus(runStatus: RunStatus): string {
  const mode = runStatus.mode ?? "none";
  const width = runStatus.width ?? 0;
  const label = runStatus.label.replace(/\s+/g, "_");

  return `${runStatus.runIndex}/${runStatus.totalRuns}::${mode}::${width}::${label}`;
}

export function createAutomationStatusLine(
  screen: string,
  status: AutomationStatus,
  runStatus: RunStatus,
): string {
  return `AUTOMATION_STATUS::${screen}::${status}::${summarizeRunStatus(runStatus)}`;
}

export function serializeAutomationReport(
  screen: string,
  report:
    | BaseTextAutomationReport
    | PreparedViewAutomationReport
    | CombinedAutomationReport,
): string {
  return `AUTOMATION_REPORT::${screen}::${JSON.stringify(report)}`;
}

export function createBaseTextAutomationReport(args: {
  completedAt: string | null;
  status: AutomationStatus;
  summary: BenchmarkSummary | null;
  totalRuns: number;
  widthSequence: number[];
}): BaseTextAutomationReport {
  const summary = serializeSummary(args.summary);

  return {
    completedAt: args.completedAt,
    interactionMedianMs: summary?.interactionMedianMs ?? null,
    interactionP95Ms: summary?.interactionP95Ms ?? null,
    jankCount: summary?.totalJankCount ?? null,
    layoutOnlyMedianMs: summary?.layoutOnlyMedianMs ?? null,
    lineTextParityChecks: summary?.lineTextParityChecks ?? null,
    lineTextParityMismatches: summary?.lineTextParityMismatches ?? null,
    parityChecks: summary?.parityChecks ?? null,
    parityMismatches: summary?.parityMismatches ?? null,
    screen: "benchmark/base-text",
    status: args.status,
    totalRuns: args.totalRuns,
  };
}

export function createPreparedViewAutomationReport(args: {
  completedAt: string | null;
  computeSummary: BenchmarkSummary | null;
  prepareMs: number | null;
  prepareState:
    | PreparedViewResultState["prepareStats"]
    | {
        buildPreparedMs: number;
        measurementMs: number;
        tokenizeMs: number;
        totalMs: number;
        totalTokenCount: number;
        uniqueTokenCount: number;
      }
    | null;
  renderSummary: BenchmarkSummary | null;
  status: AutomationStatus;
  totalRuns: number;
  widthSequence: number[];
}): PreparedViewAutomationReport {
  const computeSummary = serializeSummary(args.computeSummary);
  const renderSummary = serializeSummary(args.renderSummary);

  return {
    buildPreparedMs:
      args.prepareState === null
        ? null
        : roundMetric(args.prepareState.buildPreparedMs),
    completedAt: args.completedAt,
    computeLineTextParityChecks: computeSummary?.lineTextParityChecks ?? null,
    computeLineTextParityMismatches:
      computeSummary?.lineTextParityMismatches ?? null,
    computeLayoutOnlyMedianMs: computeSummary?.layoutOnlyMedianMs ?? null,
    computeParityChecks: computeSummary?.parityChecks ?? null,
    computeParityMismatches: computeSummary?.parityMismatches ?? null,
    measureMs:
      args.prepareState === null
        ? null
        : roundMetric(args.prepareState.measurementMs),
    prepareMs: roundMetric(args.prepareMs),
    renderInteractionMedianMs: renderSummary?.interactionMedianMs ?? null,
    renderInteractionP95Ms: renderSummary?.interactionP95Ms ?? null,
    renderJankCount: renderSummary?.totalJankCount ?? null,
    renderLineTextParityChecks: renderSummary?.lineTextParityChecks ?? null,
    renderLineTextParityMismatches:
      renderSummary?.lineTextParityMismatches ?? null,
    renderParityChecks: renderSummary?.parityChecks ?? null,
    renderParityMismatches: renderSummary?.parityMismatches ?? null,
    screen: "benchmark/prepared-view",
    status: args.status,
    tokenizeMs:
      args.prepareState === null
        ? null
        : roundMetric(args.prepareState.tokenizeMs),
    totalRuns: args.totalRuns,
  };
}

export function createCombinedBenchmarkAutomationReport(args: {
  baselineResults: BaseTextResultState;
  preparedViewResults: PreparedViewResultState;
}): CombinedAutomationReport {
  const baseSummary = serializeSummary(args.baselineResults.summary);
  const renderSummary = serializeSummary(
    args.preparedViewResults.renderSummary,
  );
  const computeSummary = serializeSummary(
    args.preparedViewResults.computeSummary,
  );
  const medianDeltaMs =
    renderSummary?.interactionMedianMs !== null &&
    renderSummary?.interactionMedianMs !== undefined &&
    baseSummary?.interactionMedianMs !== null &&
    baseSummary?.interactionMedianMs !== undefined
      ? roundMetric(
          renderSummary.interactionMedianMs - baseSummary.interactionMedianMs,
        )
      : null;
  const p95DeltaMs =
    renderSummary?.interactionP95Ms !== null &&
    renderSummary?.interactionP95Ms !== undefined &&
    baseSummary?.interactionP95Ms !== null &&
    baseSummary?.interactionP95Ms !== undefined
      ? roundMetric(
          renderSummary.interactionP95Ms - baseSummary.interactionP95Ms,
        )
      : null;

  return {
    baseCompletedAt: args.baselineResults.completedAt,
    baseMedianMs: baseSummary?.interactionMedianMs ?? null,
    medianDeltaMs,
    measurementMs:
      args.preparedViewResults.prepareStats === null
        ? null
        : roundMetric(args.preparedViewResults.prepareStats.measurementMs),
    p95DeltaMs,
    prepareMs: roundMetric(args.preparedViewResults.prepareMs),
    preparedComputeLineTextParityChecks:
      computeSummary?.lineTextParityChecks ?? null,
    preparedComputeLineTextParityMismatches:
      computeSummary?.lineTextParityMismatches ?? null,
    preparedComputeParityChecks: computeSummary?.parityChecks ?? null,
    preparedComputeParityMismatches: computeSummary?.parityMismatches ?? null,
    preparedCompletedAt: args.preparedViewResults.completedAt,
    preparedLayoutOnlyMedianMs: computeSummary?.layoutOnlyMedianMs ?? null,
    preparedMedianMs: renderSummary?.interactionMedianMs ?? null,
    preparedP95Ms: renderSummary?.interactionP95Ms ?? null,
    preparedRenderJankCount: renderSummary?.totalJankCount ?? null,
    preparedRenderLineTextParityChecks:
      renderSummary?.lineTextParityChecks ?? null,
    preparedRenderLineTextParityMismatches:
      renderSummary?.lineTextParityMismatches ?? null,
    preparedRenderParityChecks: renderSummary?.parityChecks ?? null,
    preparedRenderParityMismatches: renderSummary?.parityMismatches ?? null,
    screen: "benchmark/index",
    status:
      baseSummary !== null && renderSummary !== null ? "completed" : "partial",
  };
}

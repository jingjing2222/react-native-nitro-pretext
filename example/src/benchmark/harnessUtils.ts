import {
  BENCHMARK_SAMPLE_SIZE,
  median,
  now,
  percentile,
  sum,
} from "../relayoutBenchmark";
import type { BenchmarkSummary, ModeRunMetric } from "./types";

export function beginJankTracker(): () => number {
  let frameId = 0;
  let lastFrameAt = now();
  let jankCount = 0;

  const loop = (frameAt: number) => {
    if (frameAt - lastFrameAt > 20) {
      jankCount += 1;
    }
    lastFrameAt = frameAt;
    frameId = requestAnimationFrame(loop);
  };

  frameId = requestAnimationFrame((frameAt) => {
    lastFrameAt = frameAt;
    frameId = requestAnimationFrame(loop);
  });

  return () => {
    cancelAnimationFrame(frameId);
    return jankCount;
  };
}

export function compareLineCounts(
  baselineCounts: number[] | undefined,
  expectedLineCounts: number[] | null,
): {
  parityChecks: number;
  parityMismatches: number;
} {
  if (!baselineCounts || !expectedLineCounts) {
    return {
      parityChecks: 0,
      parityMismatches: 0,
    };
  }

  let parityMismatches = 0;
  let parityChecks = 0;

  for (let index = 0; index < BENCHMARK_SAMPLE_SIZE; index += 1) {
    const baseline = baselineCounts[index];
    const expected = expectedLineCounts[index];
    if (!baseline || expected === undefined) {
      continue;
    }

    parityChecks += 1;
    if (baseline !== expected) {
      parityMismatches += 1;
    }
  }

  return {
    parityChecks,
    parityMismatches,
  };
}

export function buildSummary(
  modeMetrics: ModeRunMetric[],
  prepareMs: number,
  baselineMedianMs: number | null,
): BenchmarkSummary {
  const interactionValues = modeMetrics.map((metric) => metric.interactionMs);
  const layoutValues = modeMetrics.flatMap((metric) =>
    metric.layoutOnlyMs === null ? [] : [metric.layoutOnlyMs],
  );
  const interactionMedianMs = median(interactionValues);
  const interactionP95Ms = percentile(interactionValues, 0.95);
  const layoutOnlyMedianMs = median(layoutValues);
  const amortizedAfterRuns =
    baselineMedianMs !== null &&
    interactionMedianMs !== null &&
    baselineMedianMs > interactionMedianMs
      ? Math.ceil(prepareMs / (baselineMedianMs - interactionMedianMs))
      : null;

  return {
    amortizedAfterRuns,
    interactionMedianMs,
    interactionP95Ms,
    layoutOnlyMedianMs,
    parityChecks: sum(modeMetrics.map((metric) => metric.parityChecks)),
    parityMismatches: sum(modeMetrics.map((metric) => metric.parityMismatches)),
    totalJankCount: sum(modeMetrics.map((metric) => metric.jankCount)),
  };
}

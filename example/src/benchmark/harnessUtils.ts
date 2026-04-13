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

function normalizeLineText(text: string): string {
  return text.replace(/\r?\n/gu, "").replace(/[ \t\u00a0]+$/gu, "");
}

function hasMatchingLineTexts(
  baselineLineTexts: string[],
  expectedLineTexts: string[],
): boolean {
  if (baselineLineTexts.length !== expectedLineTexts.length) {
    return false;
  }

  return baselineLineTexts.every((lineText, index) => {
    const expectedLineText = expectedLineTexts[index];

    if (expectedLineText === undefined) {
      return false;
    }

    return normalizeLineText(lineText) === normalizeLineText(expectedLineText);
  });
}

export function compareLineParity(
  baselineCounts: number[] | undefined,
  expectedLineCounts: number[] | null,
  baselineLineTexts: string[][] | undefined,
  expectedLineTexts: string[][] | null,
): {
  parityChecks: number;
  parityMismatches: number;
  lineTextParityChecks: number;
  lineTextParityMismatches: number;
} {
  if (!baselineCounts || !expectedLineCounts) {
    return {
      lineTextParityChecks: 0,
      lineTextParityMismatches: 0,
      parityChecks: 0,
      parityMismatches: 0,
    };
  }

  let parityMismatches = 0;
  let parityChecks = 0;
  let lineTextParityMismatches = 0;
  let lineTextParityChecks = 0;

  for (let index = 0; index < BENCHMARK_SAMPLE_SIZE; index += 1) {
    const baseline = baselineCounts[index];
    const expected = expectedLineCounts[index];
    if (baseline === undefined || expected === undefined) {
      continue;
    }

    parityChecks += 1;
    if (baseline !== expected) {
      parityMismatches += 1;
    }

    const baselineParagraphLineTexts = baselineLineTexts?.[index];
    const expectedParagraphLineTexts = expectedLineTexts?.[index];
    if (!baselineParagraphLineTexts || !expectedParagraphLineTexts) {
      continue;
    }

    lineTextParityChecks += 1;
    if (
      !hasMatchingLineTexts(
        baselineParagraphLineTexts,
        expectedParagraphLineTexts,
      )
    ) {
      lineTextParityMismatches += 1;
    }
  }

  return {
    lineTextParityChecks,
    lineTextParityMismatches,
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
    lineTextParityChecks: sum(
      modeMetrics.map((metric) => metric.lineTextParityChecks),
    ),
    lineTextParityMismatches: sum(
      modeMetrics.map((metric) => metric.lineTextParityMismatches),
    ),
    parityChecks: sum(modeMetrics.map((metric) => metric.parityChecks)),
    parityMismatches: sum(modeMetrics.map((metric) => metric.parityMismatches)),
    totalJankCount: sum(modeMetrics.map((metric) => metric.jankCount)),
  };
}

import { describe, expect, it } from "@jest/globals";

import {
  createBenchmarkDiagnostics,
  getCanonicalPreparedLayoutEngine,
  resolveBenchmarkDrift,
} from "../../example/src/benchmark/diagnostics";

describe("benchmark diagnostics", () => {
  it("declares Android prepared layout as MeasuredText + LineBreaker", () => {
    expect(getCanonicalPreparedLayoutEngine("android")).toBe(
      "android_measured_text_line_breaker",
    );
    expect(
      createBenchmarkDiagnostics("pretext-compute", "android"),
    ).toMatchObject({
      heightMetricSource: "platform_text_engine_metrics",
      includeFontPadding: true,
      layoutEngine: "android_measured_text_line_breaker",
      parityRole: "canonical_prepared_compute",
      rendererKind: "prepared_compute",
    });
  });

  it("declares iOS prepared layout as Core Text", () => {
    expect(createBenchmarkDiagnostics("pretext-render", "ios")).toMatchObject({
      heightMetricSource: "platform_text_engine_metrics",
      includeFontPadding: null,
      layoutEngine: "ios_core_text",
      parityRole: "canonical_prepared_compute",
      rendererKind: "rn_text",
    });
  });

  it("keeps RN Text as a compatibility oracle bucket", () => {
    expect(createBenchmarkDiagnostics("baseline", "android")).toMatchObject({
      includeFontPadding: true,
      layoutEngine: "rn_text_compat",
      parityBucket: "rn_text_compat_oracle",
      parityRole: "rn_text_compat_oracle",
      rendererKind: "rn_text",
    });
  });

  it("classifies line-count drift as height metric drift", () => {
    const diagnostics = createBenchmarkDiagnostics("pretext-render", "android");
    const drift = resolveBenchmarkDrift({
      diagnostics,
      lineTextParityMismatches: 2,
      parityMismatches: 3,
    });

    expect(drift.driftKinds).toEqual(
      expect.arrayContaining([
        "algorithm_rule_drift",
        "height_metric_drift",
        "line_break_strategy_drift",
      ]),
    );
    expect(drift.heightDriftBuckets.unclassified).toBe(3);
    expect(drift.heightDriftBuckets.line_break_strategy).toBe(2);
  });
});

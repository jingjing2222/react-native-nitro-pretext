import { describe, expect, it } from "@jest/globals";

import {
  createBenchmarkDiagnostics,
  createBenchmarkDiagnosticsFromNative,
  getCanonicalPreparedLayoutEngine,
  resolveBenchmarkDrift,
} from "../../example/src/benchmark/diagnostics";

describe("benchmark diagnostics", () => {
  it("declares Android prepared layout as MeasuredText + LineBreaker", () => {
    expect(getCanonicalPreparedLayoutEngine("android", 29)).toBe(
      "android_measured_text_line_breaker",
    );
    expect(
      createBenchmarkDiagnostics("pretext-compute", "android", 29),
    ).toMatchObject({
      heightMetricSource: "platform_text_engine_metrics",
      includeFontPadding: true,
      layoutEngine: "android_measured_text_line_breaker",
      parityRole: "canonical_prepared_compute",
      rendererKind: "prepared_compute",
    });
  });

  it("declares Android API 24-28 prepared layout as StaticLayout compat", () => {
    expect(getCanonicalPreparedLayoutEngine("android", 28)).toBe(
      "android_static_layout_compat",
    );
    expect(
      createBenchmarkDiagnostics("pretext-compute", "android", 28),
    ).toMatchObject({
      includeFontPadding: true,
      layoutEngine: "android_static_layout_compat",
      parityRole: "canonical_prepared_compute",
      rendererKind: "prepared_compute",
    });
  });

  it("declares iOS prepared layout as TextKit", () => {
    expect(createBenchmarkDiagnostics("pretext-render", "ios")).toMatchObject({
      heightMetricSource: "platform_text_engine_metrics",
      includeFontPadding: null,
      layoutEngine: "ios_text_kit",
      parityRole: "canonical_prepared_compute",
      rendererKind: "rn_text",
    });
  });

  it("preserves iOS manual token fallback in native diagnostics", () => {
    const nativeDiagnostics = {
      driftKinds: [],
      heightMetricDrivers: [],
      heightMetricSource: "platform_text_engine_metrics",
      layoutEngine: "ios_manual_token_fallback",
    } as unknown as Parameters<typeof createBenchmarkDiagnosticsFromNative>[1];

    expect(
      createBenchmarkDiagnosticsFromNative(
        "pretext-compute",
        nativeDiagnostics,
        "ios",
      ),
    ).toMatchObject({
      layoutEngine: "ios_manual_token_fallback",
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

  it("preserves native drift when parity counters are clean", () => {
    const diagnostics = createBenchmarkDiagnostics(
      "pretext-compute",
      "android",
    );
    diagnostics.driftKinds = ["engine_drift"];
    diagnostics.heightDriftBuckets.fallback_font = 2;

    const drift = resolveBenchmarkDrift({
      diagnostics,
      lineTextParityMismatches: 0,
      parityMismatches: 0,
    });

    expect(drift.driftKinds).toContain("engine_drift");
    expect(drift.heightDriftBuckets.fallback_font).toBe(2);
  });

  it("does not report canonical engine when native diagnostics are missing", () => {
    expect(
      createBenchmarkDiagnosticsFromNative(
        "pretext-compute",
        null,
        "android",
        29,
      ),
    ).toMatchObject({
      driftKinds: ["engine_drift", "height_metric_drift"],
      heightMetricSource: "unknown",
      layoutEngine: "unknown",
    });
  });
});

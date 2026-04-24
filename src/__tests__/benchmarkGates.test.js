const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");
const gateScript = path.join(
  rootDir,
  "example/maestro/scripts/assert-benchmark-gates.js",
);

function createHeightDriftBuckets() {
  return {
    emoji_fallback: 0,
    explicit_line_height: 0,
    fallback_font: 0,
    font_metrics: 0,
    include_font_padding: 0,
    line_break_strategy: 0,
    locale: 0,
    unclassified: 0,
  };
}

function createBaseTextReport() {
  return {
    completedAt: "10:00:00",
    driftKinds: [],
    heightDriftBuckets: createHeightDriftBuckets(),
    heightMetricDrivers: [
      "font_metrics",
      "explicit_line_height",
      "fallback_font",
      "emoji_fallback",
      "locale",
      "include_font_padding",
      "line_break_strategy",
    ],
    heightMetricSource: "platform_text_engine_metrics",
    includeFontPadding: true,
    interactionMedianMs: 100,
    interactionP95Ms: 110,
    jankCount: 0,
    layoutOnlyMedianMs: null,
    layoutEngine: "rn_text_compat",
    lineTextParityChecks: 0,
    lineTextParityMismatches: 0,
    parityBucket: "rn_text_compat_oracle",
    parityChecks: 0,
    parityMismatches: 0,
    parityRole: "rn_text_compat_oracle",
    rendererKind: "rn_text",
    screen: "benchmark/base-text",
    status: "completed",
    totalRuns: 35,
  };
}

function createPreparedViewReport(overrides = {}) {
  return {
    buildPreparedMs: 1,
    completedAt: "10:00:01",
    computeDriftKinds: [],
    computeHeightDriftBuckets: createHeightDriftBuckets(),
    computeHeightMetricDrivers: [
      "font_metrics",
      "explicit_line_height",
      "fallback_font",
      "emoji_fallback",
      "locale",
      "include_font_padding",
      "line_break_strategy",
    ],
    computeHeightMetricSource: "platform_text_engine_metrics",
    computeIncludeFontPadding: true,
    computeLayoutEngine: "android_measured_text_line_breaker",
    computeLayoutOnlyMedianMs: 1,
    computeLineTextParityChecks: 200,
    computeLineTextParityMismatches: 0,
    computeParityBucket: "canonical_prepared_compute",
    computeParityChecks: 200,
    computeParityMismatches: 0,
    computeParityRole: "canonical_prepared_compute",
    computeRendererKind: "prepared_compute",
    measureMs: 1,
    prepareMs: 1,
    renderDriftKinds: [],
    renderHeightDriftBuckets: createHeightDriftBuckets(),
    renderHeightMetricDrivers: [
      "font_metrics",
      "explicit_line_height",
      "fallback_font",
      "emoji_fallback",
      "locale",
      "include_font_padding",
      "line_break_strategy",
    ],
    renderHeightMetricSource: "platform_text_engine_metrics",
    renderIncludeFontPadding: true,
    renderInteractionMedianMs: 50,
    renderInteractionP95Ms: 55,
    renderJankCount: 0,
    renderLayoutEngine: "android_measured_text_line_breaker",
    renderLineTextParityChecks: 200,
    renderLineTextParityMismatches: 0,
    renderParityBucket: "canonical_prepared_native_render",
    renderParityChecks: 200,
    renderParityMismatches: 0,
    renderParityRole: "canonical_prepared_native_render",
    renderRendererKind: "prepared_native_batch",
    screen: "benchmark/prepared-view",
    status: "completed",
    tokenizeMs: 1,
    totalRuns: 35,
    ...overrides,
  };
}

function runGate(preparedOverrides = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pretext-gate-"));
  const logPath = path.join(tempDir, "maestro.log");
  const reportPath = path.join(tempDir, "gate.txt");
  const suite = {
    baseText: createBaseTextReport(),
    combined: null,
    preparedView: createPreparedViewReport(preparedOverrides),
  };

  fs.writeFileSync(
    logPath,
    `I/ReactNativeJS: JsConsole: BENCHMARK_SUITE::${JSON.stringify(suite)}\n`,
  );

  execFileSync(process.execPath, [
    gateScript,
    logPath,
    reportPath,
    "android",
    "prepared-view",
  ]);

  return fs.readFileSync(reportPath, "utf8");
}

describe("benchmark parity contract gates", () => {
  it("separates timing checks from parity contract checks", () => {
    const report = runGate();

    expect(report).toContain("Timing Checks");
    expect(report).toContain("Parity Contract Checks");
  });

  it("fails when Android includeFontPadding is omitted", () => {
    expect(() => runGate({ renderIncludeFontPadding: null })).toThrow();
  });

  it("fails when canonical Android prepared layout uses the wrong engine", () => {
    expect(() =>
      runGate({ computeLayoutEngine: "android_static_layout_compat" }),
    ).toThrow();
  });

  it("fails when canonical height is reported as font-size-only", () => {
    expect(() =>
      runGate({ renderHeightMetricSource: "font_size_only" }),
    ).toThrow();
  });
});

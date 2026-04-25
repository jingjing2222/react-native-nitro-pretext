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
    computeLayoutEngine: "android_static_layout_compat",
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
    renderLayoutEngine: "android_static_layout_compat",
    renderLineTextParityChecks: 200,
    renderLineTextParityMismatches: 0,
    renderParityBucket: "canonical_prepared_compute",
    renderParityChecks: 200,
    renderParityMismatches: 0,
    renderParityRole: "canonical_prepared_compute",
    renderRendererKind: "rn_text",
    screen: "benchmark/pretext-layout",
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
    "pretext-layout",
  ]);

  return fs.readFileSync(reportPath, "utf8");
}

function runParityGate(parityOverrides = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pretext-gate-"));
  const logPath = path.join(tempDir, "maestro.log");
  const reportPath = path.join(tempDir, "gate.txt");
  const parity = {
    caseCount: 240,
    completedAt: "10:00:02",
    completedCases: 240,
    failedCases: 0,
    geometryTolerance: 0.5,
    lineCountMismatches: 0,
    lineGeometryMismatches: 0,
    lineTextMismatches: 0,
    mismatchCount: 0,
    mismatches: [],
    platform: "android",
    screen: "benchmark/parity",
    status: "completed",
    ...parityOverrides,
  };

  fs.writeFileSync(
    logPath,
    `I/ReactNativeJS: JsConsole: BENCHMARK_REPORT::benchmark/parity::${JSON.stringify(parity)}\n`,
  );

  execFileSync(process.execPath, [
    gateScript,
    logPath,
    reportPath,
    "android",
    "parity",
  ]);

  return fs.readFileSync(reportPath, "utf8");
}

function runParityGateFailure(parityOverrides = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pretext-gate-"));
  const logPath = path.join(tempDir, "maestro.log");
  const reportPath = path.join(tempDir, "gate.txt");
  const parity = {
    caseCount: 240,
    completedAt: "10:00:02",
    completedCases: 240,
    failedCases: 0,
    geometryTolerance: 0.5,
    lineCountMismatches: 0,
    lineGeometryMismatches: 0,
    lineTextMismatches: 0,
    mismatchCount: 0,
    mismatches: [],
    platform: "android",
    screen: "benchmark/parity",
    status: "completed",
    ...parityOverrides,
  };

  fs.writeFileSync(
    logPath,
    `I/ReactNativeJS: JsConsole: BENCHMARK_REPORT::benchmark/parity::${JSON.stringify(parity)}\n`,
  );

  expect(() =>
    execFileSync(process.execPath, [
      gateScript,
      logPath,
      reportPath,
      "android",
      "parity",
    ]),
  ).toThrow();

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
      runGate({ computeLayoutEngine: "android_measured_text_line_breaker" }),
    ).toThrow();
  });

  it("fails when canonical height is reported as font-size-only", () => {
    expect(() =>
      runGate({ renderHeightMetricSource: "font_size_only" }),
    ).toThrow();
  });

  it("does not gate the final RN surface timing for layout-only API", () => {
    expect(() =>
      runGate({
        renderInteractionMedianMs: 240,
        renderInteractionP95Ms: 320,
      }),
    ).not.toThrow();
  });

  it("does not fail on RN Text compatibility parity drift", () => {
    expect(() =>
      runGate({
        computeLineTextParityMismatches: 200,
        computeParityMismatches: 200,
        renderLineTextParityMismatches: 200,
        renderParityMismatches: 200,
      }),
    ).not.toThrow();
  });

  it("fails when the layout-only hot path exceeds the gate", () => {
    expect(() => runGate({ computeLayoutOnlyMedianMs: 20 })).toThrow();
  });

  it("accepts the dedicated parity benchmark flow", () => {
    const report = runParityGate();

    expect(report).toContain("parity status == completed");
    expect(report).toContain("parity case count == 240");
    expect(report).toContain("line-text parity mismatches <= 0");
  });

  it("fails dedicated parity when not every case completes", () => {
    expect(() => runParityGate({ completedCases: 239 })).toThrow();
  });

  it("fails dedicated parity on any mismatch and prints its location", () => {
    const report = runParityGateFailure({
      lineTextMismatches: 1,
      mismatchCount: 1,
      mismatches: [
        {
          caseId: "parity-latin-001",
          category: "latin",
          firstDiff: {
            field: "text",
            lineIndex: 0,
            pretextValue: "expected",
            rnValue: "actual",
          },
          kind: "line-text",
          platform: "android",
          pretextLines: [],
          rnLines: [],
          style: {},
          width: 220,
        },
      ],
    });

    expect(report).toContain("Parity Mismatch Details");
    expect(report).toContain("parity-latin-001 [latin] line-text");
    expect(report).toContain('rn="actual" pretext="expected"');
  });
});

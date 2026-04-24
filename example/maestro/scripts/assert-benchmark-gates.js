#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const {
  formatCount,
  formatMs,
  formatRatio,
  labelValue,
  readBenchmarkLog,
  titleCase,
} = require("./benchmark-report-utils");

const [, , logPath, reportPath, platformArg, flowArg] = process.argv;

if (!logPath || !reportPath) {
  console.error(
    "usage: node example/maestro/scripts/assert-benchmark-gates.js <maestro.log> <gate-report.txt> [platform] [flow]",
  );
  process.exit(1);
}

const platform = platformArg ?? "unknown";
const flow = flowArg ?? "suite";
const profile = process.env.BENCHMARK_GATE_PROFILE ?? "local";
const configPath = path.join(__dirname, "benchmark-quality-gates.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const { summary } = readBenchmarkLog(logPath);

function mergeDefined(base, override) {
  return {
    ...(base ?? {}),
    ...(override ?? {}),
  };
}

function resolveThresholds() {
  const defaultProfile = config.default ?? {};
  const profileConfig = config[profile] ?? {};
  const defaultFlow = defaultProfile[flow] ?? {};
  const profileDefaultFlow = profileConfig[flow] ?? {};
  const platformFlow = profileConfig[platform]?.[flow] ?? {};

  return mergeDefined(
    mergeDefined(defaultFlow, profileDefaultFlow),
    platformFlow,
  );
}

function numericRatio(numerator, denominator) {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    denominator <= 0
  ) {
    return null;
  }

  return numerator / denominator;
}

function createCheckState() {
  return {
    failures: [],
    passes: [],
  };
}

function pushCheck(state, passed, label, actual, threshold) {
  const bucket = passed ? state.passes : state.failures;
  bucket.push({
    actual,
    label,
    threshold,
  });
}

function requireCompletedStatus(state, label, report) {
  pushCheck(
    state,
    report?.status === "completed",
    `${label} status == completed`,
    report?.status ?? "missing",
    "completed",
  );
}

function requirePresentMetric(state, label, value) {
  pushCheck(
    state,
    value !== null && value !== undefined,
    `${label} is present`,
    value === null || value === undefined ? "missing" : String(value),
    "present",
  );
}

function assertEqual(state, label, value, expected) {
  pushCheck(
    state,
    value === expected,
    `${label} == ${expected}`,
    value === null || value === undefined ? "missing" : String(value),
    expected,
  );
}

function assertNotFontSizeOnlyHeight(state, label, value) {
  const normalized =
    value === null || value === undefined
      ? "missing"
      : String(value).toLowerCase();

  pushCheck(
    state,
    normalized !== "missing" &&
      normalized !== "fontsize" &&
      normalized !== "font_size" &&
      normalized !== "font_size_only",
    `${label} is not font-size-only`,
    normalized,
    "platform text-engine metrics",
  );
}

function assertMax(state, label, value, threshold, formatter = String) {
  if (threshold === undefined) {
    return;
  }

  const passed =
    value !== null && value !== undefined && Number(value) <= Number(threshold);
  pushCheck(
    state,
    passed,
    `${label} <= ${formatter(threshold)}`,
    value === null || value === undefined ? "missing" : formatter(value),
    formatter(threshold),
  );
}

function assertMin(state, label, value, threshold, formatter = String) {
  if (threshold === undefined) {
    return;
  }

  const passed =
    value !== null && value !== undefined && Number(value) >= Number(threshold);
  pushCheck(
    state,
    passed,
    `${label} >= ${formatter(threshold)}`,
    value === null || value === undefined ? "missing" : formatter(value),
    formatter(threshold),
  );
}

function expectedCanonicalLayoutEngine(platformName) {
  if (platformName === "android") {
    return "android_measured_text_line_breaker";
  }

  if (platformName === "ios") {
    return "ios_core_text";
  }

  return null;
}

function requireAndroidIncludeFontPadding(state, label, value) {
  if (platform !== "android") {
    return;
  }

  pushCheck(
    state,
    value !== null && value !== undefined,
    `${label} includeFontPadding is present on Android`,
    value === null || value === undefined ? "missing" : String(value),
    "present",
  );
}

function assertBaseTextContract(state, report) {
  if (!report) {
    pushCheck(
      state,
      false,
      "base-text diagnostics are present",
      "missing",
      "present",
    );
    return;
  }

  assertEqual(
    state,
    "base-text layoutEngine",
    report.layoutEngine,
    "rn_text_compat",
  );
  assertEqual(state, "base-text rendererKind", report.rendererKind, "rn_text");
  assertEqual(
    state,
    "base-text parityRole",
    report.parityRole,
    "rn_text_compat_oracle",
  );
  requireAndroidIncludeFontPadding(
    state,
    "base-text",
    report.includeFontPadding,
  );
  assertNotFontSizeOnlyHeight(
    state,
    "base-text heightMetricSource",
    report.heightMetricSource,
  );
}

function assertPreparedContract(
  state,
  label,
  report,
  prefix,
  role,
  rendererKind,
) {
  if (!report) {
    pushCheck(
      state,
      false,
      `${label} diagnostics are present`,
      "missing",
      "present",
    );
    return;
  }

  const expectedEngine = expectedCanonicalLayoutEngine(platform);
  if (expectedEngine !== null) {
    assertEqual(
      state,
      `${label} layoutEngine`,
      report[`${prefix}LayoutEngine`],
      expectedEngine,
    );
  }

  assertEqual(
    state,
    `${label} rendererKind`,
    report[`${prefix}RendererKind`],
    rendererKind,
  );
  assertEqual(
    state,
    `${label} parityRole`,
    report[`${prefix}ParityRole`],
    role,
  );
  requireAndroidIncludeFontPadding(
    state,
    label,
    report[`${prefix}IncludeFontPadding`],
  );
  assertNotFontSizeOnlyHeight(
    state,
    `${label} heightMetricSource`,
    report[`${prefix}HeightMetricSource`],
  );
}

function renderCheckLine(prefix, check) {
  return `${prefix} ${check.label} (actual ${check.actual}, expected ${check.threshold})`;
}

const thresholds = resolveThresholds();
const baseText = summary.baseText;
const preparedView = summary.preparedView;
const combined = summary.combined;
const baseMedian =
  flow === "pretext-layout"
    ? (baseText?.interactionMedianMs ?? null)
    : (combined?.baseMedianMs ?? baseText?.interactionMedianMs ?? null);
const preparedMedian =
  flow === "pretext-layout"
    ? (preparedView?.renderInteractionMedianMs ?? null)
    : (combined?.preparedMedianMs ??
      preparedView?.renderInteractionMedianMs ??
      null);
const preparedP95 =
  flow === "pretext-layout"
    ? (preparedView?.renderInteractionP95Ms ?? null)
    : (combined?.preparedP95Ms ?? preparedView?.renderInteractionP95Ms ?? null);
const preparedMedianRatio = numericRatio(preparedMedian, baseMedian);
const preparedP95Ratio = numericRatio(preparedP95, baseText?.interactionP95Ms);
const timingChecks = createCheckState();
const contractChecks = createCheckState();

if (thresholds.requireCompleted) {
  if (flow === "base-text") {
    requireCompletedStatus(contractChecks, "base-text", baseText);
  } else if (flow === "pretext-layout") {
    requireCompletedStatus(contractChecks, "base-text", baseText);
    requireCompletedStatus(contractChecks, "pretext-layout", preparedView);
  } else {
    requireCompletedStatus(contractChecks, "base-text", baseText);
    requireCompletedStatus(contractChecks, "pretext-layout", preparedView);
    requireCompletedStatus(contractChecks, "combined", combined);
  }
}

if (flow === "base-text") {
  requirePresentMetric(
    timingChecks,
    "base interaction median",
    baseText?.interactionMedianMs ?? combined?.baseMedianMs,
  );
  assertBaseTextContract(contractChecks, baseText);
}

if (flow === "pretext-layout" || flow === "suite") {
  assertBaseTextContract(contractChecks, baseText);
  assertPreparedContract(
    contractChecks,
    "prepared compute",
    preparedView,
    "compute",
    "canonical_prepared_compute",
    "prepared_compute",
  );
  assertPreparedContract(
    contractChecks,
    "pretext visible surface",
    preparedView,
    "render",
    "canonical_prepared_compute",
    "rn_text",
  );

  requirePresentMetric(timingChecks, "base median", baseMedian);
  requirePresentMetric(timingChecks, "Pretext surface median", preparedMedian);
  requirePresentMetric(
    timingChecks,
    "Pretext layout-only median",
    preparedView?.computeLayoutOnlyMedianMs ??
      combined?.preparedLayoutOnlyMedianMs,
  );
  requirePresentMetric(timingChecks, "prepare once", preparedView?.prepareMs);

  assertMax(
    timingChecks,
    "Pretext median ratio",
    preparedMedianRatio,
    thresholds.maxPreparedMedianRatio,
    formatRatio,
  );
  assertMax(
    timingChecks,
    "Pretext p95 ratio",
    preparedP95Ratio,
    thresholds.maxPreparedP95Ratio,
    formatRatio,
  );
  assertMax(
    timingChecks,
    "prepare once",
    preparedView?.prepareMs,
    thresholds.maxPrepareMs,
    formatMs,
  );
  assertMax(
    timingChecks,
    "measure batch",
    preparedView?.measureMs,
    thresholds.maxMeasureMs,
    formatMs,
  );
  assertMax(
    timingChecks,
    "build prepared",
    preparedView?.buildPreparedMs,
    thresholds.maxBuildPreparedMs,
    formatMs,
  );
  assertMax(
    timingChecks,
    "tokenize",
    preparedView?.tokenizeMs,
    thresholds.maxTokenizeMs,
    formatMs,
  );
  assertMax(
    timingChecks,
    "layout-only median",
    preparedView?.computeLayoutOnlyMedianMs ??
      combined?.preparedLayoutOnlyMedianMs,
    thresholds.maxLayoutOnlyMedianMs,
    formatMs,
  );
  assertMin(
    contractChecks,
    "render parity checks",
    preparedView?.renderParityChecks,
    thresholds.minRenderParityChecks,
    formatCount,
  );
  assertMax(
    contractChecks,
    "render parity mismatches",
    preparedView?.renderParityMismatches,
    thresholds.maxRenderParityMismatches,
    formatCount,
  );
  assertMin(
    contractChecks,
    "render line-text checks",
    preparedView?.renderLineTextParityChecks,
    thresholds.minRenderLineTextParityChecks,
    formatCount,
  );
  assertMax(
    contractChecks,
    "render line-text mismatches",
    preparedView?.renderLineTextParityMismatches,
    thresholds.maxRenderLineTextParityMismatches,
    formatCount,
  );
  assertMin(
    contractChecks,
    "compute parity checks",
    preparedView?.computeParityChecks,
    thresholds.minComputeParityChecks,
    formatCount,
  );
  assertMax(
    contractChecks,
    "compute parity mismatches",
    preparedView?.computeParityMismatches,
    thresholds.maxComputeParityMismatches,
    formatCount,
  );
  assertMin(
    contractChecks,
    "compute line-text checks",
    preparedView?.computeLineTextParityChecks,
    thresholds.minComputeLineTextParityChecks,
    formatCount,
  );
  assertMax(
    contractChecks,
    "compute line-text mismatches",
    preparedView?.computeLineTextParityMismatches,
    thresholds.maxComputeLineTextParityMismatches,
    formatCount,
  );
}

function renderCheckSection(title, state) {
  return [
    title,
    ...(state.passes.length === 0
      ? ["  PASS none"]
      : state.passes.map((check) => renderCheckLine("  PASS", check))),
    ...(state.failures.length === 0
      ? []
      : state.failures.map((check) => renderCheckLine("  FAIL", check))),
  ];
}

const reportLines = [
  "Benchmark Quality Gate",
  labelValue("profile", profile),
  labelValue("platform", titleCase(platform)),
  labelValue("flow", titleCase(flow)),
  labelValue("log", path.resolve(logPath)),
  "",
  "Thresholds",
  ...Object.entries(thresholds).map(([key, value]) =>
    labelValue(key, typeof value === "number" ? String(value) : String(value)),
  ),
  "",
  ...renderCheckSection("Timing Checks", timingChecks),
  "",
  ...renderCheckSection("Parity Contract Checks", contractChecks),
];

const report = reportLines.join("\n").trimEnd();
fs.writeFileSync(reportPath, `${report}\n`);
process.stdout.write(`${report}\n`);

if (timingChecks.failures.length > 0 || contractChecks.failures.length > 0) {
  process.exit(1);
}

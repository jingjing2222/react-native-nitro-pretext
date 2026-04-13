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

function renderCheckLine(prefix, check) {
  return `${prefix} ${check.label} (actual ${check.actual}, expected ${check.threshold})`;
}

const thresholds = resolveThresholds();
const baseText = summary.baseText;
const preparedView = summary.preparedView;
const combined = summary.combined;
const baseMedian =
  flow === "prepared-view"
    ? (baseText?.interactionMedianMs ?? null)
    : (combined?.baseMedianMs ?? baseText?.interactionMedianMs ?? null);
const preparedMedian =
  flow === "prepared-view"
    ? (preparedView?.renderInteractionMedianMs ?? null)
    : (combined?.preparedMedianMs ??
      preparedView?.renderInteractionMedianMs ??
      null);
const preparedP95 =
  flow === "prepared-view"
    ? (preparedView?.renderInteractionP95Ms ?? null)
    : (combined?.preparedP95Ms ?? preparedView?.renderInteractionP95Ms ?? null);
const preparedMedianRatio = numericRatio(preparedMedian, baseMedian);
const preparedP95Ratio = numericRatio(preparedP95, baseText?.interactionP95Ms);
const checks = createCheckState();

if (thresholds.requireCompleted) {
  if (flow === "base-text") {
    requireCompletedStatus(checks, "base-text", baseText);
  } else if (flow === "prepared-view") {
    requireCompletedStatus(checks, "base-text", baseText);
    requireCompletedStatus(checks, "prepared-view", preparedView);
  } else {
    requireCompletedStatus(checks, "base-text", baseText);
    requireCompletedStatus(checks, "prepared-view", preparedView);
    requireCompletedStatus(checks, "combined", combined);
  }
}

if (flow === "base-text") {
  requirePresentMetric(
    checks,
    "base interaction median",
    baseText?.interactionMedianMs ?? combined?.baseMedianMs,
  );
}

if (flow === "prepared-view" || flow === "suite") {
  requirePresentMetric(checks, "base median", baseMedian);
  requirePresentMetric(checks, "prepared render median", preparedMedian);
  requirePresentMetric(
    checks,
    "prepared layout-only median",
    preparedView?.computeLayoutOnlyMedianMs ??
      combined?.preparedLayoutOnlyMedianMs,
  );
  requirePresentMetric(checks, "prepare once", preparedView?.prepareMs);

  assertMax(
    checks,
    "prepared median ratio",
    preparedMedianRatio,
    thresholds.maxPreparedMedianRatio,
    formatRatio,
  );
  assertMax(
    checks,
    "prepared p95 ratio",
    preparedP95Ratio,
    thresholds.maxPreparedP95Ratio,
    formatRatio,
  );
  assertMax(
    checks,
    "prepare once",
    preparedView?.prepareMs,
    thresholds.maxPrepareMs,
    formatMs,
  );
  assertMax(
    checks,
    "measure batch",
    preparedView?.measureMs,
    thresholds.maxMeasureMs,
    formatMs,
  );
  assertMax(
    checks,
    "build prepared",
    preparedView?.buildPreparedMs,
    thresholds.maxBuildPreparedMs,
    formatMs,
  );
  assertMax(
    checks,
    "tokenize",
    preparedView?.tokenizeMs,
    thresholds.maxTokenizeMs,
    formatMs,
  );
  assertMax(
    checks,
    "layout-only median",
    preparedView?.computeLayoutOnlyMedianMs ??
      combined?.preparedLayoutOnlyMedianMs,
    thresholds.maxLayoutOnlyMedianMs,
    formatMs,
  );
  assertMin(
    checks,
    "render parity checks",
    preparedView?.renderParityChecks,
    thresholds.minRenderParityChecks,
    formatCount,
  );
  assertMax(
    checks,
    "render parity mismatches",
    preparedView?.renderParityMismatches,
    thresholds.maxRenderParityMismatches,
    formatCount,
  );
  assertMin(
    checks,
    "render line-text checks",
    preparedView?.renderLineTextParityChecks,
    thresholds.minRenderLineTextParityChecks,
    formatCount,
  );
  assertMax(
    checks,
    "render line-text mismatches",
    preparedView?.renderLineTextParityMismatches,
    thresholds.maxRenderLineTextParityMismatches,
    formatCount,
  );
  assertMin(
    checks,
    "compute parity checks",
    preparedView?.computeParityChecks,
    thresholds.minComputeParityChecks,
    formatCount,
  );
  assertMax(
    checks,
    "compute parity mismatches",
    preparedView?.computeParityMismatches,
    thresholds.maxComputeParityMismatches,
    formatCount,
  );
  assertMin(
    checks,
    "compute line-text checks",
    preparedView?.computeLineTextParityChecks,
    thresholds.minComputeLineTextParityChecks,
    formatCount,
  );
  assertMax(
    checks,
    "compute line-text mismatches",
    preparedView?.computeLineTextParityMismatches,
    thresholds.maxComputeLineTextParityMismatches,
    formatCount,
  );
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
  "Checks",
  ...(checks.passes.length === 0
    ? ["  PASS none"]
    : checks.passes.map((check) => renderCheckLine("  PASS", check))),
  ...(checks.failures.length === 0
    ? []
    : checks.failures.map((check) => renderCheckLine("  FAIL", check))),
];

const report = reportLines.join("\n").trimEnd();
fs.writeFileSync(reportPath, `${report}\n`);
process.stdout.write(`${report}\n`);

if (checks.failures.length > 0) {
  process.exit(1);
}

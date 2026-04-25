#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const {
  formatCount,
  labelValue,
  readBenchmarkLog,
  titleCase,
} = require("./benchmark-report-utils");

const [, , logPath, outputDirArg, platformArg] = process.argv;

if (!logPath || !outputDirArg) {
  console.error(
    "usage: node example/maestro/scripts/format-parity-artifacts.js <maestro.log> <output-dir> [platform]",
  );
  process.exit(1);
}

const outputDir = path.resolve(outputDirArg);
const platform = platformArg ?? "unknown";
const { summary } = readBenchmarkLog(logPath);
const parity = summary.parity;

if (!parity) {
  throw new Error("No benchmark/parity report found in maestro.log");
}

const mismatches = Array.isArray(parity.mismatches) ? parity.mismatches : [];
const failedCaseResults = Array.isArray(parity.failedCaseResults)
  ? parity.failedCaseResults
  : [];

function valueForDisplay(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return JSON.stringify(value);
}

function mismatchKey(mismatch) {
  return [
    mismatch.caseId ?? "unknown-case",
    mismatch.kind ?? "unknown-kind",
    mismatch.firstDiff?.field ?? "unknown-field",
  ].join("::");
}

function contractFromMismatch(mismatch) {
  return {
    caseId: mismatch.caseId ?? "unknown-case",
    category: mismatch.category ?? "unknown",
    firstDiff: mismatch.firstDiff ?? null,
    kind: mismatch.kind ?? "unknown-kind",
    platform: mismatch.platform ?? platform,
    style: mismatch.style ?? null,
    width: mismatch.width ?? null,
  };
}

function buildContracts() {
  const seen = new Set();
  const contracts = [];

  for (const mismatch of mismatches) {
    const key = mismatchKey(mismatch);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    contracts.push(contractFromMismatch(mismatch));
  }

  return contracts.sort((left, right) =>
    `${left.category}:${left.caseId}:${left.kind}`.localeCompare(
      `${right.category}:${right.caseId}:${right.kind}`,
    ),
  );
}

function formatMismatchLine(mismatch) {
  const firstDiff = mismatch.firstDiff ?? {};
  const lineIndex =
    firstDiff.lineIndex === null || firstDiff.lineIndex === undefined
      ? "n/a"
      : String(firstDiff.lineIndex);

  return `  ${mismatch.caseId ?? "unknown-case"} [${mismatch.category ?? "unknown"}] ${mismatch.kind ?? "unknown-kind"} width=${mismatch.width ?? "n/a"} firstDiff=${firstDiff.field ?? "n/a"} line=${lineIndex} rn=${valueForDisplay(firstDiff.rnValue)} pretext=${valueForDisplay(firstDiff.pretextValue)}`;
}

function formatFailedCaseLine(failedCase) {
  return `  ${failedCase.caseId ?? "unknown-case"} [${failedCase.category ?? "unknown"}] ${valueForDisplay(failedCase.errorMessage)}`;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

fs.mkdirSync(outputDir, { recursive: true });

const summaryPath = path.join(outputDir, "latest-parity-summary.txt");
const mismatchesPath = path.join(outputDir, "latest-parity-mismatches.json");
const contractsPath = path.join(outputDir, "latest-parity-contracts.json");
const contracts = buildContracts();

const summaryLines = [
  "RN Text Parity Report",
  labelValue("platform", titleCase(platform)),
  labelValue("log", path.resolve(logPath)),
  labelValue("completed", parity.completedAt ?? "n/a"),
  labelValue("status", parity.status ?? "n/a"),
  labelValue(
    "cases",
    `${formatCount(parity.completedCases)}/${formatCount(parity.caseCount)}`,
  ),
  labelValue("mismatches", formatCount(parity.mismatchCount)),
  labelValue(
    "line count",
    `${formatCount(parity.lineCountMismatches)}/${formatCount(parity.caseCount)} mismatches`,
  ),
  labelValue(
    "line text",
    `${formatCount(parity.lineTextMismatches)}/${formatCount(parity.caseCount)} mismatches`,
  ),
  labelValue(
    "line geometry",
    `${formatCount(parity.lineGeometryMismatches)}/${formatCount(parity.caseCount)} mismatches`,
  ),
  labelValue("contract candidates", formatCount(contracts.length)),
  "",
  "Failed Case Details",
  ...(failedCaseResults.length === 0
    ? ["  none"]
    : failedCaseResults.slice(0, 40).map(formatFailedCaseLine)),
  ...(failedCaseResults.length > 40
    ? [`  ... ${failedCaseResults.length - 40} more failed cases omitted`]
    : []),
  "",
  "Mismatch Details",
  ...(mismatches.length === 0
    ? ["  none"]
    : mismatches.slice(0, 40).map(formatMismatchLine)),
  ...(mismatches.length > 40
    ? [`  ... ${mismatches.length - 40} more mismatches omitted`]
    : []),
  "",
  "Artifacts",
  labelValue("summary", summaryPath),
  labelValue("mismatches", mismatchesPath),
  labelValue("contracts", contractsPath),
];

const summaryText = `${summaryLines.join("\n").trimEnd()}\n`;
fs.writeFileSync(summaryPath, summaryText);
writeJson(mismatchesPath, mismatches);
writeJson(contractsPath, contracts);
process.stdout.write(summaryText);

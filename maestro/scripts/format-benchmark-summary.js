#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const [, , logPath, summaryPath, platformArg, flowArg] = process.argv;

if (!logPath || !summaryPath) {
  console.error(
    "usage: node maestro/scripts/format-benchmark-summary.js <maestro.log> <summary.txt> [platform] [flow]",
  );
  process.exit(1);
}

const platform = platformArg ?? "unknown";
const flow = flowArg ?? "unknown";
const logContents = fs.readFileSync(logPath, "utf8");
const reports = {};
let suite = null;

function safeParseJson(raw, description) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse ${description}: ${error.message}`);
  }
}

for (const line of logContents.split(/\r?\n/)) {
  const jsConsoleIndex = line.indexOf("JsConsole: ");

  if (jsConsoleIndex < 0) {
    continue;
  }

  const payload = line.slice(jsConsoleIndex + "JsConsole: ".length).trim();

  if (payload.startsWith("BENCHMARK_REPORT::")) {
    const reportPayload = payload.slice("BENCHMARK_REPORT::".length);
    const separatorIndex = reportPayload.indexOf("::");

    if (separatorIndex < 0) {
      continue;
    }

    const screen = reportPayload.slice(0, separatorIndex);
    const rawJson = reportPayload.slice(separatorIndex + 2);
    reports[screen] = safeParseJson(rawJson, `report for ${screen}`);
    continue;
  }

  if (payload.startsWith("BENCHMARK_SUITE::")) {
    suite = safeParseJson(
      payload.slice("BENCHMARK_SUITE::".length),
      "benchmark suite",
    );
  }
}

const summary = suite ?? {
  baseText: reports["benchmark/base-text"] ?? null,
  combined: reports["benchmark/index"] ?? null,
  preparedView: reports["benchmark/prepared-view"] ?? null,
};

if (!summary.baseText && !summary.combined && !summary.preparedView) {
  throw new Error(`No benchmark events found in ${logPath}`);
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return Number(value).toFixed(digits);
}

function formatMs(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${formatNumber(value)} ms`;
}

function formatSignedMs(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)} ms`;
}

function formatCount(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return String(value);
}

function labelValue(label, value) {
  return `  ${label.padEnd(20, " ")} ${value}`;
}

function titleCase(value) {
  if (value === "ios") {
    return "iOS";
  }

  if (value === "android") {
    return "Android";
  }

  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildComparisonNotes(combined) {
  if (!combined) {
    return ["  comparison           n/a"];
  }

  const notes = [];
  const baseMedian = combined.baseMedianMs ?? null;
  const preparedMedian = combined.preparedMedianMs ?? null;
  const preparedLayoutOnly = combined.preparedLayoutOnlyMedianMs ?? null;
  const prepareMs = combined.prepareMs ?? null;

  if (baseMedian !== null && preparedMedian !== null) {
    const delta = preparedMedian - baseMedian;

    if (delta < 0) {
      notes.push(
        `  verdict              prepared render is faster end-to-end by ${formatMs(
          Math.abs(delta),
        )}`,
      );

      if (prepareMs !== null && delta !== 0) {
        notes.push(
          `  amortization         about ${Math.ceil(
            prepareMs / Math.abs(delta),
          )} relayouts to earn back prepare cost`,
        );
      }
    } else if (delta > 0) {
      notes.push(
        `  verdict              prepared render is slower end-to-end by ${formatMs(
          delta,
        )}`,
      );
      notes.push(
        "  amortization         no payback while prepared render stays slower",
      );
    } else {
      notes.push(
        "  verdict              prepared render matches BaseText on median interaction",
      );
    }
  }

  if (preparedLayoutOnly !== null) {
    notes.push(
      `  hot path             prepared layout-only relayout costs ${formatMs(
        preparedLayoutOnly,
      )}`,
    );
  }

  if (notes.length === 0) {
    return ["  verdict              n/a"];
  }

  return notes;
}

const baseText = summary.baseText;
const preparedView = summary.preparedView;
const combined = summary.combined;
const reportLines = [
  "Benchmark Report",
  labelValue("platform", titleCase(platform)),
  labelValue("flow", titleCase(flow)),
  labelValue("log", path.resolve(logPath)),
  "",
];

if (baseText) {
  reportLines.push("BaseText");
  reportLines.push(
    labelValue("completed", baseText.completedAt ?? "n/a"),
    labelValue("median interaction", formatMs(baseText.interactionMedianMs)),
    labelValue("p95 interaction", formatMs(baseText.interactionP95Ms)),
    labelValue("jank frames", formatCount(baseText.jankCount)),
    labelValue(
      "line parity",
      `${formatCount(baseText.parityMismatches)}/${formatCount(
        baseText.parityChecks,
      )} mismatches`,
    ),
    labelValue("total runs", formatCount(baseText.totalRuns)),
    "",
  );
}

if (preparedView) {
  reportLines.push("Prepared View");
  reportLines.push(
    labelValue("completed", preparedView.completedAt ?? "n/a"),
    labelValue("prepare once", formatMs(preparedView.prepareMs)),
    labelValue("tokenize", formatMs(preparedView.tokenizeMs)),
    labelValue("measure", formatMs(preparedView.measureMs)),
    labelValue("build state", formatMs(preparedView.buildPreparedMs)),
    labelValue(
      "layout-only median",
      formatMs(preparedView.computeLayoutOnlyMedianMs),
    ),
    labelValue(
      "render median",
      formatMs(preparedView.renderInteractionMedianMs),
    ),
    labelValue("render p95", formatMs(preparedView.renderInteractionP95Ms)),
    labelValue("total runs", formatCount(preparedView.totalRuns)),
    "",
  );
}

if (combined) {
  reportLines.push("Comparison");
  reportLines.push(
    labelValue("base median", formatMs(combined.baseMedianMs)),
    labelValue("prepared median", formatMs(combined.preparedMedianMs)),
    labelValue(
      "median delta",
      `${formatSignedMs(combined.medianDeltaMs)} (${combined.medianDeltaMs > 0 ? "prepared slower" : combined.medianDeltaMs < 0 ? "prepared faster" : "tied"})`,
    ),
    labelValue("prepared p95", formatMs(combined.preparedP95Ms)),
    labelValue(
      "p95 delta",
      `${formatSignedMs(combined.p95DeltaMs)} (${combined.p95DeltaMs > 0 ? "prepared slower" : combined.p95DeltaMs < 0 ? "prepared faster" : "tied"})`,
    ),
    labelValue(
      "layout-only median",
      formatMs(combined.preparedLayoutOnlyMedianMs),
    ),
    "",
    ...buildComparisonNotes(combined),
    "",
  );
}

reportLines.push("Artifacts");
reportLines.push(labelValue("summary", path.resolve(summaryPath)));

const report = reportLines.join("\n").trimEnd();
fs.writeFileSync(summaryPath, `${report}\n`);
process.stdout.write(`${report}\n`);

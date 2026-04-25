const fs = require("node:fs");

function safeParseJson(raw, description) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse ${description}: ${error.message}`);
  }
}

function buildSummary(reports, suite) {
  return (
    suite ?? {
      baseText: reports["benchmark/base-text"] ?? null,
      combined: reports["benchmark/index"] ?? null,
      parity: reports["benchmark/parity"] ?? null,
      preparedView: reports["benchmark/pretext-layout"] ?? null,
    }
  );
}

function expandParityReport(report) {
  if (
    report.screen !== "benchmark/parity" ||
    !Array.isArray(report.mismatchGroups)
  ) {
    return report;
  }

  const mismatches = report.mismatchGroups.flatMap((group) =>
    (Array.isArray(group.mismatches) ? group.mismatches : []).map(
      (mismatch) => ({
        caseId: group.caseId,
        category: group.category,
        firstDiff: mismatch.firstDiff,
        kind: mismatch.kind,
        platform: group.platform ?? report.platform,
        pretextLines: group.pretextLines ?? [],
        rnLines: group.rnLines ?? [],
        shapeSlices: group.shapeSlices,
        style: group.style ?? null,
        width: group.width ?? null,
      }),
    ),
  );

  const expandedReport = { ...report };
  delete expandedReport.mismatchGroups;
  delete expandedReport.transportVersion;

  return {
    ...expandedReport,
    mismatches,
  };
}

function parseBenchmarkLog(logContents) {
  const reports = {};
  let suite = null;

  for (const line of logContents.split(/\r?\n/u)) {
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
      reports[screen] = expandParityReport(
        safeParseJson(rawJson, `report for ${screen}`),
      );
      continue;
    }

    if (payload.startsWith("BENCHMARK_SUITE::")) {
      suite = safeParseJson(
        payload.slice("BENCHMARK_SUITE::".length),
        "benchmark suite",
      );
    }
  }

  const summary = buildSummary(reports, suite);

  if (
    !summary.baseText &&
    !summary.combined &&
    !summary.parity &&
    !summary.preparedView
  ) {
    throw new Error("No benchmark events found in maestro.log");
  }

  return {
    reports,
    summary,
  };
}

function readBenchmarkLog(logPath) {
  const logContents = fs.readFileSync(logPath, "utf8");

  return parseBenchmarkLog(logContents);
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

function formatRatio(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${Number(value).toFixed(2)}x`;
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
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

module.exports = {
  formatCount,
  formatMs,
  formatNumber,
  formatRatio,
  formatSignedMs,
  labelValue,
  readBenchmarkLog,
  titleCase,
};

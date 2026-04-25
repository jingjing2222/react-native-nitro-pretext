const raw = maestro.copiedText || "";
const jsonStart = raw.indexOf("{");

if (jsonStart < 0) {
  throw new Error(`Missing benchmark report JSON: ${raw}`);
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

const report = expandParityReport(JSON.parse(raw.slice(jsonStart)));
const key = reportName || report.screen.replace(/[^a-z0-9]+/gi, "_");

output.reports = output.reports || {};
output.reports[key] = report;

console.log(`BENCHMARK_REPORT::${report.screen}::${JSON.stringify(report)}`);

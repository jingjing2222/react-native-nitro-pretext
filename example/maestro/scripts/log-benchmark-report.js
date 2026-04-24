const raw = maestro.copiedText || "";
const jsonStart = raw.indexOf("{");

if (jsonStart < 0) {
  throw new Error(`Missing benchmark report JSON: ${raw}`);
}

const report = JSON.parse(raw.slice(jsonStart));
const key = reportName || report.screen.replace(/[^a-z0-9]+/gi, "_");

output.reports = output.reports || {};
output.reports[key] = report;

console.log(`BENCHMARK_REPORT::${report.screen}::${JSON.stringify(report)}`);

const raw = maestro.copiedText || "";
const marker = `${reportPrefix}::${routePath}::`;
const markerIndex = raw.indexOf(marker);

if (markerIndex < 0) {
  throw new Error(`Missing API example report marker ${marker}: ${raw}`);
}

const report = JSON.parse(raw.slice(markerIndex + marker.length));
const required = (requiredFields || "")
  .split(",")
  .map((field) => field.trim())
  .filter(Boolean);

for (const field of required) {
  if (!(field in report)) {
    throw new Error(
      `${routePath} report is missing ${field}: ${JSON.stringify(report)}`,
    );
  }
}

output.apiExampleReports = output.apiExampleReports || {};
output.apiExampleReports[routePath] = report;

console.log(`API_EXAMPLE_CAPTURED::${routePath}::${JSON.stringify(report)}`);

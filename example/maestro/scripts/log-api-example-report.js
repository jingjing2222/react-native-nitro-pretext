const raw = maestro.copiedText || "";
const marker = `${reportPrefix}::${routePath}::`;
const markerIndex = raw.indexOf(marker);

if (markerIndex < 0) {
  throw new Error(`Missing API example report marker ${marker}: ${raw}`);
}

const report = JSON.parse(raw.slice(markerIndex + marker.length));
const required = (typeof requiredFields === "string" ? requiredFields : "")
  .split(",")
  .map((field) => field.trim())
  .filter(Boolean);

function assertReport(condition, message) {
  if (!condition) {
    throw new Error(`${routePath} ${message}: ${JSON.stringify(report)}`);
  }
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

for (const field of required) {
  assertReport(field in report, `report is missing ${field}`);
}

if (routePath === "examples/use-case/prepare") {
  assertReport(report.hasPrepared === true, "must prepare native state");
  assertReport(report.paragraphCount > 0, "must expose paragraphCount");
  assertReport(report.rawNativeIdExposed === false, "must hide native id");
  assertReport(report.released === true, "must exercise release()");
  assertReport(
    typeof report.releaseError === "string" &&
      report.releaseError.includes("released"),
    "must reject layout() after release()",
  );
}

if (routePath === "examples/use-case/layout-metrics") {
  assertReport(report.output === "metrics", "must return metrics output");
  assertReport(isPositiveNumber(report.height), "must return positive height");
  assertReport(report.lineCount > 0, "must return positive lineCount");
  assertReport(
    isPositiveNumber(report.maxLineWidth),
    "must return positive maxLineWidth",
  );
}

if (routePath === "examples/use-case/layout-options") {
  assertReport(
    isPositiveNumber(report.objectHeight),
    "must return object layout height",
  );
  assertReport(report.objectLineCount > 0, "must return object line count");
  assertReport(
    report.optionLineCount > 0,
    "must return line geometry for options",
  );
  assertReport(
    report.firstOptionLineLeft === report.left ||
      report.firstOptionLineLeft === 58,
    "must expose option line left geometry",
  );
}

if (routePath === "examples/use-case/layout-lines") {
  assertReport(report.output === "lines", "must return lines output");
  assertReport(report.lineCount > 0, "must return line rows");
  assertReport(report.firstLine !== null, "must expose first line geometry");
}

if (routePath === "examples/use-case/layout-diagnostics") {
  assertReport(report.output === "diagnostics", "must return diagnostics");
  assertReport(
    typeof report.layoutEngine === "string" && report.layoutEngine.length > 0,
    "must expose layoutEngine",
  );
  assertReport(
    typeof report.heightMetricSource === "string" &&
      report.heightMetricSource.length > 0,
    "must expose heightMetricSource",
  );
  assertReport(
    report.normalizedRequest !== null,
    "must expose normalizedRequest",
  );
}

if (routePath === "examples/use-case/layout-rich") {
  assertReport(report.output === "rich", "must return rich output");
  assertReport(report.boxFrameCount > 0, "must return inline box frames");
  assertReport(
    Array.isArray(report.boxFrames) &&
      report.boxFrames.length === report.boxFrameCount,
    "must include box frame records",
  );
}

if (routePath === "examples/use-case/use-pretext-layout") {
  assertReport(report.enabled === true, "must run while enabled");
  assertReport(report.isPreparing === false, "must finish preparing");
  assertReport(
    report.layoutOutput === report.output,
    "must return requested output",
  );
  assertReport(report.paragraphCount > 0, "must expose paragraphCount");
}

if (routePath === "examples/use-case/namespace-and-types") {
  assertReport(
    report.sameMetrics === true,
    "namespace and named metrics must match",
  );
  assertReport(
    Object.values(report.functionMatches || {}).every(Boolean),
    "namespace functions must match named exports",
  );
  assertReport(
    Array.isArray(report.exportedTypes) && report.exportedTypes.length >= 20,
    "must enumerate exported type helpers",
  );
}

if (routePath.startsWith("examples/non-use-case/")) {
  assertReport(report.renderPassCount > 0, "must expose renderPassCount");

  if ("callbackCount" in report) {
    assertReport(report.callbackCount > 0, "must receive callbacks");
  }

  if ("layoutCallbackCount" in report) {
    assertReport(
      report.layoutCallbackCount > 0,
      "must receive onLayout callbacks",
    );
  }

  if ("textLayoutCallbackCount" in report) {
    assertReport(
      report.textLayoutCallbackCount > 0,
      "must receive onTextLayout callbacks",
    );
  }
}

output.apiExampleReports = output.apiExampleReports || {};
output.apiExampleReports[routePath] = report;

console.log(`API_EXAMPLE_CAPTURED::${routePath}::${JSON.stringify(report)}`);

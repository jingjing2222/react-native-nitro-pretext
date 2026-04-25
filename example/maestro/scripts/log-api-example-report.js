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

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalNumberList(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
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
  assertReport(report.ready === true, "must finish namespace comparison");
  assertReport(report.error === null, "must not report namespace errors");
  assertReport(
    report.sameMetrics === true,
    "namespace and named metrics must match",
  );
  assertReport(
    isPositiveNumber(report.namedHeight) &&
      isPositiveNumber(report.namespaceHeight),
    "must expose positive named and namespace heights",
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

if (routePath === "examples/pretext-react-native-example") {
  const minCircleMoves = optionalNumber(
    typeof minimumCircleMoves === "undefined" ? null : minimumCircleMoves,
  );
  const minCircleSamples = optionalNumber(
    typeof minimumCircleSamples === "undefined" ? null : minimumCircleSamples,
  );
  const requiredCircleGridCells = optionalNumberList(
    typeof requiredGridCells === "undefined" ? "" : requiredGridCells,
  );

  assertReport(report.previewWidth > 0, "must measure preview width");
  assertReport(report.lineCount > 0, "must produce line geometry");
  assertReport(report.shapeSliceCount > 0, "must produce circle shape slices");
  assertReport(
    isNonNegativeNumber(report.shapeLayoutClearance),
    "must report shape layout clearance",
  );
  assertReport(
    report.intrudingLineCount === 0,
    "must keep lines outside the circle obstacle",
  );
  assertReport(
    report.minObstacleClearance === null || report.minObstacleClearance >= -0.5,
    "must report non-negative obstacle clearance",
  );
  assertReport(
    isNonNegativeNumber(report.circleMoveCount),
    "must report circle move count",
  );
  assertReport(
    isNonNegativeNumber(report.motionSampledPositionCount),
    "must report sampled circle positions",
  );
  assertReport(
    Array.isArray(report.motionVisitedGridCells),
    "must report visited circle grid cells",
  );
  assertReport(
    report.motionVisitedGridCellCount === report.motionVisitedGridCells.length,
    "must report visited circle grid cell count",
  );
  assertReport(
    report.motionSampledPositionCount >= report.circleMoveCount,
    "must sample at least once per completed circle move",
  );
  assertReport(
    report.motionMaxIntrudingLineCount === 0,
    "must keep every sampled circle position outside text",
  );
  assertReport(
    report.motionIntrudingSampleCount === 0,
    "must not observe any intruding circle position",
  );
  assertReport(
    report.motionMinObstacleClearance === null ||
      report.motionMinObstacleClearance >= -0.5,
    "must report non-negative sampled obstacle clearance",
  );

  if (minCircleMoves !== null) {
    assertReport(
      report.circleMoveCount >= minCircleMoves,
      `must complete at least ${minCircleMoves} circle moves`,
    );
  }

  if (minCircleSamples !== null) {
    assertReport(
      report.motionSampledPositionCount >= minCircleSamples,
      `must sample at least ${minCircleSamples} circle positions`,
    );
  }

  for (const cell of requiredCircleGridCells) {
    assertReport(
      report.motionVisitedGridCells.includes(cell),
      `must visit circle grid cell ${cell}`,
    );
  }
}

if (routePath.startsWith("examples/non-use-case/")) {
  assertReport(report.renderPassCount > 0, "must expose renderPassCount");
  const hiddenNodeCount =
    typeof report.hiddenNodeCount === "number" &&
    Number.isFinite(report.hiddenNodeCount)
      ? report.hiddenNodeCount
      : 0;

  if ("ready" in report) {
    assertReport(report.ready === true, "must finish hidden measurement");
  }

  if ("readyCount" in report && hiddenNodeCount > 0) {
    assertReport(
      report.readyCount === hiddenNodeCount,
      "must measure every hidden node",
    );
  }

  if ("callbackCount" in report) {
    assertReport(report.callbackCount > 0, "must receive callbacks");
    if (hiddenNodeCount > 0) {
      assertReport(
        report.callbackCount >= hiddenNodeCount,
        "must receive every hidden onLayout callback",
      );
    }
  }

  if ("layoutCallbackCount" in report) {
    assertReport(
      report.layoutCallbackCount > 0,
      "must receive onLayout callbacks",
    );
    if (hiddenNodeCount > 0) {
      assertReport(
        report.layoutCallbackCount >= hiddenNodeCount,
        "must receive every hidden onLayout callback",
      );
    }
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

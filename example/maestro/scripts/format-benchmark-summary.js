#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const {
  formatCount,
  formatMs,
  formatRatio,
  formatSignedMs,
  labelValue,
  readBenchmarkLog,
  titleCase,
} = require("./benchmark-report-utils");

const [, , logPath, summaryPath, platformArg, flowArg] = process.argv;

if (!logPath || !summaryPath) {
  console.error(
    "usage: node example/maestro/scripts/format-benchmark-summary.js <maestro.log> <summary.txt> [platform] [flow]",
  );
  process.exit(1);
}

const platform = platformArg ?? "unknown";
const flow = flowArg ?? "unknown";
const { summary } = readBenchmarkLog(logPath);
const baseText = summary.baseText;
const preparedView = summary.preparedView;
const combined = summary.combined;
const parity = summary.parity;
const performanceRatio =
  combined?.preparedMedianMs !== null &&
  combined?.preparedMedianMs !== undefined &&
  combined?.baseMedianMs !== null &&
  combined?.baseMedianMs !== undefined &&
  combined.baseMedianMs > 0
    ? combined.preparedMedianMs / combined.baseMedianMs
    : null;
const p95Ratio =
  combined?.preparedP95Ms !== null &&
  combined?.preparedP95Ms !== undefined &&
  baseText?.interactionP95Ms !== null &&
  baseText?.interactionP95Ms !== undefined &&
  baseText.interactionP95Ms > 0
    ? combined.preparedP95Ms / baseText.interactionP95Ms
    : null;
const renderOverheadMs =
  preparedView?.renderInteractionMedianMs !== null &&
  preparedView?.renderInteractionMedianMs !== undefined &&
  preparedView?.computeLayoutOnlyMedianMs !== null &&
  preparedView?.computeLayoutOnlyMedianMs !== undefined
    ? preparedView.renderInteractionMedianMs -
      preparedView.computeLayoutOnlyMedianMs
    : null;
const engineShare =
  preparedView?.renderInteractionMedianMs !== null &&
  preparedView?.renderInteractionMedianMs !== undefined &&
  preparedView?.renderInteractionMedianMs > 0 &&
  preparedView?.computeLayoutOnlyMedianMs !== null &&
  preparedView?.computeLayoutOnlyMedianMs !== undefined
    ? preparedView.computeLayoutOnlyMedianMs /
      preparedView.renderInteractionMedianMs
    : null;
const measurementShare =
  preparedView?.prepareMs !== null &&
  preparedView?.prepareMs !== undefined &&
  preparedView?.prepareMs > 0 &&
  preparedView?.measureMs !== null &&
  preparedView?.measureMs !== undefined
    ? preparedView.measureMs / preparedView.prepareMs
    : null;

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatList(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return "n/a";
  }

  return value.join(", ");
}

function buildComparisonNotes() {
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
        `  verdict              Pretext surface is faster end-to-end by ${formatMs(
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
        `  verdict              Pretext surface is slower end-to-end by ${formatMs(
          delta,
        )}`,
      );
      notes.push(
        "  amortization         no payback while Pretext surface stays slower",
      );
    } else {
      notes.push(
        "  verdict              Pretext surface matches BaseText on median interaction",
      );
    }
  }

  if (preparedLayoutOnly !== null) {
    notes.push(
      `  hot path             Pretext layout-only relayout costs ${formatMs(
        preparedLayoutOnly,
      )}`,
    );
  }

  if (renderOverheadMs !== null) {
    notes.push(
      `  bottleneck           visible RN surface still costs ${formatMs(
        renderOverheadMs,
      )} beyond hot layout`,
    );
  }

  return notes.length === 0 ? ["  verdict              n/a"] : notes;
}

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
    labelValue("layout engine", baseText.layoutEngine ?? "n/a"),
    labelValue("renderer", baseText.rendererKind ?? "n/a"),
    labelValue("parity role", baseText.parityRole ?? "n/a"),
    labelValue("height source", baseText.heightMetricSource ?? "n/a"),
    labelValue(
      "font padding",
      baseText.includeFontPadding === null ||
        baseText.includeFontPadding === undefined
        ? "n/a"
        : String(baseText.includeFontPadding),
    ),
    labelValue("drift", formatList(baseText.driftKinds)),
    labelValue(
      "line parity",
      `${formatCount(baseText.parityMismatches)}/${formatCount(
        baseText.parityChecks,
      )} mismatches`,
    ),
    labelValue(
      "line text parity",
      `${formatCount(baseText.lineTextParityMismatches)}/${formatCount(
        baseText.lineTextParityChecks,
      )} mismatches`,
    ),
    labelValue("total runs", formatCount(baseText.totalRuns)),
    "",
  );
}

if (preparedView) {
  reportLines.push("Pretext Layout");
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
      "surface median",
      formatMs(preparedView.renderInteractionMedianMs),
    ),
    labelValue("surface p95", formatMs(preparedView.renderInteractionP95Ms)),
    labelValue("surface overhead", formatMs(renderOverheadMs)),
    labelValue("engine share", formatPercent(engineShare)),
    labelValue("measure share", formatPercent(measurementShare)),
    labelValue("surface engine", preparedView.renderLayoutEngine ?? "n/a"),
    labelValue("surface renderer", preparedView.renderRendererKind ?? "n/a"),
    labelValue("surface role", preparedView.renderParityRole ?? "n/a"),
    labelValue(
      "surface height src",
      preparedView.renderHeightMetricSource ?? "n/a",
    ),
    labelValue(
      "surface font pad",
      preparedView.renderIncludeFontPadding === null ||
        preparedView.renderIncludeFontPadding === undefined
        ? "n/a"
        : String(preparedView.renderIncludeFontPadding),
    ),
    labelValue("surface drift", formatList(preparedView.renderDriftKinds)),
    labelValue("compute engine", preparedView.computeLayoutEngine ?? "n/a"),
    labelValue("compute renderer", preparedView.computeRendererKind ?? "n/a"),
    labelValue("compute role", preparedView.computeParityRole ?? "n/a"),
    labelValue(
      "compute height src",
      preparedView.computeHeightMetricSource ?? "n/a",
    ),
    labelValue(
      "compute font pad",
      preparedView.computeIncludeFontPadding === null ||
        preparedView.computeIncludeFontPadding === undefined
        ? "n/a"
        : String(preparedView.computeIncludeFontPadding),
    ),
    labelValue("compute drift", formatList(preparedView.computeDriftKinds)),
    labelValue(
      "surface line parity",
      `${formatCount(preparedView.renderParityMismatches)}/${formatCount(
        preparedView.renderParityChecks,
      )} mismatches`,
    ),
    labelValue(
      "surface text parity",
      `${formatCount(preparedView.renderLineTextParityMismatches)}/${formatCount(
        preparedView.renderLineTextParityChecks,
      )} mismatches`,
    ),
    labelValue(
      "compute line parity",
      `${formatCount(preparedView.computeParityMismatches)}/${formatCount(
        preparedView.computeParityChecks,
      )} mismatches`,
    ),
    labelValue(
      "compute text parity",
      `${formatCount(preparedView.computeLineTextParityMismatches)}/${formatCount(
        preparedView.computeLineTextParityChecks,
      )} mismatches`,
    ),
    labelValue("total runs", formatCount(preparedView.totalRuns)),
    "",
  );
}

if (combined) {
  reportLines.push("Comparison");
  reportLines.push(
    labelValue("base median", formatMs(combined.baseMedianMs)),
    labelValue("Pretext median", formatMs(combined.preparedMedianMs)),
    labelValue(
      "median delta",
      `${formatSignedMs(combined.medianDeltaMs)} (${combined.medianDeltaMs > 0 ? "Pretext slower" : combined.medianDeltaMs < 0 ? "Pretext faster" : "tied"})`,
    ),
    labelValue("median ratio", formatRatio(performanceRatio)),
    labelValue("Pretext p95", formatMs(combined.preparedP95Ms)),
    labelValue(
      "p95 delta",
      `${formatSignedMs(combined.p95DeltaMs)} (${combined.p95DeltaMs > 0 ? "Pretext slower" : combined.p95DeltaMs < 0 ? "Pretext faster" : "tied"})`,
    ),
    labelValue("p95 ratio", formatRatio(p95Ratio)),
    labelValue(
      "layout-only median",
      formatMs(combined.preparedLayoutOnlyMedianMs),
    ),
    labelValue("base engine", combined.baseLayoutEngine ?? "n/a"),
    labelValue(
      "Pretext surface engine",
      combined.preparedRenderLayoutEngine ?? "n/a",
    ),
    labelValue(
      "Pretext compute engine",
      combined.preparedComputeLayoutEngine ?? "n/a",
    ),
    labelValue(
      "surface height src",
      combined.preparedRenderHeightMetricSource ?? "n/a",
    ),
    labelValue(
      "compute height src",
      combined.preparedComputeHeightMetricSource ?? "n/a",
    ),
    labelValue(
      "surface text parity",
      `${formatCount(
        combined.preparedRenderLineTextParityMismatches,
      )}/${formatCount(combined.preparedRenderLineTextParityChecks)} mismatches`,
    ),
    "",
    ...buildComparisonNotes(),
    "",
  );
}

if (parity) {
  reportLines.push("RN Text Parity");
  reportLines.push(
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
    "",
  );
}

reportLines.push("Artifacts");
reportLines.push(labelValue("summary", path.resolve(summaryPath)));

const report = reportLines.join("\n").trimEnd();
fs.writeFileSync(summaryPath, `${report}\n`);
process.stdout.write(`${report}\n`);

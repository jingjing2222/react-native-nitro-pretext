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

  if (renderOverheadMs !== null) {
    notes.push(
      `  bottleneck           renderer/materialization still costs ${formatMs(
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
    labelValue("render overhead", formatMs(renderOverheadMs)),
    labelValue("engine share", formatPercent(engineShare)),
    labelValue("measure share", formatPercent(measurementShare)),
    labelValue(
      "render line parity",
      `${formatCount(preparedView.renderParityMismatches)}/${formatCount(
        preparedView.renderParityChecks,
      )} mismatches`,
    ),
    labelValue(
      "render text parity",
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
    labelValue("prepared median", formatMs(combined.preparedMedianMs)),
    labelValue(
      "median delta",
      `${formatSignedMs(combined.medianDeltaMs)} (${combined.medianDeltaMs > 0 ? "prepared slower" : combined.medianDeltaMs < 0 ? "prepared faster" : "tied"})`,
    ),
    labelValue("median ratio", formatRatio(performanceRatio)),
    labelValue("prepared p95", formatMs(combined.preparedP95Ms)),
    labelValue(
      "p95 delta",
      `${formatSignedMs(combined.p95DeltaMs)} (${combined.p95DeltaMs > 0 ? "prepared slower" : combined.p95DeltaMs < 0 ? "prepared faster" : "tied"})`,
    ),
    labelValue("p95 ratio", formatRatio(p95Ratio)),
    labelValue(
      "layout-only median",
      formatMs(combined.preparedLayoutOnlyMedianMs),
    ),
    labelValue(
      "render text parity",
      `${formatCount(
        combined.preparedRenderLineTextParityMismatches,
      )}/${formatCount(combined.preparedRenderLineTextParityChecks)} mismatches`,
    ),
    "",
    ...buildComparisonNotes(),
    "",
  );
}

reportLines.push("Artifacts");
reportLines.push(labelValue("summary", path.resolve(summaryPath)));

const report = reportLines.join("\n").trimEnd();
fs.writeFileSync(summaryPath, `${report}\n`);
process.stdout.write(`${report}\n`);

const reports = output.reports || {};
const baseText = reports.baseText || null;
const preparedView = reports.preparedView || null;
const combined = reports.combined || null;

console.log(
  `BENCHMARK_SUITE::${JSON.stringify({
    baseText,
    combined,
    preparedView,
  })}`,
);

if (combined) {
  console.log(
    `BENCHMARK_SUMMARY::baseMedianMs=${combined.baseMedianMs ?? "null"}::preparedMedianMs=${combined.preparedMedianMs ?? "null"}::layoutOnlyMedianMs=${combined.preparedLayoutOnlyMedianMs ?? "null"}::medianDeltaMs=${combined.medianDeltaMs ?? "null"}::prepareMs=${combined.prepareMs ?? "null"}::measurementMs=${combined.measurementMs ?? "null"}`,
  );
}

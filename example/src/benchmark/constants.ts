import { StyleSheet } from "react-native";

import { BENCHMARK_STYLE, type BenchmarkMode } from "../relayoutBenchmark";

export const MODE_LABELS: Record<BenchmarkMode, string> = {
  baseline: "BaseText",
  "pretext-render": "Prepared Native View",
  "pretext-compute": "Prepared Layout Only",
};

export const MODE_DESCRIPTIONS: Record<BenchmarkMode, string> = {
  baseline: "문단당 단일 <Text>{rawText}</Text>",
  "pretext-render":
    "prepared paragraph state -> native self-layout -> single custom native paragraph view",
  "pretext-compute":
    "render surface는 유지하고, relayout hot path는 prepared paragraph layout 계산만 다시 수행",
};

export const PARAGRAPH_HORIZONTAL_PADDING = 14;
export const PARAGRAPH_VERTICAL_PADDING = 14;

export function differenceText(
  next: number | null,
  base: number | null,
): string {
  if (next === null || base === null) {
    return "—";
  }

  const delta = next - base;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)} ms`;
}

export function formatMilliseconds(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(2)} ms`;
}

export const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#f3eee5",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#9dd1c4",
  },
  heroCard: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#1d2b2a",
    gap: 16,
  },
  metricPill: {
    minWidth: 132,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#243735",
    gap: 4,
  },
  metricPillLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#89bbb0",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricPillValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f7f2e9",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    color: "#a9c1ba",
  },
  noteMuted: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6e6454",
  },
  paragraph: {
    paddingHorizontal: PARAGRAPH_HORIZONTAL_PADDING,
    paddingVertical: PARAGRAPH_VERTICAL_PADDING,
    borderRadius: 18,
    backgroundColor: "#fffdf8",
    color: "#22211f",
    fontSize: BENCHMARK_STYLE.fontSize,
    lineHeight: BENCHMARK_STYLE.lineHeight,
    letterSpacing: BENCHMARK_STYLE.letterSpacing,
    textAlign: "left",
  },
  paragraphSurface: {
    borderRadius: 18,
    backgroundColor: "#fffdf8",
  },
  paragraphStack: {
    alignItems: "center",
    gap: 16,
  },
  runButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#d66c3d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonPressed: {
    opacity: 0.85,
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fdf5e9",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
    gap: 20,
  },
  stageCard: {
    padding: 18,
    borderRadius: 28,
    backgroundColor: "#fbf6ec",
    borderWidth: 1,
    borderColor: "#e6ddcd",
    gap: 18,
  },
  stageHeader: {
    gap: 8,
  },
  stageLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: "#8a7d66",
  },
  stageMeta: {
    fontSize: 13,
    color: "#6e6454",
  },
  stageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#201e1b",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#c8d7d2",
  },
  summaryCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#fcfaf5",
    borderWidth: 1,
    borderColor: "#e6ddcd",
    gap: 12,
  },
  summaryDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b665f",
  },
  summaryLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1f2725",
  },
  summaryMetricLabel: {
    flex: 1,
    fontSize: 13,
    color: "#5b665f",
  },
  summaryMetricList: {
    gap: 8,
  },
  summaryMetricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryMetricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2725",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#efe6d7",
  },
  optionChipActive: {
    backgroundColor: "#1d2b2a",
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5b665f",
  },
  optionChipTextActive: {
    color: "#f7f2e9",
  },
  exampleStack: {
    gap: 18,
  },
  exampleSurface: {
    alignItems: "center",
    gap: 14,
  },
  codeList: {
    gap: 8,
  },
  codeRow: {
    fontSize: 12,
    lineHeight: 18,
    color: "#3a403c",
    fontFamily: "Menlo",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#f7f2e9",
  },
});

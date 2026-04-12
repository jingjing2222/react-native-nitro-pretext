import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatMilliseconds,
  MODE_DESCRIPTIONS,
  styles,
} from "../benchmark/constants";
import type { AppStackParamList } from "../benchmark/types";
import {
  MetricPill,
  PreparedParagraphSurfaceCard,
  PrimaryButton,
  SummaryMetric,
  SummaryCard,
} from "../components/BenchmarkComponents";
import { useBenchmarkResults } from "../context/BenchmarkResultsContext";
import { usePreparedParagraphs } from "../benchmark/usePreparedParagraphs";
import { usePreparedViewBenchmarkHarness } from "../benchmark/usePreparedViewBenchmarkHarness";

type Props = NativeStackScreenProps<AppStackParamList, "PreparedView">;

export function PreparedParagraphViewBenchmarkScreen(_: Props) {
  const insets = useSafeAreaInsets();
  const { baselineResults, preparedViewResults, setPreparedViewResults } =
    useBenchmarkResults();
  const { isPreparing, prepareMs, prepareStats, preparedParagraphs } =
    usePreparedParagraphs();
  const benchmark = usePreparedViewBenchmarkHarness({
    baselineInteractionMedianMs:
      baselineResults.summary?.interactionMedianMs ?? null,
    baselineSampleLineCountsByWidth: baselineResults.sampleLineCountsByWidth,
    initialCompletedAt: preparedViewResults.completedAt,
    initialSummaries: {
      "pretext-compute": preparedViewResults.computeSummary,
      "pretext-render": preparedViewResults.renderSummary,
    },
    onCompleted: (completion) => {
      setPreparedViewResults({
        completedAt: completion.completedAt,
        computeSummary: completion.summaries["pretext-compute"],
        prepareMs,
        prepareStats,
        renderSummary: completion.summaries["pretext-render"],
      });
    },
    prepareMs,
    preparedParagraphs,
  });

  const comparisonNote =
    baselineResults.summary === null
      ? "Run BaseText once so the prepared view page can compare against the RN Text oracle."
      : "BaseText calibration is loaded. Prepared view runs can now compare parity and amortization.";

  return (
    <View style={styles.appShell}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 56 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Prepared Native View</Text>
          <Text style={styles.title}>
            Feed prepared paragraph state directly into a single native paragraph surface.
          </Text>
          <Text style={styles.subtitle}>
            This page benchmarks the renderer-oriented path: prepared paragraph
            state, native self-relayout, and one native paragraph view per block.
          </Text>

          <View style={styles.metricRow}>
            <MetricPill label="Prepare" value={formatMilliseconds(prepareMs)} />
            <MetricPill
              label="Measure"
              value={formatMilliseconds(prepareStats?.measurementMs ?? null)}
            />
            <MetricPill
              label="Widths"
              value={benchmark.widthSequence.join(" / ")}
            />
            <MetricPill
              label="Status"
              value={
                isPreparing
                  ? "Preparing"
                  : benchmark.isRunning
                    ? `${benchmark.runStatus.runIndex}/${benchmark.totalRuns}`
                    : "Ready"
              }
            />
          </View>

          <PrimaryButton
            disabled={
              isPreparing || benchmark.isRunning || preparedParagraphs === null
            }
            label={
              isPreparing
                ? "Preparing Paragraph State"
                : benchmark.isRunning
                  ? "Running Prepared View Benchmark"
                  : "Run Prepared View Benchmark"
            }
            onPress={() => {
              void benchmark.runBenchmarkSuite();
            }}
            showSpinner={isPreparing}
          />

          <Text style={styles.note}>{comparisonNote}</Text>
        </View>

        <SummaryCard
          description={MODE_DESCRIPTIONS["pretext-render"]}
          label="Prepared Native View Render"
          summary={benchmark.summaries["pretext-render"]}
        />

        <SummaryCard
          description={MODE_DESCRIPTIONS["pretext-compute"]}
          label="Prepared Line Layout Only"
          summary={benchmark.summaries["pretext-compute"]}
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Prepare Breakdown</Text>
          <Text style={styles.summaryDescription}>
            Cold prepare split into text analysis, platform paragraph
            measurement, and prepared state construction.
          </Text>
          <View style={styles.summaryMetricList}>
            <SummaryMetric
              label="Total prepare"
              value={formatMilliseconds(prepareStats?.totalMs ?? null)}
            />
            <SummaryMetric
              label="Analyze text"
              value={formatMilliseconds(prepareStats?.tokenizeMs ?? null)}
            />
            <SummaryMetric
              label="Build measured"
              value={formatMilliseconds(prepareStats?.measurementMs ?? null)}
            />
            <SummaryMetric
              label="Build prepared"
              value={formatMilliseconds(prepareStats?.buildPreparedMs ?? null)}
            />
            <SummaryMetric
              label="Text units"
              value={
                prepareStats === null
                  ? "—"
                  : String(Math.round(prepareStats.totalTokenCount))
              }
            />
            <SummaryMetric
              label="Prepared blocks"
              value={
                prepareStats === null
                  ? "—"
                  : String(Math.round(prepareStats.uniqueTokenCount))
              }
            />
          </View>
        </View>

        <PreparedParagraphSurfaceCard
          activeMode={benchmark.activeMode}
          lastCompletedAt={benchmark.lastCompletedAt}
          onParagraphLayout={benchmark.handleParagraphLayout}
          paragraphMetrics={benchmark.paragraphMetrics}
          paragraphWidth={benchmark.paragraphWidth}
          prepared={preparedParagraphs}
        />
      </ScrollView>
    </View>
  );
}

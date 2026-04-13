import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createAutomationStatusLine,
  createPreparedViewAutomationReport,
  serializeAutomationReport,
} from "../../benchmark/automation";
import {
  formatMilliseconds,
  MODE_DESCRIPTIONS,
  styles,
} from "../../benchmark/constants";
import { usePreparedViewBenchmarkHarness } from "../../benchmark/usePreparedViewBenchmarkHarness";
import {
  HeroAutomationPanel,
  MetricPill,
  PreparedParagraphSurfaceCard,
  PrimaryButton,
  SummaryCard,
  SummaryMetric,
} from "../../components/BenchmarkComponents";
import { useBenchmarkResults } from "../../context/BenchmarkResultsContext";
import { usePreparedParagraphs } from "../../benchmark/usePreparedParagraphs";
import type { AppStackParamList } from "../../benchmark/types";

type Props = NativeStackScreenProps<AppStackParamList, "BenchmarkPreparedView">;

export function PreparedParagraphViewBenchmarkScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { baselineResults, preparedViewResults, setPreparedViewResults } =
    useBenchmarkResults();
  const { isPreparing, prepareMs, prepareStats, preparedParagraphs } =
    usePreparedParagraphs();
  const benchmark = usePreparedViewBenchmarkHarness({
    baselineInteractionMedianMs:
      baselineResults.summary?.interactionMedianMs ?? null,
    baselineSampleLineCountsByWidth: baselineResults.sampleLineCountsByWidth,
    baselineSampleLineTextsByWidth: baselineResults.sampleLineTextsByWidth,
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
      ? "Run benchmark/base-text once so this page can compare against the RN Text oracle."
      : "BaseText calibration is loaded. Prepared view runs can compare parity and amortization.";
  const automationStatus = isPreparing
    ? "preparing"
    : benchmark.isRunning
      ? "running"
      : benchmark.lastCompletedAt !== null
        ? "completed"
        : preparedParagraphs === null
          ? "idle"
          : "ready";
  const automationStatusLine = createAutomationStatusLine(
    "benchmark/prepared-view",
    automationStatus,
    benchmark.runStatus,
  );
  const automationReportLine = serializeAutomationReport(
    "benchmark/prepared-view",
    createPreparedViewAutomationReport({
      completedAt: benchmark.lastCompletedAt,
      computeSummary: benchmark.summaries["pretext-compute"],
      prepareMs,
      prepareState: prepareStats,
      renderSummary: benchmark.summaries["pretext-render"],
      status: automationStatus,
      totalRuns: benchmark.totalRuns,
      widthSequence: benchmark.widthSequence,
    }),
  );
  const renderMedianMs =
    benchmark.summaries["pretext-render"]?.interactionMedianMs ?? null;
  const layoutOnlyMedianMs =
    benchmark.summaries["pretext-compute"]?.layoutOnlyMedianMs ?? null;
  const renderOverheadMs =
    renderMedianMs !== null && layoutOnlyMedianMs !== null
      ? renderMedianMs - layoutOnlyMedianMs
      : null;
  const engineShareText =
    renderMedianMs !== null && renderMedianMs > 0 && layoutOnlyMedianMs !== null
      ? `${((layoutOnlyMedianMs / renderMedianMs) * 100).toFixed(1)}%`
      : "—";
  const measureShareText =
    prepareMs !== null &&
    prepareMs > 0 &&
    prepareStats?.measurementMs !== null &&
    prepareStats?.measurementMs !== undefined
      ? `${((prepareStats.measurementMs / prepareMs) * 100).toFixed(1)}%`
      : "—";

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
          <Text style={styles.eyebrow}>benchmark/prepared-view</Text>
          <Text style={styles.title}>
            Feed prepared paragraph state directly into a native paragraph
            surface.
          </Text>
          <Text style={styles.subtitle}>
            This screen benchmarks the renderer-oriented path: prepared
            paragraph state, native self-relayout, and one native paragraph view
            per block.
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
            testID="benchmark.prepared-view.run"
          />

          <PrimaryButton
            disabled={isPreparing || benchmark.isRunning}
            label="Back to benchmark/*"
            onPress={() => navigation.navigate("BenchmarkIndex")}
            testID="benchmark.prepared-view.back"
          />

          <HeroAutomationPanel
            reportLine={automationReportLine}
            reportTestID="benchmark.prepared-view.report"
            statusLine={automationStatusLine}
            statusTestID="benchmark.prepared-view.status"
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
          <Text style={styles.summaryLabel}>Bottleneck Split</Text>
          <Text style={styles.summaryDescription}>
            Separate the relayout engine from renderer overhead. If render stays
            much larger than layout-only, the next win has to come from the
            surface, not the breaker.
          </Text>
          <View style={styles.summaryMetricList}>
            <SummaryMetric
              label="Render overhead"
              value={formatMilliseconds(renderOverheadMs)}
            />
            <SummaryMetric label="Engine share" value={engineShareText} />
            <SummaryMetric label="Measure share" value={measureShareText} />
          </View>
        </View>

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

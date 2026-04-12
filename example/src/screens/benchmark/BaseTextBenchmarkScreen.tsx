import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createAutomationStatusLine,
  createBaseTextAutomationReport,
  serializeAutomationReport,
} from "../../benchmark/automation";
import { MODE_DESCRIPTIONS, styles } from "../../benchmark/constants";
import { useBenchmarkHarness } from "../../benchmark/useBenchmarkHarness";
import {
  HeroAutomationPanel,
  MetricPill,
  PrimaryButton,
  SummaryCard,
  SurfaceCard,
} from "../../components/BenchmarkComponents";
import { useBenchmarkResults } from "../../context/BenchmarkResultsContext";

export function BaseTextBenchmarkScreen() {
  const insets = useSafeAreaInsets();
  const { baselineResults, setBaselineResults } = useBenchmarkResults();
  const benchmark = useBenchmarkHarness({
    baselineInteractionMedianMs: null,
    baselineSampleLineCountsByWidth: null,
    initialCompletedAt: baselineResults.completedAt,
    initialSummaries: { baseline: baselineResults.summary },
    modes: ["baseline"],
    onCompleted: (completion) => {
      setBaselineResults({
        completedAt: completion.completedAt,
        sampleLineCountsByWidth: completion.sampleLineCountsByWidth ?? null,
        summary: completion.summaries.baseline,
      });
    },
    prepareMs: null,
    preparedParagraphs: null,
  });
  const automationStatus = benchmark.isRunning
    ? "running"
    : benchmark.lastCompletedAt === null
      ? "idle"
      : "completed";
  const automationStatusLine = createAutomationStatusLine(
    "benchmark/base-text",
    automationStatus,
    benchmark.runStatus,
  );
  const automationReportLine = serializeAutomationReport(
    "benchmark/base-text",
    createBaseTextAutomationReport({
      completedAt: benchmark.lastCompletedAt,
      status: automationStatus,
      summary: benchmark.summaries.baseline,
      totalRuns: benchmark.totalRuns,
      widthSequence: benchmark.widthSequence,
    }),
  );

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
          <Text style={styles.eyebrow}>benchmark/base-text</Text>
          <Text style={styles.title}>
            Measure plain React Native &lt;Text&gt; only.
          </Text>
          <Text style={styles.subtitle}>
            This screen owns the baseline interaction cost and the sample
            line-count oracle used by the prepared view benchmark.
          </Text>

          <View style={styles.metricRow}>
            <MetricPill
              label="Widths"
              value={benchmark.widthSequence.join(" / ")}
            />
            <MetricPill label="Mode" value="Baseline only" />
            <MetricPill
              label="Status"
              value={
                benchmark.isRunning
                  ? `${benchmark.runStatus.runIndex}/${benchmark.totalRuns}`
                  : "Ready"
              }
            />
          </View>

          <PrimaryButton
            disabled={benchmark.isRunning}
            label={
              benchmark.isRunning
                ? "Running BaseText Benchmark"
                : "Run BaseText Benchmark"
            }
            onPress={() => {
              void benchmark.runBenchmarkSuite();
            }}
            testID="benchmark.base-text.run"
          />

          <HeroAutomationPanel
            reportLine={automationReportLine}
            reportTestID="benchmark.base-text.report"
            statusLine={automationStatusLine}
            statusTestID="benchmark.base-text.status"
          />
        </View>

        <SummaryCard
          description={MODE_DESCRIPTIONS.baseline}
          label="BaseText Summary"
          summary={benchmark.summaries.baseline}
        />

        <SurfaceCard
          activeMode={benchmark.activeMode}
          lastCompletedAt={benchmark.lastCompletedAt}
          onParagraphLayout={benchmark.handleParagraphLayout}
          onParagraphTextLayout={benchmark.handleParagraphTextLayout}
          paragraphWidth={benchmark.paragraphWidth}
          texts={benchmark.renderedParagraphs}
        />
      </ScrollView>
    </View>
  );
}

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createCombinedBenchmarkAutomationReport,
  serializeAutomationReport,
} from "../../benchmark/automation";
import {
  differenceText,
  formatMilliseconds,
  styles,
} from "../../benchmark/constants";
import type { AppStackParamList } from "../../benchmark/types";
import {
  HeroAutomationPanel,
  NavigationCard,
  SummaryMetric,
} from "../../components/BenchmarkComponents";
import { useBenchmarkResults } from "../../context/BenchmarkResultsContext";

type Props = NativeStackScreenProps<AppStackParamList, "BenchmarkIndex">;

export function BenchmarkIndexScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { baselineResults, preparedViewResults } = useBenchmarkResults();
  const automationReport = serializeAutomationReport(
    "benchmark/index",
    createCombinedBenchmarkAutomationReport({
      baselineResults,
      preparedViewResults,
    }),
  );
  const comparisonMedianDelta = differenceText(
    preparedViewResults.renderSummary?.interactionMedianMs ?? null,
    baselineResults.summary?.interactionMedianMs ?? null,
  );
  const comparisonP95Delta = differenceText(
    preparedViewResults.renderSummary?.interactionP95Ms ?? null,
    baselineResults.summary?.interactionP95Ms ?? null,
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
          <Text style={styles.eyebrow}>screens/benchmark</Text>
          <Text style={styles.title}>
            Benchmark routes stay isolated from API examples.
          </Text>
          <Text style={styles.subtitle}>
            `benchmark/base-text` owns the RN Text baseline.
            `benchmark/prepared-view` owns the prepared-state render and compute
            measurements.
          </Text>

          <HeroAutomationPanel
            reportLine={automationReport}
            reportTestID="benchmark.index.report"
            statusLine="AUTOMATION_STATUS::benchmark/index::visible"
            statusTestID="benchmark.index.status"
          />
        </View>

        <NavigationCard
          buttonLabel="Open benchmark/base-text"
          buttonTestID="benchmark.index.open-base-text"
          description="Plain React Native <Text> compatibility baseline. This page also records the line-count comparison input used by the prepared renderer page."
          lastCompletedAt={baselineResults.completedAt}
          onPress={() => navigation.navigate("BenchmarkBaseText")}
          summary={baselineResults.summary}
          title="benchmark/base-text"
        />

        <NavigationCard
          buttonLabel="Open benchmark/prepared-view"
          buttonTestID="benchmark.index.open-prepared-view"
          description="Prepared paragraph state benchmark. One batched native surface reflows the corpus from prepared state directly."
          footer={
            preparedViewResults.prepareStats === null
              ? "Prepare has not been recorded yet."
              : `Latest prepare: ${formatMilliseconds(
                  preparedViewResults.prepareStats.totalMs,
                )} · build measured ${formatMilliseconds(
                  preparedViewResults.prepareStats.measurementMs,
                )} · analyze ${formatMilliseconds(
                  preparedViewResults.prepareStats.tokenizeMs,
                )}`
          }
          lastCompletedAt={preparedViewResults.completedAt}
          onPress={() => navigation.navigate("BenchmarkPreparedView")}
          secondarySummary={preparedViewResults.computeSummary}
          summary={preparedViewResults.renderSummary}
          title="benchmark/prepared-view"
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Combined View</Text>
          <Text style={styles.summaryDescription}>
            Latest comparison across dedicated benchmark screens.
          </Text>
          <View style={styles.summaryMetricList}>
            <SummaryMetric
              label="BaseText median"
              value={formatMilliseconds(
                baselineResults.summary?.interactionMedianMs ?? null,
              )}
            />
            <SummaryMetric
              label="Prepared batch median"
              value={formatMilliseconds(
                preparedViewResults.renderSummary?.interactionMedianMs ?? null,
              )}
            />
            <SummaryMetric label="Median delta" value={comparisonMedianDelta} />
            <SummaryMetric
              label="Prepared batch p95"
              value={formatMilliseconds(
                preparedViewResults.renderSummary?.interactionP95Ms ?? null,
              )}
            />
            <SummaryMetric label="P95 delta" value={comparisonP95Delta} />
            <SummaryMetric
              label="Layout-only median"
              value={formatMilliseconds(
                preparedViewResults.computeSummary?.layoutOnlyMedianMs ?? null,
              )}
            />
            <SummaryMetric
              label="Render text parity"
              value={
                preparedViewResults.renderSummary === null
                  ? "—"
                  : `${preparedViewResults.renderSummary.lineTextParityMismatches}/${preparedViewResults.renderSummary.lineTextParityChecks} mismatch`
              }
            />
            <SummaryMetric
              label="Compute text parity"
              value={
                preparedViewResults.computeSummary === null
                  ? "—"
                  : `${preparedViewResults.computeSummary.lineTextParityMismatches}/${preparedViewResults.computeSummary.lineTextParityChecks} mismatch`
              }
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

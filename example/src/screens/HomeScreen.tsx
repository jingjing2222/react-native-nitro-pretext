import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  differenceText,
  formatMilliseconds,
  styles,
} from "../benchmark/constants";
import type { AppStackParamList } from "../benchmark/types";
import {
  BENCHMARK_MEASURED_RUNS,
  BENCHMARK_PARAGRAPH_COUNT,
  BENCHMARK_WARMUP_RUNS,
} from "../relayoutBenchmark";
import {
  MetricPill,
  NavigationCard,
  SummaryMetric,
} from "../components/BenchmarkComponents";
import { useBenchmarkResults } from "../context/BenchmarkResultsContext";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { baselineResults, preparedViewResults } = useBenchmarkResults();
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
          <Text style={styles.eyebrow}>Split Benchmark</Text>
          <Text style={styles.title}>
            BaseText page and Prepared View page run separately.
          </Text>
          <Text style={styles.subtitle}>
            Home combines the latest results so baseline calibration and
            renderer-oriented relayout stay readable.
          </Text>

          <View style={styles.metricRow}>
            <MetricPill
              label="Corpus"
              value={`${BENCHMARK_PARAGRAPH_COUNT} paragraphs`}
            />
            <MetricPill
              label="Modes"
              value="BaseText / Prepared View / Layout Only"
            />
            <MetricPill
              label="Runs"
              value={`${BENCHMARK_WARMUP_RUNS} warmup + ${BENCHMARK_MEASURED_RUNS} measured`}
            />
          </View>
        </View>

        <NavigationCard
          buttonLabel="Open BaseText Page"
          description="Plain React Native <Text> baseline. This page also records the line-count oracle used by the prepared renderer page."
          lastCompletedAt={baselineResults.completedAt}
          onPress={() => navigation.navigate("BaseText")}
          summary={baselineResults.summary}
          title="BaseText Page"
        />

        <NavigationCard
          buttonLabel="Open Prepared View Page"
          description="Prepared paragraph state benchmark. One native paragraph surface reflows from prepared state directly."
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
          onPress={() => navigation.navigate("PreparedView")}
          secondarySummary={preparedViewResults.computeSummary}
          summary={preparedViewResults.renderSummary}
          title="Prepared View Page"
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Combined View</Text>
          <Text style={styles.summaryDescription}>
            Latest cross-page comparison. Run BaseText first if you want parity
            and amortization on the prepared view page.
          </Text>
          <View style={styles.summaryMetricList}>
            <SummaryMetric
              label="BaseText median"
              value={formatMilliseconds(
                baselineResults.summary?.interactionMedianMs ?? null,
              )}
            />
            <SummaryMetric
              label="Prepared view median"
              value={formatMilliseconds(
                preparedViewResults.renderSummary?.interactionMedianMs ?? null,
              )}
            />
            <SummaryMetric label="Median delta" value={comparisonMedianDelta} />
            <SummaryMetric
              label="Prepared view p95"
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
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

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
  CatalogCard,
  MetricPill,
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
          <Text style={styles.eyebrow}>PreText Layout Lab</Text>
          <Text style={styles.title}>
            Measure text height before visible render.
          </Text>
          <Text style={styles.subtitle}>
            Benchmarks measure relayout cost. The example screen shows a complex
            RN layout that normally waits for hidden onLayout measurement, then
            compares it with PreText layout metrics.
          </Text>

          <View style={styles.metricRow}>
            <MetricPill
              label="Corpus"
              value={`${BENCHMARK_PARAGRAPH_COUNT} paragraphs`}
            />
            <MetricPill label="Routes" value="benchmark/* / examples/*" />
            <MetricPill
              label="Runs"
              value={`${BENCHMARK_WARMUP_RUNS} warmup + ${BENCHMARK_MEASURED_RUNS} measured`}
            />
          </View>
        </View>

        <CatalogCard
          buttonLabel="Open benchmark/*"
          buttonTestID="home.open-benchmark"
          description="Run BaseText and PreText batch layout as dedicated benchmark screens under screens/benchmark/*."
          onPress={() => navigation.navigate("BenchmarkIndex")}
          title="Benchmarks"
        />

        <CatalogCard
          buttonLabel="Open examples/*"
          buttonTestID="home.open-examples"
          description="Open the MeasureLayout-style comparison that shows hidden onLayout measurement versus PreText layout before render."
          onPress={() => navigation.navigate("ExampleIndex")}
          title="Examples"
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Latest Benchmark Snapshot</Text>
          <Text style={styles.summaryDescription}>
            Latest cross-page comparison from benchmark/*. Run BaseText first,
            then PreText layout, and come back here for the combined read.
          </Text>
          <View style={styles.summaryMetricList}>
            <SummaryMetric
              label="BaseText median"
              value={formatMilliseconds(
                baselineResults.summary?.interactionMedianMs ?? null,
              )}
            />
            <SummaryMetric
              label="PreText surface median"
              value={formatMilliseconds(
                preparedViewResults.renderSummary?.interactionMedianMs ?? null,
              )}
            />
            <SummaryMetric label="Median delta" value={comparisonMedianDelta} />
            <SummaryMetric
              label="PreText surface p95"
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

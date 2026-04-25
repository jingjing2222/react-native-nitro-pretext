import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ScrollView,
  Text,
  type TextLayoutEvent,
  type TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PARITY_CASES } from "../../benchmark/parity/cases";
import { serializeParityAutomationReport } from "../../benchmark/parity/automation";
import { useParityHarness } from "../../benchmark/parity/useParityHarness";
import type {
  ParityCase,
  ParityLineSnapshot,
} from "../../benchmark/parity/types";
import { styles } from "../../benchmark/constants";
import {
  HeroAutomationPanel,
  MetricPill,
  PrimaryButton,
  SummaryMetric,
} from "../../components/BenchmarkComponents";
import type { AppStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "BenchmarkParity">;

function createRnTextStyle(parityCase: ParityCase): TextStyle {
  const style = parityCase.style;

  return {
    color: "#22211f",
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    includeFontPadding: style.includeFontPadding ?? true,
    letterSpacing: style.letterSpacing,
    lineHeight:
      style.lineHeight !== undefined && style.lineHeight > 0
        ? style.lineHeight
        : undefined,
    textAlign: "left",
    width: parityCase.width,
    writingDirection:
      style.textDirection === "rtl"
        ? "rtl"
        : style.textDirection === "ltr"
          ? "ltr"
          : "auto",
    ...(style.fontWeight
      ? { fontWeight: style.fontWeight as TextStyle["fontWeight"] }
      : {}),
    ...(style.fontStyle
      ? { fontStyle: style.fontStyle as TextStyle["fontStyle"] }
      : {}),
  };
}

function materializeRnLines(event: TextLayoutEvent): ParityLineSnapshot[] {
  return event.nativeEvent.lines.map((line) => ({
    geometry: {
      height: line.height,
      left: line.x,
      top: line.y,
      width: line.width,
    },
    text: line.text,
  }));
}

export function ParityBenchmarkScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const parity = useParityHarness(PARITY_CASES);
  const reportLine = serializeParityAutomationReport(parity.report);
  const activeCase = parity.activeCase;
  const mismatchPreview = parity.report.mismatches.slice(0, 5);

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
          <Text style={styles.eyebrow}>benchmark/parity</Text>
          <Text style={styles.title}>Run RN Text parity as unique cases.</Text>
          <Text style={styles.subtitle}>
            This route is independent from timing benchmarks and compares every
            parity case exactly once against Pretext line output.
          </Text>

          <View style={styles.metricRow}>
            <MetricPill
              label="Cases"
              value={`${parity.report.completedCases}/${parity.report.caseCount}`}
            />
            <MetricPill
              label="Mismatches"
              value={String(parity.report.mismatchCount)}
            />
            <MetricPill label="Status" value={parity.status} />
          </View>

          <PrimaryButton
            disabled={parity.status === "running"}
            label={
              parity.status === "running"
                ? "Running RN Text Parity"
                : "Run RN Text Parity"
            }
            onPress={parity.runParitySuite}
            testID="benchmark.parity.run"
          />

          <PrimaryButton
            disabled={parity.status === "running"}
            label="Back to benchmark/*"
            onPress={() => navigation.navigate("BenchmarkIndex")}
            testID="benchmark.parity.back"
          />

          <HeroAutomationPanel
            reportLine={reportLine}
            reportTestID="benchmark.parity.report"
            statusLine={parity.statusLine}
            statusTestID="benchmark.parity.status"
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Parity Summary</Text>
          <View style={styles.summaryMetricList}>
            <SummaryMetric
              label="Line count"
              value={`${parity.report.lineCountMismatches}/${parity.report.caseCount} mismatch`}
            />
            <SummaryMetric
              label="Line text"
              value={`${parity.report.lineTextMismatches}/${parity.report.caseCount} mismatch`}
            />
            <SummaryMetric
              label="Line geometry"
              value={`${parity.report.lineGeometryMismatches}/${parity.report.caseCount} mismatch`}
            />
            <SummaryMetric
              label="Failed cases"
              value={String(parity.report.failedCases)}
            />
          </View>
        </View>

        <View style={styles.stageCard}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageLabel}>Active Parity Case</Text>
            <Text style={styles.stageTitle}>
              {activeCase?.caseId ?? "No active case"}
            </Text>
            <Text style={styles.stageMeta}>
              {activeCase === null
                ? `Completed at ${parity.completedAt ?? "—"}`
                : `${activeCase.category} · width ${activeCase.width}px`}
            </Text>
          </View>

          {activeCase === null ? (
            <View style={styles.paragraphStack} />
          ) : (
            <Text
              key={activeCase.caseId}
              allowFontScaling={false}
              onTextLayout={(event) =>
                parity.handleTextLayout(
                  activeCase.caseId,
                  materializeRnLines(event),
                )
              }
              style={[styles.paragraph, createRnTextStyle(activeCase)]}
              testID="benchmark.parity.active-text"
              {...activeCase.rnTextProps}
            >
              {activeCase.text}
            </Text>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Mismatch Preview</Text>
          <View style={styles.summaryMetricList}>
            {mismatchPreview.length === 0 ? (
              <SummaryMetric label="First mismatch" value="—" />
            ) : (
              mismatchPreview.map((mismatch) => (
                <SummaryMetric
                  key={`${mismatch.caseId}-${mismatch.kind}`}
                  label={mismatch.caseId}
                  value={`${mismatch.kind}:${mismatch.firstDiff.field}`}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

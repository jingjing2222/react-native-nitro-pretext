import { memo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { TextLayoutEvent } from "react-native";
import { PreparedParagraphView } from "react-native-nitro-pretext";

import { BENCHMARK_STYLE, BENCHMARK_SAMPLE_SIZE } from "../relayoutBenchmark";
import {
  formatMilliseconds,
  MODE_LABELS,
  PARAGRAPH_HORIZONTAL_PADDING,
  PARAGRAPH_VERTICAL_PADDING,
  styles,
} from "../benchmark/constants";
import type {
  BenchmarkSummary,
  PreparedParagraphSurfaceCardProps,
  SurfaceCardProps,
} from "../benchmark/types";

const EMPTY_PREPARED_LAYOUT = {
  lineCount: 1,
  height: BENCHMARK_STYLE.lineHeight,
  maxLineWidth: 0,
};

export function PrimaryButton({
  disabled,
  label,
  onPress,
  showSpinner = false,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  showSpinner?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.runButton,
        disabled && styles.runButtonDisabled,
        pressed && styles.runButtonPressed,
      ]}
    >
      {showSpinner ? <ActivityIndicator color="#f5efe4" /> : null}
      <Text style={styles.runButtonText}>{label}</Text>
    </Pressable>
  );
}

export function NavigationCard({
  buttonLabel,
  description,
  footer,
  lastCompletedAt,
  onPress,
  secondarySummary,
  summary,
  title,
}: {
  buttonLabel: string;
  description: string;
  footer?: string;
  lastCompletedAt: string | null;
  onPress: () => void;
  secondarySummary?: BenchmarkSummary | null;
  summary: BenchmarkSummary | null;
  title: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{title}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
      <View style={styles.summaryMetricList}>
        <SummaryMetric
          label="Interaction median"
          value={formatMilliseconds(summary?.interactionMedianMs ?? null)}
        />
        <SummaryMetric
          label="Interaction p95"
          value={formatMilliseconds(summary?.interactionP95Ms ?? null)}
        />
        <SummaryMetric
          label="Layout only median"
          value={formatMilliseconds(summary?.layoutOnlyMedianMs ?? null)}
        />
        <SummaryMetric
          label="Secondary median"
          value={formatMilliseconds(
            secondarySummary?.interactionMedianMs ?? null,
          )}
        />
        <SummaryMetric label="Last completed" value={lastCompletedAt ?? "—"} />
      </View>
      {footer ? <Text style={styles.noteMuted}>{footer}</Text> : null}
      <PrimaryButton disabled={false} label={buttonLabel} onPress={onPress} />
    </View>
  );
}

export function SummaryCard({
  description,
  label,
  summary,
}: {
  description: string;
  label: string;
  summary: BenchmarkSummary | null;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
      <View style={styles.summaryMetricList}>
        <SummaryMetric
          label="Interaction median"
          value={formatMilliseconds(summary?.interactionMedianMs ?? null)}
        />
        <SummaryMetric
          label="Interaction p95"
          value={formatMilliseconds(summary?.interactionP95Ms ?? null)}
        />
        <SummaryMetric
          label="Layout only median"
          value={formatMilliseconds(summary?.layoutOnlyMedianMs ?? null)}
        />
        <SummaryMetric
          label="Jank frames"
          value={summary === null ? "—" : String(summary.totalJankCount)}
        />
        <SummaryMetric
          label="Line parity"
          value={
            summary === null
              ? "—"
              : `${summary.parityMismatches}/${summary.parityChecks} mismatch`
          }
        />
        <SummaryMetric
          label="Prepare amortizes"
          value={
            summary === null || summary.amortizedAfterRuns === null
              ? "—"
              : `~${summary.amortizedAfterRuns} relayouts`
          }
        />
      </View>
    </View>
  );
}

export function SurfaceCard({
  activeMode,
  lastCompletedAt,
  onParagraphLayout,
  onParagraphTextLayout,
  paragraphWidth,
  texts,
}: SurfaceCardProps) {
  return (
    <View style={styles.stageCard}>
      <View style={styles.stageHeader}>
        <View>
          <Text style={styles.stageLabel}>Active Surface</Text>
          <Text style={styles.stageTitle}>
            {MODE_LABELS[activeMode]} · width {paragraphWidth}px
          </Text>
        </View>
        <Text style={styles.stageMeta}>
          {lastCompletedAt === null
            ? "No completed run yet"
            : `Last completed at ${lastCompletedAt}`}
        </Text>
      </View>

      <ParagraphList
        paragraphWidth={paragraphWidth}
        texts={texts}
        onParagraphLayout={onParagraphLayout}
        onParagraphTextLayout={onParagraphTextLayout}
      />
    </View>
  );
}

export function PreparedParagraphSurfaceCard({
  activeMode,
  lastCompletedAt,
  onParagraphLayout,
  paragraphMetrics,
  paragraphWidth,
  prepared,
}: PreparedParagraphSurfaceCardProps) {
  return (
    <View style={styles.stageCard}>
      <View style={styles.stageHeader}>
        <View>
          <Text style={styles.stageLabel}>Active Surface</Text>
          <Text style={styles.stageTitle}>
            {MODE_LABELS[activeMode]} · width {paragraphWidth}px
          </Text>
        </View>
        <Text style={styles.stageMeta}>
          {lastCompletedAt === null
            ? "No completed run yet"
            : `Last completed at ${lastCompletedAt}`}
        </Text>
      </View>

      <PreparedParagraphList
        onParagraphLayout={onParagraphLayout}
        paragraphMetrics={paragraphMetrics}
        paragraphWidth={paragraphWidth}
        prepared={prepared}
      />
    </View>
  );
}

const ParagraphList = memo(function ParagraphList({
  onParagraphLayout,
  onParagraphTextLayout,
  paragraphWidth,
  texts,
}: {
  onParagraphLayout: (index: number) => void;
  onParagraphTextLayout: (index: number, lineCount: number) => void;
  paragraphWidth: number;
  texts: string[];
}) {
  return (
    <View style={styles.paragraphStack}>
      {texts.map((text, index) => (
        <Text
          key={`paragraph-${index}`}
          allowFontScaling={false}
          onLayout={() => onParagraphLayout(index)}
          onTextLayout={
            index < BENCHMARK_SAMPLE_SIZE
              ? (event: TextLayoutEvent) =>
                  onParagraphTextLayout(index, event.nativeEvent.lines.length)
              : undefined
          }
          style={[styles.paragraph, { width: paragraphWidth }]}
        >
          {text}
        </Text>
      ))}
    </View>
  );
});

const PreparedParagraphList = memo(function PreparedParagraphList({
  onParagraphLayout,
  paragraphMetrics,
  paragraphWidth,
  prepared,
}: {
  onParagraphLayout: (index: number) => void;
  paragraphMetrics: PreparedParagraphSurfaceCardProps["paragraphMetrics"];
  paragraphWidth: number;
  prepared: PreparedParagraphSurfaceCardProps["prepared"];
}) {
  if (prepared === null) {
    return <View style={styles.paragraphStack} />;
  }

  const layoutWidth = Math.max(
    1,
    paragraphWidth - PARAGRAPH_HORIZONTAL_PADDING * 2,
  );

  return (
    <View style={styles.paragraphStack}>
      {paragraphMetrics.map((paragraphMetric, index) => (
        <PreparedParagraphView
          key={`prepared-paragraph-${index}`}
          contentInsetHorizontal={PARAGRAPH_HORIZONTAL_PADDING}
          contentInsetVertical={PARAGRAPH_VERTICAL_PADDING}
          layoutWidth={layoutWidth}
          onLayout={() => onParagraphLayout(index)}
          paragraphHeight={
            (paragraphMetric ?? EMPTY_PREPARED_LAYOUT).height
          }
          paragraphIndex={index}
          paragraphStyle={BENCHMARK_STYLE}
          prepared={prepared}
          style={[styles.paragraphSurface, { width: paragraphWidth }]}
        />
      ))}
    </View>
  );
});

export function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryMetricRow}>
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={styles.summaryMetricValue}>{value}</Text>
    </View>
  );
}

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricPillLabel}>{label}</Text>
      <Text style={styles.metricPillValue}>{value}</Text>
    </View>
  );
}

import { memo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { TextLayoutEvent } from "react-native";

import {
  BENCHMARK_CORPUS,
  BENCHMARK_STYLE,
  BENCHMARK_SAMPLE_SIZE,
} from "../relayoutBenchmark";
import {
  formatMilliseconds,
  MODE_LABELS,
  PARAGRAPH_HORIZONTAL_PADDING,
  PARAGRAPH_VERTICAL_PADDING,
  styles,
} from "../benchmark/constants";
import type {
  BenchmarkSummary,
  PretextLayoutSurfaceCardProps,
  SurfaceCardProps,
} from "../benchmark/types";

const EMPTY_PREPARED_LAYOUT = {
  lineCount: 1,
  height: BENCHMARK_STYLE.lineHeight ?? BENCHMARK_STYLE.fontSize,
  maxLineWidth: 0,
};

export function PrimaryButton({
  disabled,
  label,
  onPress,
  showSpinner = false,
  testID,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  showSpinner?: boolean;
  testID?: string;
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
      testID={testID}
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
  buttonTestID,
}: {
  buttonLabel: string;
  buttonTestID?: string;
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
      <PrimaryButton
        disabled={false}
        label={buttonLabel}
        onPress={onPress}
        testID={buttonTestID}
      />
    </View>
  );
}

export function CatalogCard({
  buttonLabel,
  description,
  onPress,
  title,
  buttonTestID,
}: {
  buttonLabel: string;
  buttonTestID?: string;
  description: string;
  onPress: () => void;
  title: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{title}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
      <PrimaryButton
        disabled={false}
        label={buttonLabel}
        onPress={onPress}
        testID={buttonTestID}
      />
    </View>
  );
}

export function HeroAutomationPanel({
  reportLine,
  reportTestID,
  statusLine,
  statusTestID,
}: {
  reportLine: string;
  reportTestID: string;
  statusLine: string;
  statusTestID: string;
}) {
  return (
    <View style={styles.heroAutomationPanel}>
      <Text style={styles.heroAutomationLabel}>Automation Export</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {}}
        testID={statusTestID}
      >
        <Text selectable style={styles.heroAutomationText}>
          {statusLine}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {}}
        testID={reportTestID}
      >
        <Text selectable style={styles.heroAutomationText}>
          {reportLine}
        </Text>
      </Pressable>
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
          label="Layout engine"
          value={summary?.layoutEngine ?? "—"}
        />
        <SummaryMetric label="Renderer" value={summary?.rendererKind ?? "—"} />
        <SummaryMetric label="Parity role" value={summary?.parityRole ?? "—"} />
        <SummaryMetric
          label="Height metrics"
          value={summary?.heightMetricSource ?? "—"}
        />
        <SummaryMetric
          label="Font padding"
          value={
            summary?.includeFontPadding === null ||
            summary?.includeFontPadding === undefined
              ? "—"
              : String(summary.includeFontPadding)
          }
        />
        <SummaryMetric
          label="Drift"
          value={
            summary === null || summary.driftKinds.length === 0
              ? "—"
              : summary.driftKinds.join(", ")
          }
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
          label="Line text parity"
          value={
            summary === null
              ? "—"
              : `${summary.lineTextParityMismatches}/${summary.lineTextParityChecks} mismatch`
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

export function PretextLayoutSurfaceCard({
  activeMode,
  lastCompletedAt,
  onParagraphLayout,
  paragraphMetrics,
  paragraphWidth,
  prepared,
}: PretextLayoutSurfaceCardProps) {
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

      <PretextLayoutPreviewBatch
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
  onParagraphTextLayout: (
    index: number,
    lineCount: number,
    lineTexts: string[],
  ) => void;
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
                  onParagraphTextLayout(
                    index,
                    event.nativeEvent.lines.length,
                    event.nativeEvent.lines.map((line) => line.text),
                  )
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

const PretextLayoutPreviewBatch = memo(function PretextLayoutPreviewBatch({
  onParagraphLayout,
  paragraphMetrics,
  paragraphWidth,
  prepared,
}: {
  onParagraphLayout: (index: number) => void;
  paragraphMetrics: PretextLayoutSurfaceCardProps["paragraphMetrics"];
  paragraphWidth: number;
  prepared: PretextLayoutSurfaceCardProps["prepared"];
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
      <View
        onLayout={() => onParagraphLayout(0)}
        style={[
          styles.paragraphBatchSurface,
          {
            gap: 16,
            width: paragraphWidth,
          },
        ]}
      >
        {(paragraphMetrics.length === 0
          ? [EMPTY_PREPARED_LAYOUT]
          : paragraphMetrics
        ).map((paragraph, index) => (
          <Text
            key={`pretext-layout-preview-${index}`}
            allowFontScaling={false}
            numberOfLines={Math.max(1, paragraph.lineCount)}
            style={[
              styles.paragraph,
              {
                minHeight: paragraph.height + PARAGRAPH_VERTICAL_PADDING * 2,
                width: layoutWidth + PARAGRAPH_HORIZONTAL_PADDING * 2,
              },
            ]}
          >
            {BENCHMARK_CORPUS[index] ?? ""}
          </Text>
        ))}
      </View>
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

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  prepareInlineParagraphsWithStats,
  prepareParagraphsWithStats,
  releaseParagraphs,
  type InlineSegment,
  type PreparedParagraphResult,
} from "react-native-nitro-pretext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatMilliseconds,
  PARAGRAPH_HORIZONTAL_PADDING,
  styles,
} from "../../benchmark/constants";
import { MetricPill } from "../../components/BenchmarkComponents";
import { BENCHMARK_STYLE } from "../../relayoutBenchmark";

export const EXAMPLE_TEXT =
  "Prepared paragraph state stays stable while the width changes. The example view is for API inspection, not for benchmark timing.";
export const INLINE_EXAMPLE: InlineSegment[] = [
  { text: "@pretext_handle", breakBehavior: "never" },
  {
    text: " stays together while the surrounding paragraph can still wrap across narrower widths.",
    breakBehavior: "normal",
  },
];
export const CURSOR_TEXT =
  "Cursor output is useful when a custom renderer wants line ranges one by one instead of a fully materialized paragraph result.";

export function useExampleWidthSelection() {
  const { width: windowWidth } = useWindowDimensions();
  const widths = useMemo(
    () =>
      Array.from(
        new Set(
          [340, 300, 260, 220].map((width) =>
            Math.max(200, Math.min(width, Math.max(220, windowWidth - 48))),
          ),
        ),
      ),
    [windowWidth],
  );
  const [selectedWidth, setSelectedWidth] = useState<number>(widths[0] ?? 220);

  useEffect(() => {
    setSelectedWidth(widths[0] ?? 220);
  }, [widths]);

  return {
    layoutWidth: Math.max(1, selectedWidth - PARAGRAPH_HORIZONTAL_PADDING * 2),
    selectedWidth,
    setSelectedWidth,
    widths,
  };
}

export function usePreparedParagraphExample(text: string) {
  const [prepared, setPrepared] = useState<PreparedParagraphResult | null>(
    null,
  );

  useEffect(() => {
    const nextPrepared = prepareParagraphsWithStats([text], BENCHMARK_STYLE);
    setPrepared(nextPrepared);
    return () => {
      releaseParagraphs(nextPrepared.prepared.id);
    };
  }, [text]);

  return prepared;
}

export function usePreparedInlineExample(paragraph: InlineSegment[]) {
  const [prepared, setPrepared] = useState<PreparedParagraphResult | null>(
    null,
  );

  useEffect(() => {
    const nextPrepared = prepareInlineParagraphsWithStats(
      [paragraph],
      BENCHMARK_STYLE,
    );
    setPrepared(nextPrepared);
    return () => {
      releaseParagraphs(nextPrepared.prepared.id);
    };
  }, [paragraph]);

  return prepared;
}

export function ExamplePageShell({
  children,
  description,
  lineCount,
  prepareMs,
  routeLabel,
  selectedWidth,
  setSelectedWidth,
  title,
  widths,
}: {
  children: ReactNode;
  description: string;
  lineCount: number | null;
  prepareMs: number | null;
  routeLabel: string;
  selectedWidth: number;
  setSelectedWidth: (width: number) => void;
  title: string;
  widths: number[];
}) {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.eyebrow}>{routeLabel}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{description}</Text>

          <View style={styles.metricRow}>
            <MetricPill label="Prepare" value={formatMilliseconds(prepareMs)} />
            <MetricPill label="Width" value={`${selectedWidth}px`} />
            <MetricPill
              label="Lines"
              value={lineCount === null ? "—" : String(Math.round(lineCount))}
            />
          </View>

          <View style={styles.optionRow}>
            {widths.map((width) => (
              <Pressable
                key={width}
                onPress={() => setSelectedWidth(width)}
                style={[
                  styles.optionChip,
                  selectedWidth === width && styles.optionChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    selectedWidth === width && styles.optionChipTextActive,
                  ]}
                >
                  {width}px
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.exampleStack}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function PreparingCard() {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>Preparing</Text>
      <Text style={styles.summaryDescription}>
        The example is preparing paragraph state.
      </Text>
    </View>
  );
}

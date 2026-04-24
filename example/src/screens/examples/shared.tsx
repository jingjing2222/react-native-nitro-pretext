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
  createParagraphLayoutRequest,
  prepareInlineParagraphsWithStats,
  prepareParagraphsWithStats,
  releaseParagraphs,
  type ParagraphLayoutRequest,
  type InlineSegment,
  type PreparedParagraphResult,
} from "../../pretextLegacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatMilliseconds,
  PARAGRAPH_HORIZONTAL_PADDING,
  styles,
} from "../../benchmark/constants";
import { MetricPill } from "../../components/BenchmarkComponents";
import { BENCHMARK_STYLE } from "../../relayoutBenchmark";

export const EXAMPLE_TEXT =
  "שלום مرحبا 👨‍👩‍👧‍👦 🇰🇷 क्‍षि Prepared paragraph state stays stable while the width changes. The example view is for API inspection, not for benchmark timing.";
export const INLINE_EXAMPLE: InlineSegment[] = [
  {
    text: "Prepared paragraph state can carry ",
    breakBehavior: "normal",
  },
  {
    text: "weighted inline runs",
    breakBehavior: "normal",
    fontWeight: "700",
  },
  {
    text: ", ",
    breakBehavior: "normal",
  },
  {
    text: "italic emphasis",
    breakBehavior: "normal",
    fontStyle: "italic",
  },
  {
    text: ", and ",
    breakBehavior: "normal",
  },
  {
    text: "@pretext_handle",
    breakBehavior: "normal",
    fontWeight: "700",
    fontSize: 20,
    lineHeight: 30,
  },
  {
    text: " ",
    breakBehavior: "normal",
  },
  {
    kind: "box",
    boxId: "inline-status",
    width: 34,
    height: 34,
    baseline: 25,
    breakBehavior: "never",
    accessibilityLabel: "Inline status badge",
    accessibilityHint: "Decorative inline box reserved by native text layout",
    accessibilityRole: "image",
  },
  {
    text: " while the rest of the paragraph keeps native shaping and line breaking across narrower widths.",
    breakBehavior: "normal",
  },
];
export const CURSOR_TEXT =
  "Cursor output is useful when a custom renderer wants line ranges one by one instead of a fully materialized paragraph result.";

export function buildShapedExampleRequest(
  layoutWidth: number,
): ParagraphLayoutRequest {
  return createParagraphLayoutRequest(layoutWidth, {
    shapeSlices: [
      {
        top: 0,
        height: BENCHMARK_STYLE.lineHeight,
        left: 0,
        width: layoutWidth,
      },
      {
        top: BENCHMARK_STYLE.lineHeight,
        height: BENCHMARK_STYLE.lineHeight * 2,
        left: 44,
        width: Math.max(120, layoutWidth - 44),
      },
      {
        top: BENCHMARK_STYLE.lineHeight * 3,
        height: BENCHMARK_STYLE.lineHeight * 2,
        left: 12,
        width: Math.max(120, layoutWidth - 12),
      },
    ],
  });
}

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

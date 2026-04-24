import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  layout,
  prepare,
  type PretextMetricsLayout,
  type PretextPrepared,
  type PretextStyle,
} from "react-native-nitro-pretext";

const METRICS_TEXT = [
  "A card can reserve its text block height before the visible RN Text mounts.",
  "Metrics include total height, line count, max line width, and per-paragraph values.",
] as const;

const METRICS_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
  locale: "en-US",
  textDirection: "auto",
};

const TEXT_RENDER_STYLE = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
} as const;

const WIDTHS = [260, 300, 340] as const;
const CARD_CHROME_HEIGHT = 100;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleUseCaseLayoutMetricsScreen() {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const [preparedState, setPreparedState] = useState<{
    error: string | null;
    prepared: PretextPrepared | null;
  }>({
    error: null,
    prepared: null,
  });

  useEffect(() => {
    let prepared: PretextPrepared | null = null;

    try {
      prepared = prepare(METRICS_TEXT, METRICS_STYLE);
      setPreparedState({ error: null, prepared });
    } catch (error) {
      setPreparedState({ error: describeError(error), prepared: null });
    }

    return () => {
      prepared?.release();
    };
  }, []);

  const metrics = useMemo<PretextMetricsLayout | null>(() => {
    if (preparedState.prepared === null) {
      return null;
    }

    try {
      return layout(preparedState.prepared, {
        output: "metrics",
        width,
      });
    } catch {
      return null;
    }
  }, [preparedState.prepared, width]);

  const precomputedCardHeight =
    metrics === null ? undefined : CARD_CHROME_HEIGHT + metrics.height;
  const report = `API_EXAMPLE_REPORT::examples/use-case/layout-metrics::${JSON.stringify(
    {
      height: metrics?.height ?? null,
      lineCount: metrics?.lineCount ?? null,
      maxLineWidth: metrics?.maxLineWidth ?? null,
      output: metrics?.output ?? null,
      paragraphCount: metrics?.paragraphs.length ?? 0,
      precomputedCardHeight: precomputedCardHeight ?? null,
      width,
    },
  )}`;

  return (
    <View style={localStyles.screen}>
      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          { paddingBottom: 56 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.header}>
          <Text style={localStyles.route}>
            examples/use-case/layout-metrics
          </Text>
          <Text style={localStyles.title}>layout() metrics</Text>
          <Text style={localStyles.description}>
            Calculate height and line metrics before visible RN Text is mounted.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const prepared = prepare(text, style);
const metrics = layout(prepared, {
  width,
  output: "metrics",
});`}
          </Text>
        </View>

        <View style={localStyles.widthRow}>
          {WIDTHS.map((nextWidth) => (
            <Pressable
              accessibilityRole="button"
              key={nextWidth}
              onPress={() => setWidth(nextWidth)}
              style={({ pressed }) => [
                localStyles.widthButton,
                width === nextWidth && localStyles.widthButtonSelected,
                pressed && localStyles.buttonPressed,
              ]}
              testID={`examples.use-case.layout-metrics.width.${nextWidth}`}
            >
              <Text
                style={[
                  localStyles.widthButtonText,
                  width === nextWidth && localStyles.widthButtonTextSelected,
                ]}
              >
                {nextWidth}px
              </Text>
            </Pressable>
          ))}
        </View>

        {preparedState.error ? (
          <View style={localStyles.panel}>
            <Text style={localStyles.panelTitle}>Prepare error</Text>
            <Text style={localStyles.body}>{preparedState.error}</Text>
          </View>
        ) : null}

        <View style={localStyles.grid}>
          <Stat label="height" value={formatPixel(metrics?.height)} />
          <Stat label="lineCount" value={metrics?.lineCount ?? "-"} />
          <Stat
            label="maxLineWidth"
            value={formatPixel(metrics?.maxLineWidth)}
          />
          <Stat
            label="card height"
            value={formatPixel(precomputedCardHeight)}
          />
        </View>

        {metrics === null ? (
          <View style={[localStyles.visibleCard, { width }]}>
            <Text style={localStyles.cardKicker}>WAITING FOR METRICS</Text>
            <Text style={localStyles.cardFooter}>
              Visible text is not mounted until Pretext returns height.
            </Text>
          </View>
        ) : (
          <View
            style={[
              localStyles.visibleCard,
              { height: precomputedCardHeight, width },
            ]}
          >
            <Text style={localStyles.cardKicker}>VISIBLE RN OUTPUT</Text>
            {METRICS_TEXT.map((paragraph) => (
              <Text key={paragraph} style={TEXT_RENDER_STYLE}>
                {paragraph}
              </Text>
            ))}
            <Text style={localStyles.cardFooter}>
              Height reserved from Pretext metrics.
            </Text>
          </View>
        )}

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Paragraph metrics</Text>
          {metrics?.paragraphs.map((paragraph, index) => (
            <View key={index} style={localStyles.metricRow}>
              <Text style={localStyles.metricName}>Paragraph {index + 1}</Text>
              <Text style={localStyles.metricValue}>
                {formatPixel(paragraph.height)} · {paragraph.lineCount} lines ·{" "}
                {formatPixel(paragraph.maxLineWidth)}
              </Text>
            </View>
          ))}
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Automation report</Text>
          <Text selectable style={localStyles.code}>
            {report}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={localStyles.stat}>
      <Text style={localStyles.statLabel}>{label}</Text>
      <Text style={localStyles.statValue}>{value}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  body: {
    color: "#4f5b57",
    fontSize: 14,
    lineHeight: 20,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  cardFooter: {
    color: "#63706b",
    fontSize: 12,
    fontWeight: "800",
    marginTop: "auto",
    textTransform: "uppercase",
  },
  cardKicker: {
    color: "#63706b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  code: {
    backgroundColor: "#1f2725",
    borderRadius: 6,
    color: "#f5efe4",
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 16,
    padding: 12,
  },
  content: {
    gap: 12,
    padding: 20,
  },
  description: {
    color: "#4f5b57",
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  metricName: {
    color: "#1f2725",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  metricRow: {
    borderTopColor: "#e6ddcd",
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  metricValue: {
    color: "#4f5b57",
    fontSize: 13,
    lineHeight: 18,
  },
  panel: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: {
    color: "#1f2725",
    fontSize: 15,
    fontWeight: "800",
  },
  route: {
    color: "#63706b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  screen: {
    backgroundColor: "#f3eee5",
    flex: 1,
  },
  stat: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    padding: 12,
  },
  statLabel: {
    color: "#63706b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#1f2725",
    fontSize: 18,
    fontWeight: "900",
  },
  title: {
    color: "#1f2725",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
  },
  visibleCard: {
    alignSelf: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#1f2725",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    maxWidth: "100%",
    padding: 14,
  },
  widthButton: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  widthButtonSelected: {
    backgroundColor: "#1f2725",
    borderColor: "#1f2725",
  },
  widthButtonText: {
    color: "#1f2725",
    fontSize: 14,
    fontWeight: "800",
  },
  widthButtonTextSelected: {
    color: "#fffaf0",
  },
  widthRow: {
    flexDirection: "row",
    gap: 8,
  },
});

import { useEffect, useMemo, useState } from "react";
import type { LayoutChangeEvent, TextStyle } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RN_METRICS_TEXT = [
  "A visible card needs a stable height before it can be placed.",
  "With RN Text alone, the usual workaround is a hidden measurement copy.",
] as const;

const RN_METRICS_TEXT_STYLE: TextStyle = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
};

const WIDTHS = [260, 300, 340] as const;
const CARD_CHROME_HEIGHT = 100;

type Measurement = {
  height: number;
  lineWidth: number;
};

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleNonUseCaseLayoutMetricsScreen() {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const [measurements, setMeasurements] = useState<Record<string, Measurement>>(
    {},
  );
  const [callbackCount, setCallbackCount] = useState(0);
  const [renderPassCount, setRenderPassCount] = useState(1);

  useEffect(() => {
    setMeasurements({});
    setCallbackCount(0);
    setRenderPassCount((value) => value + 1);
  }, [width]);

  function recordMeasurement(index: number, event: LayoutChangeEvent) {
    const { height, width: measuredWidth } = event.nativeEvent.layout;
    const key = String(index);

    setMeasurements((current) => {
      const previous = current[key];

      if (
        previous &&
        Math.round(previous.height) === Math.round(height) &&
        Math.round(previous.lineWidth) === Math.round(measuredWidth)
      ) {
        return current;
      }

      setRenderPassCount((value) => value + 1);
      return {
        ...current,
        [key]: { height, lineWidth: measuredWidth },
      };
    });
    setCallbackCount((value) => value + 1);
  }

  const paragraphCount = RN_METRICS_TEXT.length;
  const readyCount = Object.keys(measurements).length;
  const ready = readyCount === paragraphCount;
  const totalTextHeight = useMemo(
    () =>
      RN_METRICS_TEXT.reduce(
        (sum, _paragraph, index) =>
          sum + (measurements[String(index)]?.height ?? 0),
        0,
      ),
    [measurements],
  );
  const maxLineWidth = useMemo(
    () =>
      RN_METRICS_TEXT.reduce(
        (max, _paragraph, index) =>
          Math.max(max, measurements[String(index)]?.lineWidth ?? 0),
        0,
      ),
    [measurements],
  );
  const visibleCardHeight = ready
    ? CARD_CHROME_HEIGHT + totalTextHeight
    : undefined;
  const report = `NON_USE_CASE_REPORT::examples/non-use-case/layout-metrics::${JSON.stringify(
    {
      callbackCount,
      hiddenNodeCount: paragraphCount,
      maxLineWidth,
      ready,
      renderPassCount,
      totalTextHeight,
      visibleCardHeight: visibleCardHeight ?? null,
      width,
    },
  )}`;

  return (
    <View style={localStyles.screen}>
      <View pointerEvents="none" style={localStyles.hiddenMeasureLayer}>
        {RN_METRICS_TEXT.map((paragraph, index) => (
          <Text
            key={`${width}-${paragraph}`}
            onLayout={(event) => recordMeasurement(index, event)}
            style={[RN_METRICS_TEXT_STYLE, localStyles.hiddenText, { width }]}
          >
            {paragraph}
          </Text>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          { paddingBottom: 56 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.header}>
          <Text style={localStyles.route}>
            examples/non-use-case/layout-metrics
          </Text>
          <Text style={localStyles.title}>RN-only metrics workaround</Text>
          <Text style={localStyles.description}>
            Height is only known after hidden Text nodes mount and fire
            onLayout.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Workaround</Text>
          <Text selectable style={localStyles.code}>
            {`<Text
  style={[textStyle, { width }]}
  onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
>
  {text}
</Text>`}
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
              testID={`examples.non-use-case.layout-metrics.width.${nextWidth}`}
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

        <View style={localStyles.grid}>
          <Stat label="hidden Text nodes" value={paragraphCount} />
          <Stat
            label="callbacks"
            value={`${callbackCount}/${paragraphCount}`}
          />
          <Stat label="cached height" value={formatPixel(totalTextHeight)} />
          <Stat label="max width" value={formatPixel(maxLineWidth)} />
        </View>

        <View
          style={[
            localStyles.visibleCard,
            { height: visibleCardHeight, width },
          ]}
        >
          <Text style={localStyles.cardKicker}>
            {ready ? "VISIBLE AFTER MEASURE" : "WAITING FOR MEASURE"}
          </Text>
          {RN_METRICS_TEXT.map((paragraph) => (
            <Text key={paragraph} style={RN_METRICS_TEXT_STYLE}>
              {paragraph}
            </Text>
          ))}
          <Text style={localStyles.cardFooter}>
            Render passes: {renderPassCount}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Measurement cache</Text>
          {RN_METRICS_TEXT.map((paragraph, index) => {
            const measurement = measurements[String(index)];

            return (
              <View key={paragraph} style={localStyles.metricRow}>
                <Text style={localStyles.metricName}>
                  Paragraph {index + 1}
                </Text>
                <Text style={localStyles.metricValue}>
                  {formatPixel(measurement?.height)} ·{" "}
                  {formatPixel(measurement?.lineWidth)}
                </Text>
              </View>
            );
          })}
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
  hiddenMeasureLayer: {
    left: -10000,
    opacity: 0,
    position: "absolute",
    top: -10000,
  },
  hiddenText: {
    color: "#1f2725",
  },
  metricName: {
    color: "#1f2725",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  metricRow: {
    alignItems: "center",
    borderTopColor: "#e6ddcd",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
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
    justifyContent: "center",
    minHeight: 42,
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

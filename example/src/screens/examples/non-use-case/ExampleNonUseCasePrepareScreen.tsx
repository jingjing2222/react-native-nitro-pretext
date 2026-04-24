import { useMemo, useState } from "react";
import type { LayoutChangeEvent, TextStyle } from "react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RN_ONLY_TEXT = [
  "Without prepare(), callers usually invent a measurement cache.",
  "The cache is populated by hidden RN Text nodes after layout callbacks fire.",
  "Until those callbacks finish, visible layout must wait or accept shifting.",
] as const;

const RN_ONLY_TEXT_STYLE: TextStyle = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
};

const MEASURE_WIDTH = 300;

type Measurement = {
  height: number;
  width: number;
};

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleNonUseCasePrepareScreen() {
  const insets = useSafeAreaInsets();
  const [measurements, setMeasurements] = useState<Record<string, Measurement>>(
    {},
  );
  const [callbackCount, setCallbackCount] = useState(0);
  const [renderPassCount, setRenderPassCount] = useState(1);

  const measurementKeys = Object.keys(measurements);
  const readyCount = measurementKeys.length;
  const hiddenNodeCount = RN_ONLY_TEXT.length;
  const totalHeight = useMemo(
    () =>
      RN_ONLY_TEXT.reduce(
        (sum, _paragraph, index) =>
          sum + (measurements[String(index)]?.height ?? 0),
        0,
      ),
    [measurements],
  );

  function recordMeasurement(index: number, event: LayoutChangeEvent) {
    const { height, width } = event.nativeEvent.layout;
    const key = String(index);

    setMeasurements((current) => {
      const previous = current[key];

      if (
        previous &&
        Math.round(previous.height) === Math.round(height) &&
        Math.round(previous.width) === Math.round(width)
      ) {
        return current;
      }

      setRenderPassCount((value) => value + 1);
      return {
        ...current,
        [key]: { height, width },
      };
    });
    setCallbackCount((value) => value + 1);
  }

  const report = `NON_USE_CASE_REPORT::examples/non-use-case/prepare::${JSON.stringify(
    {
      callbackCount,
      hiddenNodeCount,
      readyCount,
      renderPassCount,
      totalHeight,
      waitingForCallbacks: readyCount < RN_ONLY_TEXT.length,
    },
  )}`;

  return (
    <View style={localStyles.screen}>
      <View pointerEvents="none" style={localStyles.hiddenMeasureLayer}>
        {RN_ONLY_TEXT.map((paragraph, index) => (
          <Text
            key={paragraph}
            onLayout={(event) => recordMeasurement(index, event)}
            style={[RN_ONLY_TEXT_STYLE, localStyles.hiddenText]}
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
          <Text style={localStyles.route}>examples/non-use-case/prepare</Text>
          <Text style={localStyles.title}>RN-only prepare workaround</Text>
          <Text style={localStyles.description}>
            RN Text has no prepare step, so the caller builds a hidden
            measurement cache and waits for callbacks.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Workaround</Text>
          <Text selectable style={localStyles.code}>
            {`<Text
  style={hiddenMeasureStyle}
  onLayout={(event) => cacheHeight(event)}
>
  {text}
</Text>`}
          </Text>
        </View>

        <View style={localStyles.grid}>
          <Stat label="hidden Text nodes" value={hiddenNodeCount} />
          <Stat
            label="callbacks"
            value={`${callbackCount}/${hiddenNodeCount}`}
          />
          <Stat label="render passes" value={renderPassCount} />
          <Stat label="cached height" value={formatPixel(totalHeight)} />
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Measurement cache</Text>
          {RN_ONLY_TEXT.map((paragraph, index) => {
            const measurement = measurements[String(index)];

            return (
              <View key={paragraph} style={localStyles.cacheRow}>
                <Text style={localStyles.cacheText} numberOfLines={1}>
                  {paragraph}
                </Text>
                <Text style={localStyles.cacheMetric}>
                  {formatPixel(measurement?.height)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Visible layout dependency</Text>
          <Text style={localStyles.body}>
            {readyCount === RN_ONLY_TEXT.length
              ? "All hidden callbacks fired, so visible layout can consume the cache."
              : "Visible layout is still waiting for hidden measurement callbacks."}
          </Text>
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
  cacheMetric: {
    color: "#1f2725",
    fontSize: 13,
    fontWeight: "800",
    minWidth: 56,
    textAlign: "right",
  },
  cacheRow: {
    alignItems: "center",
    borderTopColor: "#e6ddcd",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
  },
  cacheText: {
    color: "#4f5b57",
    flex: 1,
    fontSize: 13,
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
    width: MEASURE_WIDTH,
  },
  hiddenText: {
    width: MEASURE_WIDTH,
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
});

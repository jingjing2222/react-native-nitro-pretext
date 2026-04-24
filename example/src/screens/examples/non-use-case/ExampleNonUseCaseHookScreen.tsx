import { useCallback, useEffect, useState } from "react";
import type {
  LayoutChangeEvent,
  TextLayoutEvent,
  TextStyle,
} from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHORT_TEXT =
  "RN-only hooks still need a hidden Text measurement surface.";
const LONG_TEXT =
  "RN-only hooks still need a hidden Text measurement surface, callback fan-in, stale measurement guards, and cleanup when width, source, or enabled changes.";

const RN_HOOK_TEXT_STYLE: TextStyle = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
};

const WIDTHS = [260, 300, 340] as const;

type RnMeasurement = {
  height: number;
  lineCount: number;
  maxLineWidth: number;
  width: number;
};

function useRnOnlyTextMeasurement({
  enabled,
  text,
  width,
}: {
  enabled: boolean;
  text: string;
  width: number;
}) {
  const [measurement, setMeasurement] = useState<RnMeasurement | null>(null);
  const [layoutCallbackCount, setLayoutCallbackCount] = useState(0);
  const [textLayoutCallbackCount, setTextLayoutCallbackCount] = useState(0);
  const [renderPassCount, setRenderPassCount] = useState(1);
  const [lineCount, setLineCount] = useState(0);
  const [maxLineWidth, setMaxLineWidth] = useState(0);

  useEffect(() => {
    setMeasurement(null);
    setLayoutCallbackCount(0);
    setTextLayoutCallbackCount(0);
    setLineCount(0);
    setMaxLineWidth(0);
    setRenderPassCount((value) => value + 1);
  }, [enabled, text, width]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!enabled) {
        return;
      }

      const { height, width: measuredWidth } = event.nativeEvent.layout;
      setMeasurement((current) => {
        return {
          height,
          lineCount: current?.lineCount ?? lineCount,
          maxLineWidth: current?.maxLineWidth ?? maxLineWidth,
          width: measuredWidth,
        };
      });
      setLayoutCallbackCount((value) => value + 1);
      setRenderPassCount((value) => value + 1);
    },
    [enabled, lineCount, maxLineWidth],
  );

  const onTextLayout = useCallback(
    (event: TextLayoutEvent) => {
      if (!enabled) {
        return;
      }

      const lines = event.nativeEvent.lines;
      const nextLineCount = lines.length;
      const nextMaxLineWidth = lines.reduce(
        (max, line) => Math.max(max, line.width),
        0,
      );

      setLineCount(nextLineCount);
      setMaxLineWidth(nextMaxLineWidth);
      setMeasurement((current) =>
        current === null
          ? current
          : {
              ...current,
              lineCount: nextLineCount,
              maxLineWidth: nextMaxLineWidth,
            },
      );
      setTextLayoutCallbackCount((value) => value + 1);
    },
    [enabled],
  );

  return {
    hiddenNodeCount: enabled ? 1 : 0,
    layoutCallbackCount,
    measurement,
    onLayout,
    onTextLayout,
    renderPassCount,
    textLayoutCallbackCount,
  };
}

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

function formatOptionalLineData(value: number | undefined): string {
  if (typeof value !== "number" || value <= 0 || !Number.isFinite(value)) {
    return "unavailable";
  }

  return String(value);
}

export function ExampleNonUseCaseHookScreen() {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(true);
  const [source, setSource] = useState<"short" | "long">("short");
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const text = source === "short" ? SHORT_TEXT : LONG_TEXT;
  const measurement = useRnOnlyTextMeasurement({
    enabled,
    text,
    width,
  });
  const report = `NON_USE_CASE_REPORT::examples/non-use-case/use-pretext-layout::${JSON.stringify(
    {
      enabled,
      hiddenNodeCount: measurement.hiddenNodeCount,
      layoutCallbackCount: measurement.layoutCallbackCount,
      lineDataAvailable: (measurement.measurement?.lineCount ?? 0) > 0,
      lineCount:
        (measurement.measurement?.lineCount ?? 0) > 0
          ? measurement.measurement?.lineCount
          : null,
      measuredHeight: measurement.measurement?.height ?? null,
      measuredWidth: measurement.measurement?.width ?? null,
      renderPassCount: measurement.renderPassCount,
      source,
      staleMeasurementRisk: true,
      textLayoutCallbackCount: measurement.textLayoutCallbackCount,
      width,
    },
  )}`;
  const ready = measurement.measurement !== null;

  return (
    <View style={localStyles.screen}>
      {enabled ? (
        <View pointerEvents="none" style={localStyles.hiddenMeasureLayer}>
          <Text
            onLayout={measurement.onLayout}
            onTextLayout={measurement.onTextLayout}
            style={[RN_HOOK_TEXT_STYLE, localStyles.hiddenText, { width }]}
          >
            {text}
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          { paddingBottom: 56 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.header}>
          <Text style={localStyles.route}>
            examples/non-use-case/use-pretext-layout
          </Text>
          <Text style={localStyles.title}>RN-only hook workaround</Text>
          <Text style={localStyles.description}>
            A custom RN-only hook has to own hidden measurement state, callback
            fan-in, and stale-result resets.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Workaround</Text>
          <Text selectable style={localStyles.code}>
            {`const measurement = useRnOnlyTextMeasurement({ text, width });
return (
  <Text
    style={[hiddenStyle, { width }]}
    onLayout={measurement.onLayout}
    onTextLayout={measurement.onTextLayout}
  />
);`}
          </Text>
        </View>

        <View style={localStyles.controlGroup}>
          <Text style={localStyles.controlLabel}>state</Text>
          <View style={localStyles.buttonRow}>
            <Choice
              label={enabled ? "enabled" : "disabled"}
              onPress={() => setEnabled((value) => !value)}
              selected={enabled}
              testID="examples.non-use-case.hook.enabled"
            />
            <Choice
              label={source}
              onPress={() =>
                setSource((value) => (value === "short" ? "long" : "short"))
              }
              selected={source === "long"}
              testID="examples.non-use-case.hook.source"
            />
          </View>
        </View>

        <View style={localStyles.controlGroup}>
          <Text style={localStyles.controlLabel}>width</Text>
          <View style={localStyles.buttonRow}>
            {WIDTHS.map((nextWidth) => (
              <Choice
                key={nextWidth}
                label={`${nextWidth}px`}
                onPress={() => setWidth(nextWidth)}
                selected={width === nextWidth}
                testID={`examples.non-use-case.hook.width.${nextWidth}`}
              />
            ))}
          </View>
        </View>

        <View style={localStyles.grid}>
          <Stat label="hidden Text" value={measurement.hiddenNodeCount} />
          <Stat
            label="ready"
            value={ready ? "yes" : enabled ? "waiting" : "disabled"}
          />
          <Stat label="onLayout" value={measurement.layoutCallbackCount} />
          <Stat
            label="onTextLayout"
            value={measurement.textLayoutCallbackCount}
          />
          <Stat label="render passes" value={measurement.renderPassCount} />
          <Stat
            label="height"
            value={formatPixel(measurement.measurement?.height)}
          />
        </View>

        <View style={[localStyles.preview, { width }]}>
          <Text style={RN_HOOK_TEXT_STYLE}>{text}</Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Hook state</Text>
          <Text style={localStyles.body}>
            maxLineWidth:{" "}
            {formatOptionalLineData(measurement.measurement?.maxLineWidth)}
          </Text>
          <Text style={localStyles.body}>
            lineCount:{" "}
            {formatOptionalLineData(measurement.measurement?.lineCount)}
          </Text>
          <Text style={localStyles.body}>
            stale reset needed on enabled, text, and width changes.
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

function Choice({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.choice,
        selected && localStyles.choiceSelected,
        pressed && localStyles.choicePressed,
      ]}
      testID={testID}
    >
      <Text
        style={[
          localStyles.choiceText,
          selected && localStyles.choiceTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 92,
    paddingHorizontal: 10,
  },
  choicePressed: {
    opacity: 0.72,
  },
  choiceSelected: {
    backgroundColor: "#1f2725",
    borderColor: "#1f2725",
  },
  choiceText: {
    color: "#1f2725",
    fontSize: 13,
    fontWeight: "800",
  },
  choiceTextSelected: {
    color: "#fffaf0",
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
  controlGroup: {
    gap: 8,
  },
  controlLabel: {
    color: "#63706b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
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
  preview: {
    alignSelf: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#1f2725",
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: "100%",
    padding: 12,
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
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  title: {
    color: "#1f2725",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
  },
});

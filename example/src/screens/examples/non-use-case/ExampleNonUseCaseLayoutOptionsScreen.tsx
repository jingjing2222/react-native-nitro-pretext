import { useMemo, useState } from "react";
import type { LayoutChangeEvent, TextStyle } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RN_OPTIONS_TEXT =
  "RN Text can be measured after render, but options like shapeSlices and rule diagnostics become caller-managed UI state.";

const RN_OPTIONS_TEXT_STYLE: TextStyle = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
};

const WIDTHS = [260, 300, 340] as const;
const LEFTS = [0, 16] as const;

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleNonUseCaseLayoutOptionsScreen() {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const [left, setLeft] = useState<(typeof LEFTS)[number]>(LEFTS[0]);
  const [shapeEnabled, setShapeEnabled] = useState(true);
  const [callbackCount, setCallbackCount] = useState(0);
  const [renderPassCount, setRenderPassCount] = useState(1);
  const [measurement, setMeasurement] = useState<{
    height: number;
    width: number;
  } | null>(null);

  function recordLayout(event: LayoutChangeEvent) {
    const next = event.nativeEvent.layout;
    setMeasurement({
      height: next.height,
      width: next.width,
    });
    setCallbackCount((value) => value + 1);
    setRenderPassCount((value) => value + 1);
  }

  const unsupportedFields = useMemo(
    () => ["shapeSlices", "whiteSpace", "wordBreak", "normalizedRequest"],
    [],
  );
  const report = `NON_USE_CASE_REPORT::examples/non-use-case/layout-options::${JSON.stringify(
    {
      callbackCount,
      callerManagedLeft: left,
      hiddenNodeCount: 1,
      measuredHeight: measurement?.height ?? null,
      measuredWidth: measurement?.width ?? null,
      renderPassCount,
      shapeOverlayEnabled: shapeEnabled,
      unsupportedFields,
      width,
    },
  )}`;

  return (
    <View style={localStyles.screen}>
      <View pointerEvents="none" style={localStyles.hiddenMeasureLayer}>
        <Text
          key={`${width}-${left}-${shapeEnabled}`}
          onLayout={recordLayout}
          style={[
            RN_OPTIONS_TEXT_STYLE,
            localStyles.hiddenText,
            {
              marginLeft: left,
              width: width - left,
            },
          ]}
        >
          {RN_OPTIONS_TEXT}
        </Text>
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
            examples/non-use-case/layout-options
          </Text>
          <Text style={localStyles.title}>RN-only options workaround</Text>
          <Text style={localStyles.description}>
            RN measurement callbacks return box size, not the request rules that
            produced it.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Workaround</Text>
          <Text selectable style={localStyles.code}>
            {`<Text
  style={[textStyle, { width, marginLeft }]}
  onLayout={(event) => setMeasuredBox(event.nativeEvent.layout)}
/>`}
          </Text>
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
                testID={`examples.non-use-case.layout-options.width.${nextWidth}`}
              />
            ))}
          </View>
        </View>

        <View style={localStyles.controlGroup}>
          <Text style={localStyles.controlLabel}>caller-managed rules</Text>
          <View style={localStyles.buttonRow}>
            {LEFTS.map((nextLeft) => (
              <Choice
                key={nextLeft}
                label={`left ${nextLeft}`}
                onPress={() => setLeft(nextLeft)}
                selected={left === nextLeft}
                testID={`examples.non-use-case.layout-options.left.${nextLeft}`}
              />
            ))}
            <Choice
              label={shapeEnabled ? "fake shape on" : "fake shape off"}
              onPress={() => setShapeEnabled((value) => !value)}
              selected={shapeEnabled}
              testID="examples.non-use-case.layout-options.shape"
            />
          </View>
        </View>

        <View style={localStyles.grid}>
          <Stat
            label="measured height"
            value={formatPixel(measurement?.height)}
          />
          <Stat
            label="measured width"
            value={formatPixel(measurement?.width)}
          />
          <Stat label="callbacks" value={callbackCount} />
          <Stat label="render passes" value={renderPassCount} />
          <Stat label="unsupported rules" value={unsupportedFields.length} />
        </View>

        <View style={[localStyles.preview, { width }]}>
          {shapeEnabled ? <View style={localStyles.obstacle} /> : null}
          <Text
            style={[
              RN_OPTIONS_TEXT_STYLE,
              {
                marginLeft: left,
                width: width - left,
              },
            ]}
          >
            {RN_OPTIONS_TEXT}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Missing from callbacks</Text>
          {unsupportedFields.map((field) => (
            <Text key={field} style={localStyles.body}>
              {field}
            </Text>
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
    minHeight: 42,
    minWidth: 92,
    justifyContent: "center",
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
  obstacle: {
    backgroundColor: "#eadfd7",
    borderColor: "#a98574",
    borderRadius: 6,
    borderWidth: 1,
    height: 46,
    left: 0,
    position: "absolute",
    top: 0,
    width: 48,
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
    minHeight: 150,
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

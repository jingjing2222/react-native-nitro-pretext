import { useState } from "react";
import type { TextLayoutEvent, TextStyle } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RN_LINES_TEXT =
  "onTextLayout gives rendered line text and boxes, but it does not provide source UTF-16 start and end offsets for each line.";

const RN_LINES_TEXT_STYLE: TextStyle = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
};

const WIDTHS = [240, 280, 320] as const;

type RnLine = TextLayoutEvent["nativeEvent"]["lines"][number];

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function ExampleNonUseCaseLayoutLinesScreen() {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const [lines, setLines] = useState<RnLine[]>([]);
  const [callbackCount, setCallbackCount] = useState(0);
  const [renderPassCount, setRenderPassCount] = useState(1);

  function recordTextLayout(event: TextLayoutEvent) {
    setLines([...event.nativeEvent.lines]);
    setCallbackCount((value) => value + 1);
    setRenderPassCount((value) => value + 1);
  }

  const report = `NON_USE_CASE_REPORT::examples/non-use-case/layout-lines::${JSON.stringify(
    {
      callbackCount,
      hiddenNodeCount: 0,
      lineCount: lines.length,
      missingSourceOffsets: true,
      renderPassCount,
      textStartAvailable: false,
      textEndAvailable: false,
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
            examples/non-use-case/layout-lines
          </Text>
          <Text style={localStyles.title}>RN-only lines workaround</Text>
          <Text style={localStyles.description}>
            onTextLayout returns rendered line boxes, but source offset mapping
            remains caller-owned.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Workaround</Text>
          <Text selectable style={localStyles.code}>
            {`<Text
  style={[textStyle, { width }]}
  onTextLayout={(event) => setLines(event.nativeEvent.lines)}
>
  {text}
</Text>`}
          </Text>
        </View>

        <View style={localStyles.buttonRow}>
          {WIDTHS.map((nextWidth) => (
            <Choice
              key={nextWidth}
              label={`${nextWidth}px`}
              onPress={() => setWidth(nextWidth)}
              selected={width === nextWidth}
              testID={`examples.non-use-case.layout-lines.width.${nextWidth}`}
            />
          ))}
        </View>

        <View style={localStyles.grid}>
          <Stat label="lineCount" value={lines.length} />
          <Stat label="callbacks" value={callbackCount} />
          <Stat label="render passes" value={renderPassCount} />
          <Stat label="textStart" value="missing" />
          <Stat label="textEnd" value="missing" />
        </View>

        <View style={[localStyles.preview, { width }]}>
          <Text onTextLayout={recordTextLayout} style={RN_LINES_TEXT_STYLE}>
            {RN_LINES_TEXT}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>onTextLayout lines</Text>
          {lines.map((line, index) => (
            <View key={`${index}-${line.text}`} style={localStyles.lineRow}>
              <Text style={localStyles.lineTitle}>Line {index + 1}</Text>
              <Text style={localStyles.lineValue}>
                {`"${line.text}" · y ${formatNumber(line.y)} · ${formatNumber(
                  line.width,
                )}x${formatNumber(line.height)}`}
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
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  choice: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
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
  lineRow: {
    borderTopColor: "#e6ddcd",
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  lineTitle: {
    color: "#1f2725",
    fontSize: 14,
    fontWeight: "800",
  },
  lineValue: {
    color: "#4f5b57",
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 16,
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

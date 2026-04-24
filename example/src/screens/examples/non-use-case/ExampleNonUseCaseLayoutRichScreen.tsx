import { useState } from "react";
import type {
  LayoutChangeEvent,
  TextLayoutEvent,
  TextStyle,
} from "react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RN_RICH_TEXT_BEFORE = "RN Text can render a marker ";
const RN_RICH_MARKER = "[APPROVED]";
const RN_RICH_TEXT_AFTER =
  " inline, but it does not return a stable box frame for that marker.";

const RN_RICH_TEXT_STYLE: TextStyle = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 24,
};

const RN_RICH_WIDTH = 300;

type RnLine = TextLayoutEvent["nativeEvent"]["lines"][number];

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleNonUseCaseLayoutRichScreen() {
  const insets = useSafeAreaInsets();
  const [layoutBox, setLayoutBox] = useState<{
    height: number;
    width: number;
  } | null>(null);
  const [lines, setLines] = useState<RnLine[]>([]);
  const [layoutCallbackCount, setLayoutCallbackCount] = useState(0);
  const [renderPassCount, setRenderPassCount] = useState(1);
  const [textLayoutCallbackCount, setTextLayoutCallbackCount] = useState(0);

  function recordLayout(event: LayoutChangeEvent) {
    const { height, width } = event.nativeEvent.layout;
    setLayoutBox({ height, width });
    setLayoutCallbackCount((value) => value + 1);
    setRenderPassCount((value) => value + 1);
  }

  function recordTextLayout(event: TextLayoutEvent) {
    setLines([...event.nativeEvent.lines]);
    setTextLayoutCallbackCount((value) => value + 1);
    setRenderPassCount((value) => value + 1);
  }

  const markerLineIndex = lines.findIndex((line) =>
    line.text.includes(RN_RICH_MARKER),
  );
  const report = `NON_USE_CASE_REPORT::examples/non-use-case/layout-rich::${JSON.stringify(
    {
      boxFrameAvailable: false,
      hiddenNodeCount: 0,
      layoutCallbackCount,
      lineCount: lines.length,
      markerLineIndex: markerLineIndex >= 0 ? markerLineIndex : null,
      measuredHeight: layoutBox?.height ?? null,
      measuredWidth: layoutBox?.width ?? null,
      missingFields: [
        "boxId",
        "boxFrame.left",
        "boxFrame.top",
        "boxFrame.baseline",
        "atomicBreakBehavior",
      ],
      renderPassCount,
      textLayoutCallbackCount,
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
            examples/non-use-case/layout-rich
          </Text>
          <Text style={localStyles.title}>RN-only rich inline gap</Text>
          <Text style={localStyles.description}>
            Nested Text can show an inline marker, but callbacks do not identify
            a box id or return its frame.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Workaround</Text>
          <Text selectable style={localStyles.code}>
            {`<Text onTextLayout={(event) => setLines(event.nativeEvent.lines)}>
  RN Text can render a marker
  <Text style={badgeStyle}>[APPROVED]</Text>
  inline.
</Text>`}
          </Text>
        </View>

        <View style={localStyles.grid}>
          <Stat label="lineCount" value={lines.length} />
          <Stat label="box frame" value="missing" />
          <Stat label="onLayout" value={layoutCallbackCount} />
          <Stat label="render passes" value={renderPassCount} />
          <Stat label="onTextLayout" value={textLayoutCallbackCount} />
        </View>

        <View style={[localStyles.preview, { width: RN_RICH_WIDTH }]}>
          <Text
            onLayout={recordLayout}
            onTextLayout={recordTextLayout}
            style={RN_RICH_TEXT_STYLE}
          >
            {RN_RICH_TEXT_BEFORE}
            <Text style={localStyles.badge}>{RN_RICH_MARKER}</Text>
            {RN_RICH_TEXT_AFTER}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Callback data</Text>
          <Text style={localStyles.body}>
            Box: {formatPixel(layoutBox?.width)} x{" "}
            {formatPixel(layoutBox?.height)}
          </Text>
          <Text style={localStyles.body}>
            Marker line:{" "}
            {markerLineIndex >= 0 ? `line ${markerLineIndex + 1}` : "unknown"}
          </Text>
          <Text style={localStyles.body}>
            Marker frame: missing left, top, width, height, and baseline.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>onTextLayout lines</Text>
          {lines.map((line, index) => (
            <View key={`${index}-${line.text}`} style={localStyles.lineRow}>
              <Text style={localStyles.lineTitle}>Line {index + 1}</Text>
              <Text style={localStyles.lineValue}>{line.text}</Text>
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
  badge: {
    backgroundColor: "#d9eadf",
    color: "#1f2725",
    fontSize: 12,
    fontWeight: "900",
  },
  body: {
    color: "#4f5b57",
    fontSize: 14,
    lineHeight: 20,
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

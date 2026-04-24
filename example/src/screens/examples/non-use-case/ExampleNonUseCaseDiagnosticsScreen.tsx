import { useState } from "react";
import type {
  LayoutChangeEvent,
  TextLayoutEvent,
  TextStyle,
} from "react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RN_DIAGNOSTICS_TEXT =
  "RN callbacks can tell you the rendered box and rendered line text, but not which native layout engine, fallback path, or drift class produced that result.";

const RN_DIAGNOSTICS_TEXT_STYLE: TextStyle = {
  color: "#1f2725",
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
};

const DIAGNOSTICS_WIDTH = 300;

type RnLine = TextLayoutEvent["nativeEvent"]["lines"][number];

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleNonUseCaseDiagnosticsScreen() {
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

  const missingFields = [
    "layoutEngine",
    "heightMetricSource",
    "fallbackReason",
    "driftKinds",
    "normalizedRequest",
    "boundaryMap",
    "lineDiagnostics",
  ];
  const report = `NON_USE_CASE_REPORT::examples/non-use-case/layout-diagnostics::${JSON.stringify(
    {
      hiddenNodeCount: 1,
      layoutCallbackCount,
      lineCount: lines.length,
      missingFields,
      measuredHeight: layoutBox?.height ?? null,
      measuredWidth: layoutBox?.width ?? null,
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
            examples/non-use-case/layout-diagnostics
          </Text>
          <Text style={localStyles.title}>RN-only diagnostics gap</Text>
          <Text style={localStyles.description}>
            onLayout and onTextLayout expose rendered geometry, but not engine,
            fallback, drift, or boundary diagnostics.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Workaround</Text>
          <Text selectable style={localStyles.code}>
            {`<Text
  onLayout={(event) => setBox(event.nativeEvent.layout)}
  onTextLayout={(event) => setLines(event.nativeEvent.lines)}
>
  {text}
</Text>`}
          </Text>
        </View>

        <View style={localStyles.grid}>
          <Stat
            label="measured height"
            value={formatPixel(layoutBox?.height)}
          />
          <Stat label="lineCount" value={lines.length} />
          <Stat label="onLayout" value={layoutCallbackCount} />
          <Stat label="render passes" value={renderPassCount} />
          <Stat label="onTextLayout" value={textLayoutCallbackCount} />
        </View>

        <View style={[localStyles.preview, { width: DIAGNOSTICS_WIDTH }]}>
          <Text
            onLayout={recordLayout}
            onTextLayout={recordTextLayout}
            style={RN_DIAGNOSTICS_TEXT_STYLE}
          >
            {RN_DIAGNOSTICS_TEXT}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Available callback data</Text>
          <Text style={localStyles.body}>
            Box: {formatPixel(layoutBox?.width)} x{" "}
            {formatPixel(layoutBox?.height)}
          </Text>
          <Text style={localStyles.body}>
            Rendered line count: {lines.length}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Missing diagnostics</Text>
          {missingFields.map((field) => (
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

import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  layout,
  prepare,
  type InlineBoxFrame,
  type InlineSegment,
  type PretextPrepared,
  type PretextRichLayout,
  type PretextStyle,
} from "react-native-nitro-pretext";

const RICH_PARAGRAPH: InlineSegment[] = [
  {
    breakBehavior: "normal",
    text: "Native layout treats this ",
  },
  {
    accessibilityHint: "Inline status badge supplied by the app",
    accessibilityLabel: "Approved badge",
    accessibilityRole: "text",
    baseline: 19,
    boxId: "approval-badge",
    breakBehavior: "never",
    height: 26,
    kind: "box",
    width: 72,
  },
  {
    breakBehavior: "normal",
    text: " as an atomic inline box and returns its frame before render.",
  },
] as const;

const RICH_SOURCE = [RICH_PARAGRAPH] as const;

const RICH_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 24,
  locale: "en-US",
  textDirection: "auto",
};

const WIDTHS = [260, 300, 340] as const;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

function formatBoxFrame(frame: InlineBoxFrame): string {
  return `${frame.boxId} · line ${frame.lineIndex + 1} · ${Math.round(
    frame.left,
  )},${Math.round(frame.top)} · ${Math.round(frame.width)}x${Math.round(
    frame.height,
  )} · baseline ${Math.round(frame.baseline)}`;
}

export function ExampleUseCaseLayoutRichScreen() {
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
      prepared = prepare(RICH_SOURCE, RICH_STYLE);
      setPreparedState({ error: null, prepared });
    } catch (error) {
      setPreparedState({ error: describeError(error), prepared: null });
    }

    return () => {
      prepared?.release();
    };
  }, []);

  const richLayout = useMemo<PretextRichLayout | null>(() => {
    if (preparedState.prepared === null) {
      return null;
    }

    try {
      return layout(preparedState.prepared, {
        output: "rich",
        width,
      });
    } catch {
      return null;
    }
  }, [preparedState.prepared, width]);

  const paragraph = richLayout?.paragraphs[0] ?? null;
  const boxFrames = paragraph?.boxFrames ?? [];
  const report = `API_EXAMPLE_REPORT::examples/use-case/layout-rich::${JSON.stringify(
    {
      boxFrameCount: boxFrames.length,
      boxFrames,
      height: paragraph?.height ?? null,
      lineCount: paragraph?.lineCount ?? null,
      output: richLayout?.output ?? null,
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
          <Text style={localStyles.route}>examples/use-case/layout-rich</Text>
          <Text style={localStyles.title}>layout() rich inline boxes</Text>
          <Text style={localStyles.description}>
            Inline boxes are caller-supplied metrics. Pretext wraps them
            atomically and returns frames for RN overlays.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const prepared = prepare([[
  { text: "Deploy ", breakBehavior: "auto" },
  {
    kind: "box",
    boxId: "status-badge",
    width: 64,
    height: 24,
    baseline: 18,
    breakBehavior: "never",
  },
  { text: " when ready.", breakBehavior: "auto" },
]], style);
const rich = layout(prepared, {
  width,
  output: "rich",
});
const frames = rich.paragraphs[0].boxFrames;`}
          </Text>
        </View>

        <View style={localStyles.buttonRow}>
          {WIDTHS.map((nextWidth) => (
            <Choice
              key={nextWidth}
              label={`${nextWidth}px`}
              onPress={() => setWidth(nextWidth)}
              selected={width === nextWidth}
              testID={`examples.use-case.layout-rich.width.${nextWidth}`}
            />
          ))}
        </View>

        {preparedState.error ? (
          <View style={localStyles.panel}>
            <Text style={localStyles.panelTitle}>Prepare error</Text>
            <Text style={localStyles.body}>{preparedState.error}</Text>
          </View>
        ) : null}

        <View style={localStyles.grid}>
          <Stat label="lineCount" value={paragraph?.lineCount ?? "-"} />
          <Stat label="height" value={formatPixel(paragraph?.height)} />
          <Stat label="boxFrames" value={boxFrames.length} />
          <Stat label="first box" value={boxFrames[0]?.boxId ?? "missing"} />
        </View>

        <View
          style={[
            localStyles.canvas,
            {
              height: Math.max(96, paragraph?.height ?? 96),
              width,
            },
          ]}
        >
          {(paragraph?.lines ?? []).map((line, index) => (
            <View
              key={`${line.textStart}-${line.textEnd}`}
              style={[
                localStyles.lineBand,
                {
                  height: line.height,
                  left: line.left,
                  top: line.top,
                  width: line.width,
                },
              ]}
            >
              <Text style={localStyles.lineLabel}>line {index + 1}</Text>
            </View>
          ))}
          {boxFrames.map((frame) => (
            <View
              accessibilityHint={frame.accessibilityHint}
              accessibilityLabel={frame.accessibilityLabel}
              accessibilityRole="text"
              key={frame.boxId}
              style={[
                localStyles.inlineBox,
                {
                  height: frame.height,
                  left: frame.left,
                  top: frame.top,
                  width: frame.width,
                },
              ]}
            >
              <Text style={localStyles.inlineBoxText}>APPROVED</Text>
            </View>
          ))}
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Box frames</Text>
          {boxFrames.map((frame) => (
            <View key={frame.boxId} style={localStyles.frameRow}>
              <Text style={localStyles.frameTitle}>{frame.boxId}</Text>
              <Text style={localStyles.frameValue}>
                {formatBoxFrame(frame)}
              </Text>
              <Text style={localStyles.frameValue}>
                {frame.accessibilityLabel ?? "no accessibility label"}
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
  body: {
    color: "#4f5b57",
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  canvas: {
    alignSelf: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#1f2725",
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: "100%",
    overflow: "hidden",
    position: "relative",
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
  frameRow: {
    borderTopColor: "#e6ddcd",
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  frameTitle: {
    color: "#1f2725",
    fontSize: 14,
    fontWeight: "800",
  },
  frameValue: {
    color: "#4f5b57",
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 16,
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
  inlineBox: {
    alignItems: "center",
    backgroundColor: "#d9eadf",
    borderColor: "#4e7d5d",
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    position: "absolute",
  },
  inlineBoxText: {
    color: "#1f2725",
    fontSize: 9,
    fontWeight: "900",
  },
  lineBand: {
    backgroundColor: "#eadfd7",
    borderColor: "#d6c6b8",
    borderWidth: 1,
    justifyContent: "center",
    position: "absolute",
  },
  lineLabel: {
    color: "#7c6d60",
    fontSize: 10,
    fontWeight: "800",
    paddingLeft: 4,
    textTransform: "uppercase",
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

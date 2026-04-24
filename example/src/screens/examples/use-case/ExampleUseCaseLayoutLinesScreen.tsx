import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  layout,
  prepare,
  type ParagraphLineRange,
  type PretextLinesLayout,
  type PretextPrepared,
  type PretextStyle,
} from "react-native-nitro-pretext";

const LINES_TEXT =
  "Line output gives source UTF-16 offsets plus native top, left, width, height, ascent, and descent for every line.";

const LINES_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
  locale: "en-US",
  textDirection: "auto",
};

const WIDTHS = [240, 280, 320] as const;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatLine(line: ParagraphLineRange): string {
  return `${line.textStart}-${line.textEnd} · top ${formatNumber(
    line.top,
  )} · left ${formatNumber(line.left)} · ${formatNumber(
    line.width,
  )}x${formatNumber(line.height)} · asc ${formatNumber(
    line.ascent,
  )} · desc ${formatNumber(line.descent)}`;
}

export function ExampleUseCaseLayoutLinesScreen() {
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
      prepared = prepare(LINES_TEXT, LINES_STYLE);
      setPreparedState({ error: null, prepared });
    } catch (error) {
      setPreparedState({ error: describeError(error), prepared: null });
    }

    return () => {
      prepared?.release();
    };
  }, []);

  const linesLayout = useMemo<PretextLinesLayout | null>(() => {
    if (preparedState.prepared === null) {
      return null;
    }

    try {
      return layout(preparedState.prepared, {
        left: 12,
        output: "lines",
        width,
      });
    } catch {
      return null;
    }
  }, [preparedState.prepared, width]);

  const lines = linesLayout?.paragraphs[0]?.lines ?? [];
  const paragraphHeight = linesLayout?.paragraphs[0]?.height ?? 0;
  const report = `API_EXAMPLE_REPORT::examples/use-case/layout-lines::${JSON.stringify(
    {
      firstLine: lines[0] ?? null,
      lineCount: lines.length,
      output: linesLayout?.output ?? null,
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
          <Text style={localStyles.route}>examples/use-case/layout-lines</Text>
          <Text style={localStyles.title}>layout() lines</Text>
          <Text style={localStyles.description}>
            Request line geometry when the caller owns custom placement or hit
            testing.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const lines = layout(prepared, {
  width,
  left: 12,
  output: "lines",
});`}
          </Text>
        </View>

        <View style={localStyles.buttonRow}>
          {WIDTHS.map((nextWidth) => (
            <Choice
              key={nextWidth}
              label={`${nextWidth}px`}
              onPress={() => setWidth(nextWidth)}
              selected={width === nextWidth}
              testID={`examples.use-case.layout-lines.width.${nextWidth}`}
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
          <Stat label="lineCount" value={lines.length} />
          <Stat
            label="paragraph height"
            value={
              linesLayout?.paragraphs[0]
                ? `${Math.round(linesLayout.paragraphs[0].height)} px`
                : "-"
            }
          />
        </View>

        <View
          style={[
            localStyles.preview,
            { minHeight: Math.max(96, paragraphHeight), width: width + 12 },
          ]}
        >
          {lines.map((line, index) => (
            <View
              key={`${line.textStart}-${line.textEnd}-${index}`}
              pointerEvents="none"
              style={[
                localStyles.lineBand,
                {
                  height: Math.max(4, line.height),
                  left: line.left,
                  top: line.top,
                  width: line.width,
                },
              ]}
            />
          ))}
          <Text
            style={[
              localStyles.previewText,
              {
                marginLeft: 12,
                width,
              },
            ]}
          >
            {LINES_TEXT}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Line table</Text>
          {lines.map((line, index) => (
            <View
              key={`${line.textStart}-${line.textEnd}`}
              style={localStyles.lineRow}
            >
              <Text style={localStyles.lineTitle}>Line {index + 1}</Text>
              <Text style={localStyles.lineValue}>{formatLine(line)}</Text>
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
  lineBand: {
    backgroundColor: "rgba(44, 117, 93, 0.14)",
    borderColor: "rgba(44, 117, 93, 0.34)",
    borderRadius: 4,
    borderWidth: 1,
    position: "absolute",
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
    overflow: "hidden",
  },
  previewText: {
    color: "#1f2725",
    fontFamily: "System",
    fontSize: 16,
    includeFontPadding: true,
    lineHeight: 23,
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

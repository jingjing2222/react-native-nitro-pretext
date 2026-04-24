import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  layout,
  prepare,
  type ParagraphShapeSlice,
  type PretextMetricsLayout,
  type PretextPrepared,
  type PretextStyle,
} from "react-native-nitro-pretext";

const OPTIONS_TEXT =
  "Options let callers pass width, left, shapeSlices, whiteSpace, and wordBreak as one native layout request. The visible renderer can stay ordinary RN Text.";

const OPTIONS_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
  locale: "en-US",
  textDirection: "auto",
};

const WIDTHS = [260, 300, 340] as const;
const LEFTS = [0, 16] as const;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatPixel(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleUseCaseLayoutOptionsScreen() {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const [left, setLeft] = useState<(typeof LEFTS)[number]>(LEFTS[0]);
  const [shapeEnabled, setShapeEnabled] = useState(true);
  const [whiteSpace, setWhiteSpace] = useState<"normal" | "pre">("normal");
  const [wordBreak, setWordBreak] = useState<"normal" | "break-all">("normal");
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
      prepared = prepare(OPTIONS_TEXT, OPTIONS_STYLE);
      setPreparedState({ error: null, prepared });
    } catch (error) {
      setPreparedState({ error: describeError(error), prepared: null });
    }

    return () => {
      prepared?.release();
    };
  }, []);

  const shapeSlices = useMemo<ParagraphShapeSlice[]>(
    () =>
      shapeEnabled
        ? [
            {
              height: 54,
              left: 58,
              top: 0,
              width: Math.max(1, width - 58),
            },
          ]
        : [],
    [shapeEnabled, width],
  );

  const layouts = useMemo<{
    objectMetrics: PretextMetricsLayout | null;
    shorthandMetrics: PretextMetricsLayout | null;
  }>(() => {
    if (preparedState.prepared === null) {
      return {
        objectMetrics: null,
        shorthandMetrics: null,
      };
    }

    try {
      return {
        objectMetrics: layout(preparedState.prepared, {
          left,
          output: "metrics",
          shapeSlices,
          whiteSpace,
          width,
          wordBreak,
        }),
        shorthandMetrics: layout(preparedState.prepared, width),
      };
    } catch {
      return {
        objectMetrics: null,
        shorthandMetrics: null,
      };
    }
  }, [left, preparedState.prepared, shapeSlices, whiteSpace, width, wordBreak]);

  const report = `API_EXAMPLE_REPORT::examples/use-case/layout-options::${JSON.stringify(
    {
      left,
      objectHeight: layouts.objectMetrics?.height ?? null,
      objectLineCount: layouts.objectMetrics?.lineCount ?? null,
      shapeSliceCount: shapeSlices.length,
      shorthandHeight: layouts.shorthandMetrics?.height ?? null,
      whiteSpace,
      width,
      wordBreak,
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
            examples/use-case/layout-options
          </Text>
          <Text style={localStyles.title}>layout() options</Text>
          <Text style={localStyles.description}>
            Compare width shorthand with the object request form.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const shorthand = layout(prepared, width);
const metrics = layout(prepared, {
  width,
  left,
  shapeSlices,
  whiteSpace,
  wordBreak,
});`}
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
                testID={`examples.use-case.layout-options.width.${nextWidth}`}
              />
            ))}
          </View>
        </View>

        <View style={localStyles.controlGroup}>
          <Text style={localStyles.controlLabel}>left</Text>
          <View style={localStyles.buttonRow}>
            {LEFTS.map((nextLeft) => (
              <Choice
                key={nextLeft}
                label={`${nextLeft}px`}
                onPress={() => setLeft(nextLeft)}
                selected={left === nextLeft}
                testID={`examples.use-case.layout-options.left.${nextLeft}`}
              />
            ))}
          </View>
        </View>

        <View style={localStyles.controlGroup}>
          <Text style={localStyles.controlLabel}>rules</Text>
          <View style={localStyles.buttonRow}>
            <Choice
              label={shapeEnabled ? "shape on" : "shape off"}
              onPress={() => setShapeEnabled((value) => !value)}
              selected={shapeEnabled}
              testID="examples.use-case.layout-options.shape"
            />
            <Choice
              label={whiteSpace}
              onPress={() =>
                setWhiteSpace((value) =>
                  value === "normal" ? "pre" : "normal",
                )
              }
              selected={whiteSpace === "pre"}
              testID="examples.use-case.layout-options.whitespace"
            />
            <Choice
              label={wordBreak}
              onPress={() =>
                setWordBreak((value) =>
                  value === "normal" ? "break-all" : "normal",
                )
              }
              selected={wordBreak === "break-all"}
              testID="examples.use-case.layout-options.wordbreak"
            />
          </View>
        </View>

        {preparedState.error ? (
          <View style={localStyles.panel}>
            <Text style={localStyles.panelTitle}>Prepare error</Text>
            <Text style={localStyles.body}>{preparedState.error}</Text>
          </View>
        ) : null}

        <View style={localStyles.grid}>
          <Stat
            label="shorthand height"
            value={formatPixel(layouts.shorthandMetrics?.height)}
          />
          <Stat
            label="object height"
            value={formatPixel(layouts.objectMetrics?.height)}
          />
          <Stat
            label="object lines"
            value={layouts.objectMetrics?.lineCount ?? "-"}
          />
          <Stat label="shape slices" value={shapeSlices.length} />
        </View>

        <View style={[localStyles.preview, { width }]}>
          {shapeEnabled ? <View style={localStyles.obstacle} /> : null}
          <Text
            style={[
              localStyles.previewText,
              {
                marginLeft: left,
                width: width - left,
              },
            ]}
          >
            {OPTIONS_TEXT}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Request object</Text>
          <Text selectable style={localStyles.code}>
            {JSON.stringify(
              {
                left,
                shapeSlices,
                whiteSpace,
                width,
                wordBreak,
              },
              null,
              2,
            )}
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
  obstacle: {
    backgroundColor: "#d9eadf",
    borderColor: "#7e9a88",
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

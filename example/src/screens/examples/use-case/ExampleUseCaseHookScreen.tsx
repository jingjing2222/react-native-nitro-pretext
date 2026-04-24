import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  usePretextLayout,
  type PretextLayout,
  type PretextLayoutOutput,
  type PretextStyle,
} from "react-native-nitro-pretext";

const SHORT_TEXT =
  "usePretextLayout prepares, layouts, and releases native state with React lifecycle.";
const LONG_TEXT =
  "usePretextLayout prepares, layouts, and releases native state with React lifecycle. Toggle width, output, enabled, and source to see the hook contract update without manual release code.";

const HOOK_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
  locale: "en-US",
  textDirection: "auto",
};

const WIDTHS = [260, 300, 340] as const;
const OUTPUTS: PretextLayoutOutput[] = ["metrics", "lines", "diagnostics"];

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function summarizeLayout(layout: PretextLayout | null): {
  height: number | null;
  layoutEngine: string | null;
  lineCount: number | null;
  maxLineWidth: number | null;
} {
  if (layout === null) {
    return {
      height: null,
      layoutEngine: null,
      lineCount: null,
      maxLineWidth: null,
    };
  }

  if (layout.output === "metrics") {
    return {
      height: layout.height,
      layoutEngine: null,
      lineCount: layout.lineCount,
      maxLineWidth: layout.maxLineWidth,
    };
  }

  if (layout.output === "diagnostics") {
    const paragraph = layout.paragraphs[0] ?? null;

    return {
      height: paragraph?.height ?? null,
      layoutEngine: paragraph?.diagnostics.layoutEngine ?? null,
      lineCount: paragraph?.lineCount ?? null,
      maxLineWidth: paragraph?.maxLineWidth ?? null,
    };
  }

  const paragraph = layout.paragraphs[0] ?? null;

  return {
    height: paragraph?.height ?? null,
    layoutEngine: null,
    lineCount: paragraph?.lineCount ?? null,
    maxLineWidth: paragraph?.maxLineWidth ?? null,
  };
}

function formatPixel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

function formatMs(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(2)} ms`;
}

export function ExampleUseCaseHookScreen() {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(true);
  const [source, setSource] = useState<"short" | "long">("short");
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[1]);
  const [output, setOutput] = useState<PretextLayoutOutput>("metrics");
  const text = source === "short" ? SHORT_TEXT : LONG_TEXT;
  const result = usePretextLayout({
    enabled,
    output,
    style: HOOK_STYLE,
    text,
    width,
  });
  const summary = useMemo(
    () => summarizeLayout(result.layout),
    [result.layout],
  );
  const report = `API_EXAMPLE_REPORT::examples/use-case/use-pretext-layout::${JSON.stringify(
    {
      enabled,
      error: result.error === null ? null : describeError(result.error),
      height: summary.height,
      isPreparing: result.isPreparing,
      layoutEngine: summary.layoutEngine,
      layoutOutput: result.layout?.output ?? null,
      lineCount: summary.lineCount,
      output,
      paragraphCount: result.paragraphCount,
      source,
      statsTotalMs: result.stats?.totalMs ?? null,
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
            examples/use-case/use-pretext-layout
          </Text>
          <Text style={localStyles.title}>usePretextLayout() hook</Text>
          <Text style={localStyles.description}>
            Let React own prepare, layout, error, and release lifecycle.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const result = usePretextLayout({
  text,
  width,
  style,
  output,
  enabled,
});`}
          </Text>
        </View>

        <View style={localStyles.controlGroup}>
          <Text style={localStyles.controlLabel}>enabled</Text>
          <View style={localStyles.buttonRow}>
            <Choice
              label={enabled ? "enabled" : "disabled"}
              onPress={() => setEnabled((value) => !value)}
              selected={enabled}
              testID="examples.use-case.hook.enabled"
            />
            <Choice
              label={source}
              onPress={() =>
                setSource((value) => (value === "short" ? "long" : "short"))
              }
              selected={source === "long"}
              testID="examples.use-case.hook.source"
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
                testID={`examples.use-case.hook.width.${nextWidth}`}
              />
            ))}
          </View>
        </View>

        <View style={localStyles.controlGroup}>
          <Text style={localStyles.controlLabel}>output</Text>
          <View style={localStyles.buttonRow}>
            {OUTPUTS.map((nextOutput) => (
              <Choice
                key={nextOutput}
                label={nextOutput}
                onPress={() => setOutput(nextOutput)}
                selected={output === nextOutput}
                testID={`examples.use-case.hook.output.${nextOutput}`}
              />
            ))}
          </View>
        </View>

        <View style={localStyles.grid}>
          <Stat label="layout output" value={result.layout?.output ?? "-"} />
          <Stat label="paragraphCount" value={result.paragraphCount} />
          <Stat label="isPreparing" value={result.isPreparing ? "yes" : "no"} />
          <Stat label="height" value={formatPixel(summary.height)} />
          <Stat label="lineCount" value={summary.lineCount ?? "-"} />
          <Stat label="stats.totalMs" value={formatMs(result.stats?.totalMs)} />
        </View>

        <View style={[localStyles.preview, { width }]}>
          <Text style={localStyles.previewText}>{text}</Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Hook result</Text>
          <Text style={localStyles.body}>
            error:{" "}
            {result.error === null ? "none" : describeError(result.error)}
          </Text>
          <Text style={localStyles.body}>
            layoutEngine: {summary.layoutEngine ?? "-"}
          </Text>
          <Text style={localStyles.body}>
            maxLineWidth: {formatPixel(summary.maxLineWidth)}
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

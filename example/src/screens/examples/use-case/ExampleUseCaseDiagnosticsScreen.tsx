import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  layout,
  prepare,
  type PretextDiagnosticsLayout,
  type PretextPrepared,
  type PretextStyle,
} from "react-native-nitro-pretext";

const DIAGNOSTICS_TEXT =
  "Diagnostics show which native engine measured the text, which request reached native code, and whether fallback or drift conditions were detected.";

const DIAGNOSTICS_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
  locale: "en-US",
  textDirection: "auto",
};

const WIDTHS = [260, 300, 340] as const;

type Diagnostics =
  PretextDiagnosticsLayout["paragraphs"][number]["diagnostics"];

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function joinList(values: readonly string[] | undefined): string {
  if (!values || values.length === 0) {
    return "none";
  }

  return values.join(", ");
}

function formatRequest(diagnostics: Diagnostics | null): string {
  if (diagnostics === null) {
    return "-";
  }

  return JSON.stringify(diagnostics.normalizedRequest, null, 2);
}

export function ExampleUseCaseDiagnosticsScreen() {
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
      prepared = prepare(DIAGNOSTICS_TEXT, DIAGNOSTICS_STYLE);
      setPreparedState({ error: null, prepared });
    } catch (error) {
      setPreparedState({ error: describeError(error), prepared: null });
    }

    return () => {
      prepared?.release();
    };
  }, []);

  const diagnosticsLayout = useMemo<PretextDiagnosticsLayout | null>(() => {
    if (preparedState.prepared === null) {
      return null;
    }

    try {
      return layout(preparedState.prepared, {
        left: 8,
        output: "diagnostics",
        shapeSlices: [
          {
            height: 46,
            left: 38,
            top: 0,
            width: Math.max(1, width - 38),
          },
        ],
        width,
      });
    } catch {
      return null;
    }
  }, [preparedState.prepared, width]);

  const paragraph = diagnosticsLayout?.paragraphs[0] ?? null;
  const diagnostics = paragraph?.diagnostics ?? null;
  const boundaryMap = diagnostics?.boundaryMap ?? null;
  const report = `API_EXAMPLE_REPORT::examples/use-case/layout-diagnostics::${JSON.stringify(
    {
      boundaryMapUtf16Length: boundaryMap?.utf16Length ?? null,
      driftKinds: diagnostics?.driftKinds ?? [],
      fallbackReason: diagnostics?.fallbackReason ?? null,
      heightMetricSource: diagnostics?.heightMetricSource ?? null,
      layoutEngine: diagnostics?.layoutEngine ?? null,
      lineDiagnosticCount: diagnostics?.lineDiagnostics.length ?? 0,
      normalizedRequest: diagnostics?.normalizedRequest ?? null,
      output: diagnosticsLayout?.output ?? null,
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
            examples/use-case/layout-diagnostics
          </Text>
          <Text style={localStyles.title}>layout() diagnostics</Text>
          <Text style={localStyles.description}>
            Use diagnostics to explain native engine choice, request
            normalization, boundary mapping, and drift classes.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const diagnostics = layout(prepared, {
  width,
  left: 8,
  shapeSlices,
  output: "diagnostics",
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
              testID={`examples.use-case.layout-diagnostics.width.${nextWidth}`}
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
          <Stat label="layoutEngine" value={diagnostics?.layoutEngine ?? "-"} />
          <Stat
            label="height source"
            value={diagnostics?.heightMetricSource ?? "-"}
          />
          <Stat
            label="fallback"
            value={diagnostics?.fallbackReason ?? "none"}
          />
          <Stat label="driftKinds" value={joinList(diagnostics?.driftKinds)} />
        </View>

        <View style={[localStyles.preview, { width }]}>
          <Text style={localStyles.previewText}>{DIAGNOSTICS_TEXT}</Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Normalized request</Text>
          <Text selectable style={localStyles.code}>
            {formatRequest(diagnostics)}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Boundary map</Text>
          <Text style={localStyles.body}>
            utf16Length: {boundaryMap?.utf16Length ?? "-"}
          </Text>
          <Text style={localStyles.body}>
            grapheme boundaries: {boundaryMap?.graphemeBoundaries.length ?? 0}
          </Text>
          <Text style={localStyles.body}>
            native soft breaks: {boundaryMap?.nativeSoftBreaks.length ?? 0}
          </Text>
          <Text style={localStyles.body}>
            cluster violations:{" "}
            {boundaryMap?.clusterViolationOffsets.length ?? 0}
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Line diagnostics</Text>
          {(diagnostics?.lineDiagnostics ?? []).map((line, index) => (
            <View
              key={`${line.textStart}-${line.textEnd}`}
              style={localStyles.lineRow}
            >
              <Text style={localStyles.lineTitle}>Line {index + 1}</Text>
              <Text style={localStyles.lineValue}>
                {`${line.textStart}-${line.textEnd} | ${line.layoutEngine} | ${
                  line.textDirection
                } | ${line.heightMetricSource} | ${joinList(line.driftKinds)}`}
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
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  title: {
    color: "#1f2725",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
  },
});

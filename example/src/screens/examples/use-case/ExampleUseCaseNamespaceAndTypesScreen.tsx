import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Pretext,
  layout,
  prepare,
  usePretextLayout,
  type InlineBoxFrame,
  type InlineSegment,
  type LaidOutParagraphLines,
  type LaidOutParagraphLinesWithDiagnostics,
  type LaidOutParagraphMetrics,
  type LaidOutRichParagraphLines,
  type ParagraphLineRange,
  type ParagraphShapeSlice,
  type PrepareParagraphStats,
  type PretextDiagnosticsLayout,
  type PretextLayout,
  type PretextLayoutInput,
  type PretextLayoutOptions,
  type PretextLayoutOutput,
  type PretextLinesLayout,
  type PretextMetricsLayout,
  type PretextPrepared,
  type PretextRichLayout,
  type PretextSource,
  type PretextStyle,
} from "react-native-nitro-pretext";

import { useCaseExamples } from "../apiExampleManifest";

const NAMESPACE_TEXT =
  "Pretext exposes named functions and a namespace object from the same package root.";

const NAMESPACE_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 23,
  locale: "en-US",
  textDirection: "auto",
};

const NAMESPACE_WIDTH = 300;

type ExportedTypeProbe = {
  InlineBoxFrame: InlineBoxFrame;
  InlineSegment: InlineSegment;
  LaidOutParagraphLines: LaidOutParagraphLines;
  LaidOutParagraphLinesWithDiagnostics: LaidOutParagraphLinesWithDiagnostics;
  LaidOutParagraphMetrics: LaidOutParagraphMetrics;
  LaidOutRichParagraphLines: LaidOutRichParagraphLines;
  ParagraphLineRange: ParagraphLineRange;
  ParagraphShapeSlice: ParagraphShapeSlice;
  PrepareParagraphStats: PrepareParagraphStats;
  PretextDiagnosticsLayout: PretextDiagnosticsLayout;
  PretextLayout: PretextLayout;
  PretextLayoutInput: PretextLayoutInput;
  PretextLayoutOptions: PretextLayoutOptions;
  PretextLayoutOutput: PretextLayoutOutput;
  PretextLinesLayout: PretextLinesLayout;
  PretextMetricsLayout: PretextMetricsLayout;
  PretextPrepared: PretextPrepared;
  PretextRichLayout: PretextRichLayout;
  PretextSource: PretextSource;
  PretextStyle: PretextStyle;
};

const EXPORTED_TYPE_NAMES: Array<keyof ExportedTypeProbe> = [
  "PretextSource",
  "PretextStyle",
  "PretextPrepared",
  "PretextLayoutInput",
  "PretextLayoutOptions",
  "PretextLayoutOutput",
  "PretextLayout",
  "PretextMetricsLayout",
  "PretextLinesLayout",
  "PretextDiagnosticsLayout",
  "PretextRichLayout",
  "PrepareParagraphStats",
  "InlineSegment",
  "InlineBoxFrame",
  "ParagraphLineRange",
  "ParagraphShapeSlice",
  "LaidOutParagraphMetrics",
  "LaidOutParagraphLines",
  "LaidOutParagraphLinesWithDiagnostics",
  "LaidOutRichParagraphLines",
];

type ComparisonState = {
  error: string | null;
  namedHeight: number | null;
  namedLineCount: number | null;
  namespaceHeight: number | null;
  namespaceLineCount: number | null;
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatPixel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

export function ExampleUseCaseNamespaceAndTypesScreen() {
  const insets = useSafeAreaInsets();
  const [comparison, setComparison] = useState<ComparisonState>({
    error: null,
    namedHeight: null,
    namedLineCount: null,
    namespaceHeight: null,
    namespaceLineCount: null,
  });
  const functionMatches = {
    layout: Pretext.layout === layout,
    prepare: Pretext.prepare === prepare,
    usePretextLayout: Pretext.usePretextLayout === usePretextLayout,
  };
  const routes = useCaseExamples.map((entry) => entry.path);

  useEffect(() => {
    let namedPrepared: PretextPrepared | null = null;
    let namespacePrepared: PretextPrepared | null = null;

    try {
      namedPrepared = prepare(NAMESPACE_TEXT, NAMESPACE_STYLE);
      namespacePrepared = Pretext.prepare(NAMESPACE_TEXT, NAMESPACE_STYLE);
      const namedLayout = layout(namedPrepared, NAMESPACE_WIDTH);
      const namespaceLayout = Pretext.layout(
        namespacePrepared,
        NAMESPACE_WIDTH,
      );

      setComparison({
        error: null,
        namedHeight: namedLayout.height,
        namedLineCount: namedLayout.lineCount,
        namespaceHeight: namespaceLayout.height,
        namespaceLineCount: namespaceLayout.lineCount,
      });
    } catch (error) {
      setComparison({
        error: describeError(error),
        namedHeight: null,
        namedLineCount: null,
        namespaceHeight: null,
        namespaceLineCount: null,
      });
    } finally {
      namedPrepared?.release();
      namespacePrepared?.release();
    }
  }, []);

  const hasReadyMetrics =
    comparison.error === null &&
    typeof comparison.namedHeight === "number" &&
    comparison.namedHeight > 0 &&
    typeof comparison.namespaceHeight === "number" &&
    comparison.namespaceHeight > 0 &&
    typeof comparison.namedLineCount === "number" &&
    comparison.namedLineCount > 0 &&
    typeof comparison.namespaceLineCount === "number" &&
    comparison.namespaceLineCount > 0;
  const sameMetrics =
    hasReadyMetrics &&
    comparison.namedHeight === comparison.namespaceHeight &&
    comparison.namedLineCount === comparison.namespaceLineCount;
  const report = `API_EXAMPLE_REPORT::examples/use-case/namespace-and-types::${JSON.stringify(
    {
      error: comparison.error,
      exportedTypes: EXPORTED_TYPE_NAMES,
      functionMatches,
      namedHeight: comparison.namedHeight,
      namespaceHeight: comparison.namespaceHeight,
      ready: sameMetrics,
      routeCount: routes.length,
      sameMetrics,
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
            examples/use-case/namespace-and-types
          </Text>
          <Text style={localStyles.title}>Pretext namespace and types</Text>
          <Text style={localStyles.description}>
            Named exports and the Pretext namespace come from the same package
            root.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const named = prepare(text, style);
const namespace = Pretext.prepare(text, style);
layout(named, width);
Pretext.layout(namespace, width);`}
          </Text>
        </View>

        <View style={localStyles.grid}>
          <Stat
            label="prepare"
            value={functionMatches.prepare ? "same" : "different"}
          />
          <Stat
            label="layout"
            value={functionMatches.layout ? "same" : "different"}
          />
          <Stat
            label="hook"
            value={functionMatches.usePretextLayout ? "same" : "different"}
          />
          <Stat label="same metrics" value={sameMetrics ? "yes" : "no"} />
          <Stat
            label="named height"
            value={formatPixel(comparison.namedHeight)}
          />
          <Stat
            label="namespace height"
            value={formatPixel(comparison.namespaceHeight)}
          />
        </View>

        {comparison.error ? (
          <View style={localStyles.panel}>
            <Text style={localStyles.panelTitle}>Comparison error</Text>
            <Text style={localStyles.body}>{comparison.error}</Text>
          </View>
        ) : null}

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Exported types</Text>
          {EXPORTED_TYPE_NAMES.map((typeName) => (
            <Text key={typeName} style={localStyles.body}>
              {typeName}
            </Text>
          ))}
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>API routes</Text>
          {routes.map((route) => (
            <Text key={route} style={localStyles.body}>
              {route}
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

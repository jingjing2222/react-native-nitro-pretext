import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  PreparedParagraphLinesView,
  layoutParagraphLinesWithRequest,
} from "../../pretextLegacy";

import {
  PARAGRAPH_HORIZONTAL_PADDING,
  PARAGRAPH_VERTICAL_PADDING,
  styles,
} from "../../benchmark/constants";
import { SummaryMetric } from "../../components/BenchmarkComponents";
import { BENCHMARK_STYLE } from "../../relayoutBenchmark";
import {
  EXAMPLE_TEXT,
  ExamplePageShell,
  PreparingCard,
  buildShapedExampleRequest,
  useExampleWidthSelection,
  usePreparedParagraphExample,
} from "./shared";

export function PreparedLinesExampleScreen() {
  const prepared = usePreparedParagraphExample(EXAMPLE_TEXT);
  const { layoutWidth, selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const layoutRequest = useMemo(
    () => buildShapedExampleRequest(layoutWidth),
    [layoutWidth],
  );
  const paragraph =
    prepared === null
      ? null
      : (layoutParagraphLinesWithRequest(
          prepared.prepared.id,
          layoutRequest,
        )[0] ?? null);

  return (
    <ExamplePageShell
      description="This renderer consumes explicit line ranges from prepared state and places one React Native <Text> node per line."
      lineCount={paragraph?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/prepared-lines"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Line-range renderer from prepared paragraph state"
      widths={widths}
    >
      {prepared === null ? (
        <PreparingCard />
      ) : (
        <>
          <View style={styles.stageCard}>
            <Text style={styles.stageLabel}>Renderer</Text>
            <Text style={styles.stageTitle}>PreparedParagraphLinesView</Text>
            <Text style={styles.stageMeta}>
              Explicit line ranges are consumed directly and each line is placed
              onto the surface with absolute positioning.
            </Text>
            <View style={styles.exampleSurface}>
              <PreparedParagraphLinesView
                contentInsetHorizontal={PARAGRAPH_HORIZONTAL_PADDING}
                contentInsetVertical={PARAGRAPH_VERTICAL_PADDING}
                layoutRequest={layoutRequest}
                layoutWidth={layoutWidth}
                paragraphIndex={0}
                paragraphStyle={BENCHMARK_STYLE}
                paragraphText={EXAMPLE_TEXT}
                prepared={prepared.prepared}
                style={[styles.paragraphSurface, { width: selectedWidth }]}
              />
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Renderer Notes</Text>
            <Text style={styles.summaryDescription}>
              This is a renderer-oriented stepping stone for Skia or other
              custom surfaces. It follows precomputed line positions directly,
              but it still creates one RN text node per line.
            </Text>
            <View style={styles.summaryMetricList}>
              <SummaryMetric
                label="Line nodes"
                value={
                  paragraph === null ? "—" : String(paragraph.lines.length)
                }
              />
              <SummaryMetric
                label="Max line width"
                value={
                  paragraph === null
                    ? "—"
                    : `${paragraph.maxLineWidth.toFixed(1)} px`
                }
              />
            </View>
          </View>
        </>
      )}
    </ExamplePageShell>
  );
}

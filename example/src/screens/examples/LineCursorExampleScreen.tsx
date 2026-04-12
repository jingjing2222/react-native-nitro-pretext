import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  createParagraphLayoutRequest,
  createParagraphLineCursor,
  layoutParagraphLinesWithRequest,
  layoutParagraphsMetadata,
  nextParagraphLine,
  PreparedParagraphText,
  releaseParagraphLineCursor,
} from "react-native-nitro-pretext";

import { styles } from "../../benchmark/constants";
import { SummaryMetric } from "../../components/BenchmarkComponents";
import { BENCHMARK_STYLE } from "../../relayoutBenchmark";
import {
  CURSOR_TEXT,
  ExamplePageShell,
  PreparingCard,
  useExampleWidthSelection,
  usePreparedParagraphExample,
} from "./shared";

function buildCursorRequest(layoutWidth: number) {
  return createParagraphLayoutRequest(layoutWidth, {
    left: 0,
    wordBreak: "break-all",
    shapeSlices: [
      {
        top: 0,
        height: BENCHMARK_STYLE.lineHeight,
        left: 0,
        width: layoutWidth,
      },
      {
        top: BENCHMARK_STYLE.lineHeight,
        height: BENCHMARK_STYLE.lineHeight * 2,
        left: 36,
        width: Math.max(120, layoutWidth - 36),
      },
    ],
  });
}

export function LineCursorExampleScreen() {
  const prepared = usePreparedParagraphExample(CURSOR_TEXT);
  const { layoutWidth, selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const paragraphMetrics =
    prepared === null
      ? null
      : layoutParagraphsMetadata(prepared.prepared.id, layoutWidth);
  const cursorRequest = useMemo(
    () => buildCursorRequest(layoutWidth),
    [layoutWidth],
  );
  const cursorLines = useMemo(() => {
    if (prepared === null) {
      return [];
    }

    const cursor = createParagraphLineCursor(
      prepared.prepared.id,
      0,
      cursorRequest,
    );
    const lines = [];
    try {
      while (true) {
        const line = nextParagraphLine(cursor.id);
        if (line.done) {
          break;
        }
        lines.push(line);
      }
    } finally {
      releaseParagraphLineCursor(cursor.id);
    }

    return lines;
  }, [cursorRequest, prepared]);
  const cursorParagraph = useMemo(() => {
    if (prepared === null) {
      return null;
    }

    return layoutParagraphLinesWithRequest(prepared.prepared.id, cursorRequest)[0] ?? null;
  }, [cursorRequest, prepared]);

  return (
    <ExamplePageShell
      description="Custom renderers can request a shaped layout and then walk the resulting line ranges one step at a time."
      lineCount={paragraphMetrics?.[0]?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/line-cursor"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Cursor-driven line streaming from request-based relayout"
      widths={widths}
    >
      {prepared === null ? (
        <PreparingCard />
      ) : (
        <>
          <View style={styles.stageCard}>
            <Text style={styles.stageLabel}>Request-based Relayout</Text>
            <Text style={styles.stageTitle}>Shape slices + break-all</Text>
            <View style={styles.exampleSurface}>
              <PreparedParagraphText
                allowFontScaling={false}
                layoutRequest={cursorRequest}
                layoutWidth={layoutWidth}
                paragraphIndex={0}
                prepared={prepared.prepared}
                style={[styles.paragraph, { width: selectedWidth }]}
              />
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Cursor Output</Text>
            <Text style={styles.summaryDescription}>
              `createParagraphLineCursor()` streams line ranges one by one from the same request-based relayout.
            </Text>
            <View style={styles.summaryMetricList}>
              <SummaryMetric
                label="Materialized lines"
                value={cursorParagraph === null ? "—" : String(cursorParagraph.lines.length)}
              />
              <SummaryMetric
                label="Cursor lines"
                value={String(cursorLines.length)}
              />
            </View>
            <View style={styles.codeList}>
              {cursorLines.map((line, index) => (
                <Text key={`cursor-line-${index}`} style={styles.codeRow}>
                  {`#${index + 1} start=${line.textStart} end=${line.textEnd} top=${line.top.toFixed(
                    1,
                  )} left=${line.left.toFixed(1)} width=${line.width.toFixed(1)}`}
                </Text>
              ))}
            </View>
          </View>
        </>
      )}
    </ExamplePageShell>
  );
}

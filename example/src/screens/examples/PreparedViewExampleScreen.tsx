import { Text, View } from "react-native";
import {
  PreparedParagraphView,
  layoutParagraphsMetadata,
} from "react-native-nitro-pretext";

import {
  PARAGRAPH_HORIZONTAL_PADDING,
  PARAGRAPH_VERTICAL_PADDING,
  styles,
} from "../../benchmark/constants";
import { BENCHMARK_STYLE } from "../../relayoutBenchmark";
import {
  EXAMPLE_TEXT,
  ExamplePageShell,
  PreparingCard,
  useExampleWidthSelection,
  usePreparedParagraphExample,
} from "./shared";

export function PreparedViewExampleScreen() {
  const prepared = usePreparedParagraphExample(EXAMPLE_TEXT);
  const { layoutWidth, selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const paragraphMetrics =
    prepared === null
      ? null
      : layoutParagraphsMetadata(prepared.prepared.id, layoutWidth);
  const paragraphHeight =
    paragraphMetrics?.[0]?.height ?? BENCHMARK_STYLE.lineHeight;

  return (
    <ExamplePageShell
      description="The native view consumes preparedId and paragraphIndex directly, so JS does not materialize line arrays for rendering."
      lineCount={paragraphMetrics?.[0]?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/prepared-view"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Native paragraph surface from prepared state"
      widths={widths}
    >
      {prepared === null ? (
        <PreparingCard />
      ) : (
        <View style={styles.stageCard}>
          <Text style={styles.stageLabel}>Renderer</Text>
          <Text style={styles.stageTitle}>PreparedParagraphView</Text>
          <View style={styles.exampleSurface}>
            <PreparedParagraphView
              contentInsetHorizontal={PARAGRAPH_HORIZONTAL_PADDING}
              contentInsetVertical={PARAGRAPH_VERTICAL_PADDING}
              layoutWidth={layoutWidth}
              paragraphHeight={paragraphHeight}
              paragraphIndex={0}
              paragraphStyle={BENCHMARK_STYLE}
              prepared={prepared.prepared}
              style={[styles.paragraphSurface, { width: selectedWidth }]}
            />
          </View>
        </View>
      )}
    </ExamplePageShell>
  );
}

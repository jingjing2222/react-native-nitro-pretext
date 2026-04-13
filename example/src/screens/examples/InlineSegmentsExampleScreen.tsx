import { Text, View } from "react-native";
import {
  PreparedParagraphView,
  layoutParagraphsMetadata,
} from "react-native-nitro-pretext";

import { styles } from "../../benchmark/constants";
import { BENCHMARK_STYLE } from "../../relayoutBenchmark";
import {
  ExamplePageShell,
  INLINE_EXAMPLE,
  PreparingCard,
  useExampleWidthSelection,
  usePreparedInlineExample,
} from "./shared";

export function InlineSegmentsExampleScreen() {
  const prepared = usePreparedInlineExample(INLINE_EXAMPLE);
  const { layoutWidth, selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const paragraphMetrics =
    prepared === null
      ? null
      : layoutParagraphsMetadata(prepared.prepared.id, layoutWidth);

  return (
    <ExamplePageShell
      description="Inline segments now carry per-run font overrides so the native paragraph path can shape mixed runs, while explicit never-break spans still fall back only where they must."
      lineCount={paragraphMetrics?.[0]?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/inline-segments"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Styled inline paragraph preparation"
      widths={widths}
    >
      {prepared === null ? (
        <PreparingCard />
      ) : (
        <View style={styles.stageCard}>
          <Text style={styles.stageLabel}>Inline Segments</Text>
          <Text style={styles.stageTitle}>Mixed style runs + glued handle</Text>
          <View style={styles.exampleSurface}>
            <PreparedParagraphView
              contentInsetHorizontal={16}
              contentInsetVertical={16}
              layoutWidth={layoutWidth}
              paragraphHeight={paragraphMetrics?.[0]?.height ?? 0}
              paragraphIndex={0}
              paragraphStyle={BENCHMARK_STYLE}
              prepared={prepared.prepared}
              style={[styles.paragraphSurface, { width: selectedWidth }]}
              textColor="#1f2725"
            />
          </View>
        </View>
      )}
    </ExamplePageShell>
  );
}

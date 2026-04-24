import { StyleSheet, Text, View } from "react-native";
import {
  PreparedParagraphView,
  layoutRichParagraphLines,
} from "../../pretextLegacy";

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
  const richLayout =
    prepared === null
      ? null
      : layoutRichParagraphLines(prepared.prepared.id, layoutWidth)[0];
  const paragraphHeight = richLayout?.height ?? 0;

  return (
    <ExamplePageShell
      description="Inline segments now carry per-run font overrides and caller-supplied box metrics so the native paragraph path can shape text while reserving atomic inline boxes."
      lineCount={richLayout?.lineCount ?? null}
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
          <Text style={styles.stageTitle}>Mixed style runs + atomic box</Text>
          <View style={styles.exampleSurface}>
            <View
              style={[
                styles.paragraphSurface,
                inlineStyles.richSurface,
                {
                  width: selectedWidth,
                  height: paragraphHeight + 32,
                },
              ]}
            >
              <PreparedParagraphView
                contentInsetHorizontal={16}
                contentInsetVertical={16}
                layoutWidth={layoutWidth}
                paragraphHeight={paragraphHeight}
                paragraphIndex={0}
                paragraphStyle={BENCHMARK_STYLE}
                prepared={prepared.prepared}
                style={StyleSheet.absoluteFill}
                textColor="#1f2725"
              />
              {richLayout?.boxFrames.map((frame) => (
                <View
                  key={`${frame.boxId}-${frame.textStart}`}
                  pointerEvents="none"
                  accessibilityHint={frame.accessibilityHint}
                  accessibilityLabel={frame.accessibilityLabel}
                  accessibilityRole="image"
                  style={[
                    inlineStyles.inlineBox,
                    {
                      left: 16 + frame.left,
                      top: 16 + frame.top,
                      width: frame.width,
                      height: frame.height,
                    },
                  ]}
                >
                  <Text style={inlineStyles.inlineBoxText}>OK</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ExamplePageShell>
  );
}

const inlineStyles = StyleSheet.create({
  inlineBox: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#1f5f54",
  },
  inlineBoxText: {
    color: "#fffdf8",
    fontSize: 10,
    fontWeight: "700",
  },
  richSurface: {
    position: "relative",
    overflow: "hidden",
  },
});

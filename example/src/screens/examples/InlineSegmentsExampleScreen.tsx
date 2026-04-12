import { Text, View } from "react-native";
import {
  PreparedParagraphText,
  layoutParagraphsMetadata,
} from "react-native-nitro-pretext";

import { styles } from "../../benchmark/constants";
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
      description="A minimal inline model with breakBehavior lets handles or chips stay glued together without implementing full rich-inline styling."
      lineCount={paragraphMetrics?.[0]?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/inline-segments"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Inline paragraph preparation with non-breakable spans"
      widths={widths}
    >
      {prepared === null ? (
        <PreparingCard />
      ) : (
        <View style={styles.stageCard}>
          <Text style={styles.stageLabel}>Inline Segments</Text>
          <Text style={styles.stageTitle}>
            Non-breakable handle + wrapping body
          </Text>
          <View style={styles.exampleSurface}>
            <PreparedParagraphText
              allowFontScaling={false}
              layoutWidth={layoutWidth}
              paragraphIndex={0}
              prepared={prepared.prepared}
              style={[styles.paragraph, { width: selectedWidth }]}
            />
          </View>
        </View>
      )}
    </ExamplePageShell>
  );
}

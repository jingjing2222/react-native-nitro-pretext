import { Text, View } from "react-native";
import {
  PreparedParagraphText,
  layoutParagraphsMetadata,
} from "../../pretextLegacy";

import { styles } from "../../benchmark/constants";
import {
  EXAMPLE_TEXT,
  ExamplePageShell,
  PreparingCard,
  useExampleWidthSelection,
  usePreparedParagraphExample,
} from "./shared";

export function PreparedTextExampleScreen() {
  const prepared = usePreparedParagraphExample(EXAMPLE_TEXT);
  const { layoutWidth, selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const paragraphMetrics =
    prepared === null
      ? null
      : layoutParagraphsMetadata(prepared.prepared.id, layoutWidth);

  return (
    <ExamplePageShell
      description="This helper is simpler but still backed by prepared paragraph relayout before it hands the broken text to RN <Text>."
      lineCount={paragraphMetrics?.[0]?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/prepared-text"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Prepared state rendered through React Native <Text>"
      widths={widths}
    >
      {prepared === null ? (
        <PreparingCard />
      ) : (
        <View style={styles.stageCard}>
          <Text style={styles.stageLabel}>Renderer</Text>
          <Text style={styles.stageTitle}>PreparedParagraphText</Text>
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

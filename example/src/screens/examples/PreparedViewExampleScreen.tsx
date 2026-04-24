import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  PreparedParagraphView,
  copyPreparedTextSelection,
  layoutParagraphsMetadataWithRequest,
  selectAllPreparedText,
  type PreparedTextRange,
} from "react-native-nitro-pretext";

import { PrimaryButton } from "../../components/BenchmarkComponents";
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
  buildShapedExampleRequest,
  useExampleWidthSelection,
  usePreparedParagraphExample,
} from "./shared";

export function PreparedViewExampleScreen() {
  const prepared = usePreparedParagraphExample(EXAMPLE_TEXT);
  const [selection, setSelection] = useState<PreparedTextRange | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { layoutWidth, selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const layoutRequest = useMemo(
    () => buildShapedExampleRequest(layoutWidth),
    [layoutWidth],
  );
  const paragraphMetrics =
    prepared === null
      ? null
      : layoutParagraphsMetadataWithRequest(
          prepared.prepared.id,
          layoutRequest,
        );
  const paragraphHeight =
    paragraphMetrics?.[0]?.height ?? BENCHMARK_STYLE.lineHeight;
  const selectionLabel =
    selection === null
      ? "No selection"
      : `Selection ${selection.textStart}-${selection.textEnd}`;

  function handleSelectAll() {
    if (prepared === null) {
      return;
    }

    setSelection(selectAllPreparedText(prepared.prepared.id, 0));
    setCopiedText(null);
  }

  function handleCopySelection() {
    if (prepared === null || selection === null) {
      return;
    }

    const copied = copyPreparedTextSelection(prepared.prepared.id, selection);
    setCopiedText(`${copied.length} chars copied`);
  }

  return (
    <ExamplePageShell
      description="The native view now consumes the same request-based layout contract as the engine, including shape slices, so JS still avoids materializing line arrays for rendering."
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
          <Text style={styles.stageTitle}>
            PreparedParagraphView + layoutRequest
          </Text>
          <Text style={styles.stageMeta}>
            Shape-aware relayout happens inside the native surface from the same
            prepared paragraph state.
          </Text>
          <Text style={styles.stageMeta}>{selectionLabel}</Text>
          {copiedText === null ? null : (
            <Text style={styles.stageMeta}>{copiedText}</Text>
          )}
          <View style={styles.metricRow}>
            <PrimaryButton
              disabled={false}
              label="Select all"
              onPress={handleSelectAll}
              testID="examples.prepared-view.select-all"
            />
            <PrimaryButton
              disabled={selection === null}
              label="Copy selection"
              onPress={handleCopySelection}
              testID="examples.prepared-view.copy-selection"
            />
          </View>
          <View style={styles.exampleSurface}>
            <PreparedParagraphView
              accessibilityHint="Tap a line to select it. Long press to select all and copy."
              accessibilityLabel={EXAMPLE_TEXT}
              contentInsetHorizontal={PARAGRAPH_HORIZONTAL_PADDING}
              contentInsetVertical={PARAGRAPH_VERTICAL_PADDING}
              layoutRequest={layoutRequest}
              layoutWidth={layoutWidth}
              onSelectionChange={(nextSelection) => {
                setSelection(nextSelection);
                setCopiedText(null);
              }}
              onSelectionCopy={(text) => {
                setCopiedText(`${text.length} chars copied`);
              }}
              paragraphHeight={paragraphHeight}
              paragraphIndex={0}
              paragraphStyle={BENCHMARK_STYLE}
              prepared={prepared.prepared}
              selectable
              selection={selection}
              style={[styles.paragraphSurface, { width: selectedWidth }]}
            />
          </View>
        </View>
      )}
    </ExamplePageShell>
  );
}

import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { TextLayoutEvent } from "react-native";
import {
  PreparedParagraphView,
  createParagraphLayoutRequest,
  layoutParagraphsMetadataWithRequest,
} from "../../../pretextLegacy";

import { BENCHMARK_STYLE } from "../../../relayoutBenchmark";
import {
  ExamplePageShell,
  useExampleWidthSelection,
  usePreparedParagraphExample,
} from "../shared";
import {
  DYNAMIC_LAYOUT_TEXT,
  KeyStatRow,
  SliteCard,
  SurfaceLabel,
  SurfaceSection,
  sliteStyles,
} from "./shared";

const CANVAS_PADDING = 18;
const OBSTACLE_SIZE = 112;
const OBSTACLE_GAP = 14;
const SHAPED_BANDS = [42, 42, 42];

export function DynamicLayoutSliteScreen() {
  const { selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const prepared = usePreparedParagraphExample(DYNAMIC_LAYOUT_TEXT);
  const [baselineLineCount, setBaselineLineCount] = useState<number | null>(
    null,
  );
  const canvasContentWidth = Math.max(160, selectedWidth - CANVAS_PADDING * 2);
  const narrowWidth = Math.max(
    120,
    canvasContentWidth - OBSTACLE_SIZE - OBSTACLE_GAP,
  );

  const layoutRequest = useMemo(
    () =>
      createParagraphLayoutRequest(canvasContentWidth, {
        shapeSlices: [
          {
            top: 0,
            height: SHAPED_BANDS[0] ?? 42,
            left: 0,
            width: narrowWidth + 18,
          },
          {
            top: SHAPED_BANDS[0] ?? 42,
            height: SHAPED_BANDS[1] ?? 42,
            left: 0,
            width: narrowWidth,
          },
          {
            top: (SHAPED_BANDS[0] ?? 42) + (SHAPED_BANDS[1] ?? 42),
            height: SHAPED_BANDS[2] ?? 42,
            left: 0,
            width: narrowWidth + 14,
          },
          {
            top:
              (SHAPED_BANDS[0] ?? 42) +
              (SHAPED_BANDS[1] ?? 42) +
              (SHAPED_BANDS[2] ?? 42),
            height: 1000,
            left: 0,
            width: canvasContentWidth,
          },
        ],
      }),
    [canvasContentWidth, narrowWidth],
  );

  const preparedMetrics = useMemo(() => {
    if (prepared === null) {
      return null;
    }

    return (
      layoutParagraphsMetadataWithRequest(
        prepared.prepared.id,
        layoutRequest,
      )[0] ?? null
    );
  }, [layoutRequest, prepared]);

  const lineDelta =
    baselineLineCount === null || preparedMetrics === null
      ? null
      : baselineLineCount - preparedMetrics.lineCount;

  return (
    <ExamplePageShell
      description="Inspired by pretext dynamic-layout. The comparison is between a paragraph that must stay narrow for every line and a prepared layout request that narrows only the bands touched by the obstacle."
      lineCount={preparedMetrics?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/slites/dynamic-layout"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Obstacle-aware routing instead of shrinking the whole paragraph"
      widths={widths}
    >
      <SliteCard
        description="The orange block stands in for a logo, image, or callout. Plain Text has no way to reclaim the free width under it. Prepared layout gets a per-band width map and uses the full measure once the obstacle clears."
        eyebrow="What changes"
        title="Use width where it actually exists"
      >
        <View style={{ gap: 8 }}>
          <KeyStatRow
            label="Baseline text width"
            value={`${Math.round(narrowWidth)} px`}
          />
          <KeyStatRow
            label="Prepared max width"
            value={`${Math.round(canvasContentWidth)} px`}
          />
          <KeyStatRow
            label="Lines recovered"
            value={lineDelta === null ? "—" : `${lineDelta.toFixed(0)} lines`}
          />
        </View>
      </SliteCard>

      <SurfaceSection
        description="A plain Text block has to stay narrow for every line to avoid colliding with the obstacle. The lower half keeps wasting width even after the geometry is gone."
        title="Plain React Native Text"
      >
        <SurfaceLabel
          subtitle="The whole paragraph is forced into the obstacle-safe width."
          title="Baseline"
        />
        <View style={sliteStyles.dynamicCanvas}>
          <View style={sliteStyles.dynamicObstacle}>
            <Text style={sliteStyles.dynamicObstacleText}>
              Logo /{"\n"}callout
            </Text>
          </View>
          <Text
            allowFontScaling={false}
            onTextLayout={(event: TextLayoutEvent) =>
              setBaselineLineCount(event.nativeEvent.lines.length)
            }
            style={[
              {
                color: "#221f1c",
                fontSize: BENCHMARK_STYLE.fontSize,
                lineHeight: BENCHMARK_STYLE.lineHeight,
                width: narrowWidth,
              },
            ]}
          >
            {DYNAMIC_LAYOUT_TEXT}
          </Text>
        </View>
      </SurfaceSection>

      <SurfaceSection
        description="The same paragraph state is relaid out with `shapeSlices`. Only the first few bands are narrowed; once the obstacle clears, the paragraph expands back to the full width."
        title="PreparedParagraphView + shapeSlices"
      >
        <SurfaceLabel
          subtitle="Band-aware widths around the same obstacle."
          title="Prepared"
        />
        <View style={sliteStyles.dynamicCanvas}>
          <View style={sliteStyles.dynamicObstacle}>
            <Text style={sliteStyles.dynamicObstacleText}>
              Logo /{"\n"}callout
            </Text>
          </View>
          {prepared !== null && preparedMetrics !== null ? (
            <PreparedParagraphView
              layoutRequest={layoutRequest}
              layoutWidth={canvasContentWidth}
              paragraphHeight={preparedMetrics.height}
              paragraphIndex={0}
              paragraphStyle={BENCHMARK_STYLE}
              prepared={prepared.prepared}
              style={{ width: canvasContentWidth }}
            />
          ) : (
            <Text>Preparing paragraph state…</Text>
          )}
        </View>
      </SurfaceSection>
    </ExamplePageShell>
  );
}

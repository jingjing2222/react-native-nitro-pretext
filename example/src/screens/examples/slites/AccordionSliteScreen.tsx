import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  PreparedParagraphView,
  layoutParagraphsMetadata,
  prepareParagraphsWithStats,
  releaseParagraphs,
  type PreparedParagraphResult,
} from "react-native-nitro-pretext";

import { styles } from "../../../benchmark/constants";
import { ExamplePageShell, useExampleWidthSelection } from "../shared";
import {
  ACCORDION_ITEMS,
  KeyStatRow,
  SliteCard,
  SurfaceLabel,
  SurfaceSection,
  sliteStyles,
} from "./shared";

const ACCORDION_BODY_PADDING = 14;

export function AccordionSliteScreen() {
  const { selectedWidth, setSelectedWidth, widths } = useExampleWidthSelection();
  const [prepared, setPrepared] = useState<PreparedParagraphResult | null>(null);
  const [baselineOpenId, setBaselineOpenId] = useState<string | null>(
    ACCORDION_ITEMS[0]?.id ?? null,
  );
  const [preparedOpenId, setPreparedOpenId] = useState<string | null>(
    ACCORDION_ITEMS[0]?.id ?? null,
  );
  const [baselineMeasuredHeights, setBaselineMeasuredHeights] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const nextPrepared = prepareParagraphsWithStats(
      ACCORDION_ITEMS.map((item) => item.text),
      {
        fontFamily: "System",
        fontSize: 15,
        lineHeight: 23,
        letterSpacing: 0,
        locale: "ko-KR",
      },
    );
    setPrepared(nextPrepared);

    return () => {
      releaseParagraphs(nextPrepared.prepared.id);
    };
  }, []);

  const contentWidth = Math.max(
    120,
    selectedWidth - ACCORDION_BODY_PADDING * 2,
  );
  const preparedMetrics = useMemo(() => {
    if (prepared === null) {
      return [];
    }

    return layoutParagraphsMetadata(prepared.prepared.id, contentWidth);
  }, [contentWidth, prepared]);

  const predictedHeightTotal = preparedMetrics.reduce(
    (total, paragraph) => total + (paragraph?.height ?? 0),
    0,
  );
  const knownBeforeOpenCount = preparedMetrics.filter(
    (paragraph) => paragraph !== undefined,
  ).length;

  return (
    <ExamplePageShell
      description="Inspired by pretext accordion. The prepared path knows every body height before the user opens the section. The plain Text path can only discover the height after that body has rendered and reported layout."
      lineCount={preparedMetrics[0]?.lineCount ?? null}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/slites/accordion"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Predict accordion body height before the section opens"
      widths={widths}
    >
      <SliteCard
        description="The win here is not fancy drawing. It is state you can use before mount: predicted body height, predicted line count, and a stable container size for expansion."
        eyebrow="What changes"
        title="Height is data, not a post-render surprise"
      >
        <View style={{ gap: 8 }}>
          <KeyStatRow
            label="Prepared sections known upfront"
            value={`${knownBeforeOpenCount}/${ACCORDION_ITEMS.length}`}
          />
          <KeyStatRow
            label="Total predicted body height"
            value={`${Math.round(predictedHeightTotal)} px`}
          />
          <KeyStatRow
            label="Baseline known before open"
            value={`${Object.keys(baselineMeasuredHeights).length}/${ACCORDION_ITEMS.length}`}
          />
        </View>
      </SliteCard>

      <SurfaceSection
        description="Regular Text works once the section is open, but the body height is unknown until the open content mounts and sends an onLayout event."
        title="Plain React Native Text"
      >
        <SurfaceLabel
          subtitle="Measured heights appear only after a panel has rendered."
          title="Baseline"
        />
        <View style={sliteStyles.twoUpStack}>
          {ACCORDION_ITEMS.map((item) => {
            const isOpen = baselineOpenId === item.id;
            const measuredHeight = baselineMeasuredHeights[item.id] ?? null;

            return (
              <View key={`baseline-accordion-${item.id}`} style={styles.summaryCard}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setBaselineOpenId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  style={sliteStyles.accordionToggle}
                >
                  <Text style={styles.summaryLabel}>{item.title}</Text>
                  <Text style={styles.summaryDescription}>
                    {measuredHeight === null
                      ? "Height unknown until this panel renders."
                      : `Observed after render: ${Math.round(measuredHeight)} px`}
                  </Text>
                </Pressable>

                <View style={sliteStyles.accordionBody}>
                  {isOpen ? (
                    <Text
                      allowFontScaling={false}
                      onLayout={(event) => {
                        const height = event.nativeEvent.layout.height;
                        setBaselineMeasuredHeights((current) => ({
                          ...current,
                          [item.id]: height,
                        }));
                      }}
                      style={sliteStyles.accordionCopy}
                    >
                      {item.text}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </SurfaceSection>

      <SurfaceSection
        description="Prepared metadata is available before interaction. Each section already knows its body height, so expansion can use a stable target height instead of waiting for an after-the-fact measure pass."
        title="PreparedParagraphView + metadata"
      >
        <SurfaceLabel
          subtitle="Predicted heights exist even while the section is still closed."
          title="Prepared"
        />
        <View style={sliteStyles.twoUpStack}>
          {ACCORDION_ITEMS.map((item, index) => {
            const isOpen = preparedOpenId === item.id;
            const metrics = preparedMetrics[index];

            return (
              <View key={`prepared-accordion-${item.id}`} style={styles.summaryCard}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setPreparedOpenId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  style={sliteStyles.accordionToggle}
                >
                  <Text style={styles.summaryLabel}>{item.title}</Text>
                  <Text style={styles.summaryDescription}>
                    {metrics === undefined
                      ? "Preparing paragraph state…"
                      : `Predicted before open: ${Math.round(metrics.height)} px · ${Math.round(metrics.lineCount)} lines`}
                  </Text>
                </Pressable>

                <View style={sliteStyles.accordionBody}>
                  {isOpen && prepared !== null && metrics !== undefined ? (
                    <PreparedParagraphView
                      layoutWidth={contentWidth}
                      paragraphHeight={metrics.height}
                      paragraphIndex={index}
                      paragraphStyle={{
                        fontFamily: "System",
                        fontSize: 15,
                        lineHeight: 23,
                        letterSpacing: 0,
                        locale: "ko-KR",
                      }}
                      prepared={prepared.prepared}
                      style={{ width: contentWidth }}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </SurfaceSection>
    </ExamplePageShell>
  );
}

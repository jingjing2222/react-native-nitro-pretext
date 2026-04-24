import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import {
  PreparedParagraphView,
  layoutParagraphsMetadata,
  prepareParagraphsWithStats,
  releaseParagraphs,
  type LaidOutParagraphMetrics,
  type ParagraphStyle,
  type PreparedParagraphResult,
} from "react-native-nitro-pretext";

import {
  formatMilliseconds,
  styles as sharedStyles,
} from "../../benchmark/constants";
import {
  MetricPill,
  PrimaryButton,
  SummaryMetric,
} from "../../components/BenchmarkComponents";
import { median, now, percentile } from "../../relayoutBenchmark";
import { ExamplePageShell, useExampleWidthSelection } from "./shared";
import {
  KeyStatRow,
  SliteCard,
  SurfaceLabel,
  SurfaceSection,
} from "./slites/shared";

type LayoutCard = {
  id: string;
  kicker: string;
  title: string;
  tone: "blue" | "green" | "orange" | "rose";
  text: string;
};

type MeasuredTextBox = {
  height: number;
  layoutKey: string;
  width: number;
};

type PositionedCard = LayoutCard & {
  cardHeight: number;
  cardWidth: number;
  columnIndex: number;
  paragraphHeight: number;
  paragraphIndex: number;
  textWidth: number;
  x: number;
  y: number;
};

type MasonryLayout = {
  boardHeight: number;
  cards: PositionedCard[];
};

const MEASURED_LAYOUT_STYLE: ParagraphStyle = {
  fontFamily: "System",
  fontSize: 15,
  lineHeight: 22,
  letterSpacing: 0,
  locale: "ko-KR",
  includeFontPadding: true,
  textDirection: "auto",
};

const MEASURED_LAYOUT_CARDS: LayoutCard[] = [
  {
    id: "incident",
    kicker: "Ops",
    title: "Queue drain summary",
    tone: "orange",
    text: "장애 회고 카드가 두 컬럼 masonry 안에서 움직인다. fallback font, emoji 🚧, includeFontPadding까지 들어가면 실제 높이는 fontSize로 절대 맞출 수 없다.",
  },
  {
    id: "launch",
    kicker: "Launch",
    title: "Localized release note",
    tone: "green",
    text: "The launch note mixes Korean, English, and an inline status phrase so the board has to know the final paragraph height before it can place the next card.",
  },
  {
    id: "memo",
    kicker: "Research",
    title: "Complex script memo",
    tone: "blue",
    text: "क्‍षि, العربية, שלום, and a family emoji 👨‍👩‍👧‍👦 all affect shaping. The layout needs native text metrics, not a guessed line count.",
  },
  {
    id: "support",
    kicker: "Support",
    title: "Customer-visible answer",
    tone: "rose",
    text: "A support answer can be short in one locale and three lines longer in another. The card rail cannot finalize positions until text height is known.",
  },
  {
    id: "design",
    kicker: "Design",
    title: "Pinned thumbnail card",
    tone: "blue",
    text: "Editorial cards often include fixed chrome around variable copy. The text box is the unknown part that determines every absolute y position after it.",
  },
  {
    id: "finance",
    kicker: "Finance",
    title: "Dense approval copy",
    tone: "green",
    text: "Prepared metadata lets the UI calculate the board before mounting the visible text renderer. Plain Text has to mount a measurement copy first.",
  },
  {
    id: "timeline",
    kicker: "Timeline",
    title: "Long activity item",
    tone: "orange",
    text: "When the user drags the panel width, every card needs a new width and height. In the baseline path that means another hidden Text pass and another round of onLayout callbacks.",
  },
  {
    id: "legal",
    kicker: "Legal",
    title: "CJK and emoji clause",
    tone: "rose",
    text: "문장 중간의 🇰🇷 플래그와 CJK 줄바꿈은 플랫폼 엔진이 결정한다. 이 화면은 그 높이를 먼저 알아야 하는 실제 배치 문제를 보여준다.",
  },
  {
    id: "analytics",
    kicker: "Data",
    title: "Chart annotation",
    tone: "blue",
    text: "A dashboard annotation sits beside charts and summary chips. The chart area can only reserve the right space once the annotation block is measured.",
  },
  {
    id: "handoff",
    kicker: "Handoff",
    title: "Reviewer context",
    tone: "green",
    text: "The same prepared paragraph state is reused across widths. Only layout metadata is recalculated, so the visible renderer can be placed without an extra React Native Text probe.",
  },
];

const CARD_GAP = 12;
const CARD_PADDING = 12;
const CARD_KICKER_HEIGHT = 16;
const CARD_TITLE_HEIGHT = 40;
const CARD_FOOTER_HEIGHT = 22;
const CARD_CHROME_HEIGHT =
  CARD_PADDING * 2 +
  CARD_KICKER_HEIGHT +
  4 +
  CARD_TITLE_HEIGHT +
  10 +
  10 +
  CARD_FOOTER_HEIGHT;
const SAMPLE_LIMIT = 20;

function resolveColumnCount(boardWidth: number): number {
  return boardWidth >= 320 ? 2 : 1;
}

function buildMasonryLayout(args: {
  boardWidth: number;
  columnCount: number;
  getParagraphHeight: (index: number) => number;
}): MasonryLayout {
  const cardWidth =
    (args.boardWidth - CARD_GAP * Math.max(0, args.columnCount - 1)) /
    args.columnCount;
  const textWidth = Math.max(1, cardWidth - CARD_PADDING * 2);
  const columnHeights = Array.from({ length: args.columnCount }, () => 0);
  const cards = MEASURED_LAYOUT_CARDS.map((card, index) => {
    const paragraphHeight = args.getParagraphHeight(index);
    const cardHeight = CARD_CHROME_HEIGHT + paragraphHeight;
    let columnIndex = 0;

    for (let nextColumn = 1; nextColumn < columnHeights.length; nextColumn++) {
      if (
        (columnHeights[nextColumn] ?? 0) < (columnHeights[columnIndex] ?? 0)
      ) {
        columnIndex = nextColumn;
      }
    }

    const x = columnIndex * (cardWidth + CARD_GAP);
    const y = columnHeights[columnIndex] ?? 0;
    columnHeights[columnIndex] = y + cardHeight + CARD_GAP;

    return {
      ...card,
      cardHeight,
      cardWidth,
      columnIndex,
      paragraphHeight,
      paragraphIndex: index,
      textWidth,
      x,
      y,
    };
  });
  const boardHeight = Math.max(
    1,
    ...columnHeights.map((height) => Math.max(0, height - CARD_GAP)),
  );

  return { boardHeight, cards };
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatPixel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value)} px`;
}

function pushSample(current: number[], next: number): number[] {
  return [...current.slice(-(SAMPLE_LIMIT - 1)), next];
}

export function MeasuredLayoutComparisonScreen() {
  const { selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const [runIndex, setRunIndex] = useState(0);
  const [prepared, setPrepared] = useState<PreparedParagraphResult | null>(
    null,
  );
  const [baselineMeasurements, setBaselineMeasurements] = useState<
    Record<string, MeasuredTextBox>
  >({});
  const [baselineElapsedMs, setBaselineElapsedMs] = useState<number | null>(
    null,
  );
  const [baselineSamples, setBaselineSamples] = useState<number[]>([]);
  const [preparedSamples, setPreparedSamples] = useState<number[]>([]);
  const baselineStartedAtRef = useRef(now());

  const boardWidth = selectedWidth;
  const columnCount = resolveColumnCount(boardWidth);
  const cardWidth =
    (boardWidth - CARD_GAP * Math.max(0, columnCount - 1)) / columnCount;
  const textWidth = Math.max(1, cardWidth - CARD_PADDING * 2);
  const layoutKey = `${Math.round(textWidth)}:${runIndex}`;

  useEffect(() => {
    const nextPrepared = prepareParagraphsWithStats(
      MEASURED_LAYOUT_CARDS.map((card) => card.text),
      MEASURED_LAYOUT_STYLE,
    );
    setPrepared(nextPrepared);

    return () => {
      releaseParagraphs(nextPrepared.prepared.id);
    };
  }, []);

  useLayoutEffect(() => {
    baselineStartedAtRef.current = now();
    setBaselineMeasurements({});
    setBaselineElapsedMs(null);
  }, [layoutKey]);

  const handleMeasuredTextLayout = useCallback(
    (cardId: string, event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout;

      setBaselineMeasurements((current) => {
        const previous = current[cardId];
        if (
          previous?.layoutKey === layoutKey &&
          Math.abs(previous.height - height) < 0.5 &&
          Math.abs(previous.width - width) < 0.5
        ) {
          return current;
        }

        return {
          ...current,
          [cardId]: {
            height,
            layoutKey,
            width,
          },
        };
      });
    },
    [layoutKey],
  );

  const baselineMeasuredCount = useMemo(
    () =>
      MEASURED_LAYOUT_CARDS.filter(
        (card) => baselineMeasurements[card.id]?.layoutKey === layoutKey,
      ).length,
    [baselineMeasurements, layoutKey],
  );
  const baselineReady = baselineMeasuredCount === MEASURED_LAYOUT_CARDS.length;
  const baselineLayout = useMemo(() => {
    if (!baselineReady) {
      return null;
    }

    return buildMasonryLayout({
      boardWidth,
      columnCount,
      getParagraphHeight: (index) => {
        const card = MEASURED_LAYOUT_CARDS[index];
        if (card === undefined) {
          return MEASURED_LAYOUT_STYLE.lineHeight;
        }

        return (
          baselineMeasurements[card.id]?.height ??
          MEASURED_LAYOUT_STYLE.lineHeight
        );
      },
    });
  }, [baselineMeasurements, baselineReady, boardWidth, columnCount]);

  const handleBaselineVisibleLayout = useCallback(() => {
    if (!baselineReady || baselineElapsedMs !== null) {
      return;
    }

    const elapsedMs = now() - baselineStartedAtRef.current;
    setBaselineElapsedMs(elapsedMs);
    setBaselineSamples((current) => pushSample(current, elapsedMs));
  }, [baselineElapsedMs, baselineReady]);

  const preparedLayout = useMemo(() => {
    if (prepared === null) {
      return null;
    }

    const startedAt = now();
    const metrics = layoutParagraphsMetadata(prepared.prepared.id, textWidth);
    const layout = buildMasonryLayout({
      boardWidth,
      columnCount,
      getParagraphHeight: (index) =>
        metrics[index]?.height ?? MEASURED_LAYOUT_STYLE.lineHeight,
    });

    return {
      elapsedMs: now() - startedAt,
      layout,
      metrics,
      runKey: layoutKey,
    };
  }, [boardWidth, columnCount, layoutKey, prepared, textWidth]);

  useEffect(() => {
    if (preparedLayout === null) {
      return;
    }

    setPreparedSamples((current) =>
      pushSample(current, preparedLayout.elapsedMs),
    );
  }, [preparedLayout]);

  const baselineMedianMs = median(baselineSamples);
  const preparedMedianMs = median(preparedSamples);
  const currentDeltaMs =
    baselineElapsedMs === null || preparedLayout === null
      ? null
      : baselineElapsedMs - preparedLayout.elapsedMs;
  const currentImprovement =
    currentDeltaMs === null ||
    baselineElapsedMs === null ||
    baselineElapsedMs <= 0
      ? null
      : (currentDeltaMs / baselineElapsedMs) * 100;
  const medianImprovement =
    baselineMedianMs === null ||
    preparedMedianMs === null ||
    baselineMedianMs <= 0
      ? null
      : ((baselineMedianMs - preparedMedianMs) / baselineMedianMs) * 100;
  const baselineFirstMeasurement =
    MEASURED_LAYOUT_CARDS.map((card) => baselineMeasurements[card.id]).find(
      (measurement) => measurement?.layoutKey === layoutKey,
    ) ?? null;
  const totalPreparedLines =
    preparedLayout?.metrics.reduce(
      (total, metric) => total + metric.lineCount,
      0,
    ) ?? null;

  function handleReplay() {
    setRunIndex((current) => current + 1);
  }

  function handleNextWidth() {
    const currentIndex = widths.indexOf(selectedWidth);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % widths.length;
    const nextWidth = widths[nextIndex] ?? selectedWidth;

    setRunIndex((current) => current + 1);
    setSelectedWidth(nextWidth);
  }

  return (
    <ExamplePageShell
      description="This page models a layout that cannot place visible cards until each text block reports width and height. The baseline uses a hidden onLayout measurement pass, then renders the board. The prepared path asks native text layout for metrics first and renders the board directly."
      lineCount={totalPreparedLines}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/measured-layout"
      selectedWidth={selectedWidth}
      setSelectedWidth={(width) => {
        setRunIndex((current) => current + 1);
        setSelectedWidth(width);
      }}
      title="MeasureLayout-style two-pass UI versus prepared paragraph layout"
      widths={widths}
    >
      <SliteCard
        description="The board uses absolute masonry positions. That means a single unknown text height blocks every card placed after it. Plain React Native Text discovers that height through onLayout; prepared paragraph metadata returns it before visible render."
        eyebrow="Why this matters"
        title="Height and width are layout inputs, not afterthoughts"
      >
        <View style={localStyles.actionRow}>
          <PrimaryButton
            disabled={false}
            label="Replay measurement"
            onPress={handleReplay}
            testID="examples.measured-layout.replay"
          />
          <PrimaryButton
            disabled={false}
            label="Next width"
            onPress={handleNextWidth}
            testID="examples.measured-layout.next-width"
          />
        </View>
        <View style={localStyles.statGrid}>
          <KeyStatRow
            label="Baseline current"
            value={formatMilliseconds(baselineElapsedMs)}
          />
          <KeyStatRow
            label="Prepared current"
            value={formatMilliseconds(preparedLayout?.elapsedMs ?? null)}
          />
          <KeyStatRow
            label="Current improvement"
            value={formatPercent(currentImprovement)}
          />
          <KeyStatRow
            label="Median improvement"
            value={formatPercent(medianImprovement)}
          />
        </View>
      </SliteCard>

      <View style={sharedStyles.heroCard}>
        <Text style={sharedStyles.eyebrow}>Visual timing</Text>
        <Text style={sharedStyles.subtitle}>
          Baseline waits for hidden Text nodes to report onLayout before the
          board can be positioned. Prepared layout produces card positions from
          native metrics in the same interaction.
        </Text>
        <View style={sharedStyles.metricRow}>
          <MetricPill
            label="Text boxes"
            value={`${MEASURED_LAYOUT_CARDS.length}`}
          />
          <MetricPill label="Columns" value={`${columnCount}`} />
          <MetricPill label="Text width" value={formatPixel(textWidth)} />
        </View>
        <TimingBars
          baselineMs={baselineElapsedMs}
          preparedMs={preparedLayout?.elapsedMs ?? null}
        />
      </View>

      <SurfaceSection
        description="The measurement layer renders the same text invisibly, waits for every onLayout callback, stores width and height, then renders the visible masonry board from those measurements."
        title="Baseline: hidden Text measurement pass"
      >
        <SurfaceLabel
          subtitle="The board is blocked until the measurement layer finishes."
          title="React Native Text + onLayout"
        />
        <View style={sharedStyles.summaryMetricList}>
          <SummaryMetric
            label="onLayout callbacks"
            value={`${baselineMeasuredCount}/${MEASURED_LAYOUT_CARDS.length}`}
          />
          <SummaryMetric
            label="Measured text box"
            value={
              baselineFirstMeasurement === null
                ? "—"
                : `${formatPixel(baselineFirstMeasurement.width)} x ${formatPixel(
                    baselineFirstMeasurement.height,
                  )}`
            }
          />
          <SummaryMetric
            label="Median usable layout"
            value={formatMilliseconds(baselineMedianMs)}
          />
          <SummaryMetric
            label="p95 usable layout"
            value={formatMilliseconds(percentile(baselineSamples, 0.95))}
          />
        </View>
        <BaselineMasonryBoard
          boardWidth={boardWidth}
          layout={baselineLayout}
          layoutKey={layoutKey}
          measuredCount={baselineMeasuredCount}
          onBaselineVisibleLayout={handleBaselineVisibleLayout}
          onMeasuredTextLayout={handleMeasuredTextLayout}
          textWidth={textWidth}
        />
      </SurfaceSection>

      <SurfaceSection
        description="The prepared path calculates paragraph metrics from Android MeasuredText/LineBreaker or iOS Core Text before mounting the visible renderer, so the same board can be positioned immediately."
        title="Prepared: native metrics before visible render"
      >
        <SurfaceLabel
          subtitle="Card positions are produced directly from prepared paragraph metadata."
          title="PreparedParagraphView + layoutParagraphsMetadata"
        />
        <View style={sharedStyles.summaryMetricList}>
          <SummaryMetric
            label="Metadata hot path"
            value={formatMilliseconds(preparedLayout?.elapsedMs ?? null)}
          />
          <SummaryMetric
            label="Median hot path"
            value={formatMilliseconds(preparedMedianMs)}
          />
          <SummaryMetric
            label="p95 hot path"
            value={formatMilliseconds(percentile(preparedSamples, 0.95))}
          />
          <SummaryMetric
            label="Delta vs baseline"
            value={formatMilliseconds(currentDeltaMs)}
          />
        </View>
        {prepared === null || preparedLayout === null ? (
          <View style={localStyles.placeholder}>
            <Text style={sharedStyles.summaryDescription}>
              Preparing paragraph state...
            </Text>
          </View>
        ) : (
          <PreparedMasonryBoard
            boardWidth={boardWidth}
            layout={preparedLayout.layout}
            metrics={preparedLayout.metrics}
            prepared={prepared}
          />
        )}
      </SurfaceSection>
    </ExamplePageShell>
  );
}

function TimingBars({
  baselineMs,
  preparedMs,
}: {
  baselineMs: number | null;
  preparedMs: number | null;
}) {
  const maxMs = Math.max(baselineMs ?? 0, preparedMs ?? 0, 1);

  return (
    <View style={localStyles.timingStack}>
      <TimingBar
        label="Baseline"
        tone="baseline"
        valueMs={baselineMs}
        widthPercent={((baselineMs ?? 0) / maxMs) * 100}
      />
      <TimingBar
        label="Prepared"
        tone="prepared"
        valueMs={preparedMs}
        widthPercent={((preparedMs ?? 0) / maxMs) * 100}
      />
    </View>
  );
}

function TimingBar({
  label,
  tone,
  valueMs,
  widthPercent,
}: {
  label: string;
  tone: "baseline" | "prepared";
  valueMs: number | null;
  widthPercent: number;
}) {
  const resolvedWidth = `${Math.max(4, Math.min(100, widthPercent)).toFixed(
    1,
  )}%`;

  return (
    <View style={localStyles.timingRow}>
      <Text style={localStyles.timingLabel}>{label}</Text>
      <View style={localStyles.timingTrack}>
        <View
          style={[
            localStyles.timingFill,
            tone === "baseline"
              ? localStyles.timingFillBaseline
              : localStyles.timingFillPrepared,
            { width: resolvedWidth },
          ]}
        />
      </View>
      <Text style={localStyles.timingValue}>{formatMilliseconds(valueMs)}</Text>
    </View>
  );
}

function BaselineMasonryBoard({
  boardWidth,
  layout,
  layoutKey,
  measuredCount,
  onBaselineVisibleLayout,
  onMeasuredTextLayout,
  textWidth,
}: {
  boardWidth: number;
  layout: MasonryLayout | null;
  layoutKey: string;
  measuredCount: number;
  onBaselineVisibleLayout: () => void;
  onMeasuredTextLayout: (cardId: string, event: LayoutChangeEvent) => void;
  textWidth: number;
}) {
  return (
    <View
      style={[
        localStyles.board,
        {
          height: layout?.boardHeight ?? 280,
          width: boardWidth,
        },
      ]}
    >
      {layout === null ? (
        <View style={localStyles.measureWaiting}>
          <Text style={localStyles.measureWaitingTitle}>
            Measuring hidden Text nodes
          </Text>
          <Text style={localStyles.measureWaitingText}>
            {measuredCount}/{MEASURED_LAYOUT_CARDS.length} boxes reported
            onLayout. The visible masonry board renders after this pass.
          </Text>
        </View>
      ) : (
        layout.cards.map((card, index) => (
          <BaselineCard
            key={`baseline-card-${card.id}`}
            card={card}
            onLayout={index === 0 ? onBaselineVisibleLayout : undefined}
          />
        ))
      )}
      {layout === null ? (
        <View
          key={`measure-layer-${layoutKey}`}
          pointerEvents="none"
          style={localStyles.measureLayer}
        >
          {MEASURED_LAYOUT_CARDS.map((card) => (
            <Text
              key={`measure-${layoutKey}-${card.id}`}
              allowFontScaling={false}
              onLayout={(event) => onMeasuredTextLayout(card.id, event)}
              style={[localStyles.bodyCopy, { width: textWidth }]}
            >
              {card.text}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PreparedMasonryBoard({
  boardWidth,
  layout,
  metrics,
  prepared,
}: {
  boardWidth: number;
  layout: MasonryLayout;
  metrics: LaidOutParagraphMetrics[];
  prepared: PreparedParagraphResult;
}) {
  return (
    <View
      style={[
        localStyles.board,
        {
          height: layout.boardHeight,
          width: boardWidth,
        },
      ]}
    >
      {layout.cards.map((card) => (
        <PreparedCard
          key={`prepared-card-${card.id}`}
          card={card}
          lineCount={metrics[card.paragraphIndex]?.lineCount ?? null}
          prepared={prepared}
        />
      ))}
    </View>
  );
}

function BaselineCard({
  card,
  onLayout,
}: {
  card: PositionedCard;
  onLayout?: () => void;
}) {
  return (
    <View
      onLayout={onLayout}
      style={[
        localStyles.layoutCard,
        getToneCardStyle(card.tone),
        {
          height: card.cardHeight,
          left: card.x,
          top: card.y,
          width: card.cardWidth,
        },
      ]}
    >
      <CardChrome card={card} label={`Column ${card.columnIndex + 1}`} />
      <Text
        allowFontScaling={false}
        style={[localStyles.bodyCopy, { width: card.textWidth }]}
      >
        {card.text}
      </Text>
      <CardFooter label="Visible after measure" />
    </View>
  );
}

function PreparedCard({
  card,
  lineCount,
  prepared,
}: {
  card: PositionedCard;
  lineCount: number | null;
  prepared: PreparedParagraphResult;
}) {
  return (
    <View
      style={[
        localStyles.layoutCard,
        getToneCardStyle(card.tone),
        {
          height: card.cardHeight,
          left: card.x,
          top: card.y,
          width: card.cardWidth,
        },
      ]}
    >
      <CardChrome
        card={card}
        label={lineCount === null ? "Native metrics" : `${lineCount} lines`}
      />
      <PreparedParagraphView
        layoutWidth={card.textWidth}
        paragraphHeight={card.paragraphHeight}
        paragraphIndex={card.paragraphIndex}
        paragraphStyle={MEASURED_LAYOUT_STYLE}
        prepared={prepared.prepared}
        style={{ width: card.textWidth }}
      />
      <CardFooter label="Positioned before render" />
    </View>
  );
}

function CardChrome({ card, label }: { card: PositionedCard; label: string }) {
  return (
    <>
      <View style={localStyles.cardHeaderRow}>
        <Text style={localStyles.cardKicker}>{card.kicker}</Text>
        <View style={localStyles.cardChip}>
          <Text style={localStyles.cardChipText}>{label}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={localStyles.cardTitle}>
        {card.title}
      </Text>
    </>
  );
}

function CardFooter({ label }: { label: string }) {
  return (
    <View style={localStyles.cardFooter}>
      <View style={localStyles.footerDot} />
      <Text style={localStyles.cardFooterText}>{label}</Text>
    </View>
  );
}

function getToneCardStyle(tone: LayoutCard["tone"]) {
  switch (tone) {
    case "blue":
      return localStyles.blueCard;
    case "green":
      return localStyles.greenCard;
    case "orange":
      return localStyles.orangeCard;
    case "rose":
      return localStyles.roseCard;
  }
}

const localStyles = StyleSheet.create({
  actionRow: {
    gap: 10,
  },
  blueCard: {
    backgroundColor: "#e6f0f7",
    borderColor: "#b9d3e5",
  },
  board: {
    alignSelf: "center",
    backgroundColor: "#fffaf1",
    borderColor: "#e6ddcd",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  bodyCopy: {
    color: "#221f1c",
    fontSize: MEASURED_LAYOUT_STYLE.fontSize,
    lineHeight: MEASURED_LAYOUT_STYLE.lineHeight,
  },
  cardChip: {
    backgroundColor: "rgba(31, 39, 37, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cardChipText: {
    color: "#3d4642",
    fontSize: 9,
    fontWeight: "800",
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    height: CARD_FOOTER_HEIGHT,
    marginTop: 10,
  },
  cardFooterText: {
    color: "#607069",
    fontSize: 10,
    fontWeight: "700",
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    height: CARD_KICKER_HEIGHT,
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardKicker: {
    color: "#4d5a55",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  cardTitle: {
    color: "#19211f",
    fontSize: 15,
    fontWeight: "900",
    height: CARD_TITLE_HEIGHT,
    lineHeight: 19,
    marginBottom: 10,
  },
  footerDot: {
    backgroundColor: "#d66c3d",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  greenCard: {
    backgroundColor: "#e4f3e9",
    borderColor: "#b9dbc5",
  },
  layoutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: CARD_PADDING,
    position: "absolute",
  },
  measureLayer: {
    gap: 10,
    left: 0,
    opacity: 0,
    position: "absolute",
    top: 0,
  },
  measureWaiting: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    minHeight: 280,
    padding: 20,
  },
  measureWaitingText: {
    color: "#6e6454",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  measureWaitingTitle: {
    color: "#1f2725",
    fontSize: 16,
    fontWeight: "900",
  },
  orangeCard: {
    backgroundColor: "#f6e8d9",
    borderColor: "#e7c3a0",
  },
  placeholder: {
    alignItems: "center",
    borderColor: "#e6ddcd",
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 240,
    justifyContent: "center",
    padding: 20,
  },
  roseCard: {
    backgroundColor: "#f6e5e7",
    borderColor: "#e5bdc2",
  },
  statGrid: {
    gap: 8,
  },
  timingFill: {
    borderRadius: 999,
    height: 12,
  },
  timingFillBaseline: {
    backgroundColor: "#d66c3d",
  },
  timingFillPrepared: {
    backgroundColor: "#63b38f",
  },
  timingLabel: {
    color: "#f7f2e9",
    fontSize: 12,
    fontWeight: "800",
    width: 72,
  },
  timingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  timingStack: {
    gap: 10,
  },
  timingTrack: {
    backgroundColor: "#314441",
    borderRadius: 999,
    flex: 1,
    height: 12,
    overflow: "hidden",
  },
  timingValue: {
    color: "#f7f2e9",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    width: 72,
  },
});

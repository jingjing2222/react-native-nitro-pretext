import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LayoutChangeEvent, TextStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import {
  layout,
  prepare,
  type PretextPrepared,
  type PretextStyle,
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
import { ExamplePageShell, useExampleWidthSelection } from "../examples/shared";
import {
  KeyStatRow,
  SliteCard,
  SurfaceLabel,
  SurfaceSection,
} from "../examples/slites/shared";

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

const MEASURED_LAYOUT_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 15,
  lineHeight: 22,
  letterSpacing: 0,
  locale: "ko-KR",
  includeFontPadding: true,
  textDirection: "auto",
};

const MEASURED_LAYOUT_FALLBACK_LINE_HEIGHT =
  MEASURED_LAYOUT_STYLE.lineHeight ?? MEASURED_LAYOUT_STYLE.fontSize;

const TEXT_RENDER_STYLE: TextStyle = {
  color: "#221f1c",
  fontFamily: MEASURED_LAYOUT_STYLE.fontFamily,
  fontSize: MEASURED_LAYOUT_STYLE.fontSize,
  includeFontPadding: MEASURED_LAYOUT_STYLE.includeFontPadding,
  letterSpacing: MEASURED_LAYOUT_STYLE.letterSpacing,
  lineHeight: MEASURED_LAYOUT_FALLBACK_LINE_HEIGHT,
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
    text: "Pretext metadata lets the UI calculate the board before mounting the visible text renderer. Plain Text has to mount a measurement copy first.",
  },
  {
    id: "timeline",
    kicker: "Timeline",
    title: "Long activity item",
    tone: "orange",
    text: "When the user drags the panel width, every card needs a new width and height. In the onLayout path that means another hidden Text pass and another round of callbacks.",
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
    text: "The same prepared text is reused across widths. Only layout metadata is recalculated, so the visible renderer can be placed without an extra React Native Text probe.",
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
    return "-";
  }

  return `${value.toFixed(1)}%`;
}

function formatPixel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)} px`;
}

function pushSample(current: number[], next: number): number[] {
  return [...current.slice(-(SAMPLE_LIMIT - 1)), next];
}

export function BenchmarkMeasuredLayoutCaseStudyScreen() {
  const { selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const [runIndex, setRunIndex] = useState(0);
  const [pretextPrepared, setPretextPrepared] =
    useState<PretextPrepared | null>(null);
  const [onLayoutMeasurements, setOnLayoutMeasurements] = useState<
    Record<string, MeasuredTextBox>
  >({});
  const [onLayoutPathMs, setOnLayoutPathMs] = useState<number | null>(null);
  const [onLayoutSamples, setOnLayoutSamples] = useState<number[]>([]);
  const [pretextSamples, setPretextSamples] = useState<number[]>([]);
  const onLayoutStartedAtRef = useRef(now());

  const boardWidth = selectedWidth;
  const columnCount = resolveColumnCount(boardWidth);
  const cardWidth =
    (boardWidth - CARD_GAP * Math.max(0, columnCount - 1)) / columnCount;
  const textWidth = Math.max(1, cardWidth - CARD_PADDING * 2);
  const layoutKey = `${Math.round(textWidth)}:${runIndex}`;

  useEffect(() => {
    const nextPrepared = prepare(
      MEASURED_LAYOUT_CARDS.map((card) => card.text),
      MEASURED_LAYOUT_STYLE,
    );
    setPretextPrepared(nextPrepared);

    return () => {
      nextPrepared.release();
    };
  }, []);

  useLayoutEffect(() => {
    onLayoutStartedAtRef.current = now();
    setOnLayoutMeasurements({});
    setOnLayoutPathMs(null);
  }, [layoutKey]);

  const handleMeasuredTextLayout = useCallback(
    (cardId: string, event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout;

      setOnLayoutMeasurements((current) => {
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

  const onLayoutMeasuredCount = useMemo(
    () =>
      MEASURED_LAYOUT_CARDS.filter(
        (card) => onLayoutMeasurements[card.id]?.layoutKey === layoutKey,
      ).length,
    [onLayoutMeasurements, layoutKey],
  );
  const onLayoutReady = onLayoutMeasuredCount === MEASURED_LAYOUT_CARDS.length;
  const onLayoutMasonry = useMemo(() => {
    if (!onLayoutReady) {
      return null;
    }

    return buildMasonryLayout({
      boardWidth,
      columnCount,
      getParagraphHeight: (index) => {
        const card = MEASURED_LAYOUT_CARDS[index];
        if (card === undefined) {
          return MEASURED_LAYOUT_FALLBACK_LINE_HEIGHT;
        }

        return (
          onLayoutMeasurements[card.id]?.height ??
          MEASURED_LAYOUT_FALLBACK_LINE_HEIGHT
        );
      },
    });
  }, [boardWidth, columnCount, onLayoutMeasurements, onLayoutReady]);

  const handleOnLayoutBoardVisible = useCallback(() => {
    if (!onLayoutReady || onLayoutPathMs !== null) {
      return;
    }

    const elapsedMs = now() - onLayoutStartedAtRef.current;
    setOnLayoutPathMs(elapsedMs);
    setOnLayoutSamples((current) => pushSample(current, elapsedMs));
  }, [onLayoutPathMs, onLayoutReady]);

  const pretextMasonry = useMemo(() => {
    if (pretextPrepared === null) {
      return null;
    }

    const startedAt = now();
    const metricsLayout = layout(pretextPrepared, {
      output: "metrics",
      width: textWidth,
    });
    const metrics =
      metricsLayout.output === "metrics" ? metricsLayout.paragraphs : [];
    const masonry = buildMasonryLayout({
      boardWidth,
      columnCount,
      getParagraphHeight: (index) =>
        metrics[index]?.height ?? MEASURED_LAYOUT_FALLBACK_LINE_HEIGHT,
    });

    return {
      elapsedMs: now() - startedAt,
      layout: masonry,
      metrics,
      runKey: layoutKey,
    };
  }, [boardWidth, columnCount, layoutKey, pretextPrepared, textWidth]);

  useEffect(() => {
    if (pretextMasonry === null) {
      return;
    }

    setPretextSamples((current) =>
      pushSample(current, pretextMasonry.elapsedMs),
    );
  }, [pretextMasonry]);

  const onLayoutMedianMs = median(onLayoutSamples);
  const pretextMedianMs = median(pretextSamples);
  const currentDeltaMs =
    onLayoutPathMs === null || pretextMasonry === null
      ? null
      : onLayoutPathMs - pretextMasonry.elapsedMs;
  const currentImprovement =
    currentDeltaMs === null || onLayoutPathMs === null || onLayoutPathMs <= 0
      ? null
      : (currentDeltaMs / onLayoutPathMs) * 100;
  const medianImprovement =
    onLayoutMedianMs === null ||
    pretextMedianMs === null ||
    onLayoutMedianMs <= 0
      ? null
      : ((onLayoutMedianMs - pretextMedianMs) / onLayoutMedianMs) * 100;
  const firstMeasurement =
    MEASURED_LAYOUT_CARDS.map((card) => onLayoutMeasurements[card.id]).find(
      (measurement) => measurement?.layoutKey === layoutKey,
    ) ?? null;
  const totalPretextLines =
    pretextMasonry?.metrics.reduce(
      (total, metric) => total + metric.lineCount,
      0,
    ) ?? null;
  const onLayoutRenderPassCount = onLayoutReady ? 2 : 1;
  const pretextRenderPassCount = pretextMasonry === null ? 0 : 1;
  const onLayoutShiftCount = onLayoutReady ? 1 : 0;
  const pretextShiftCount = 0;

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
      description="This page models a layout that cannot place visible cards until text width and height are known. The left path uses hidden RN Text plus onLayout. The right path asks Pretext for native text metrics before render, then uses ordinary RN views and Text for the visible surface."
      lineCount={totalPretextLines}
      prepareMs={pretextPrepared?.stats.totalMs ?? null}
      routeLabel="benchmark/measured-layout"
      selectedWidth={selectedWidth}
      setSelectedWidth={(width) => {
        setRunIndex((current) => current + 1);
        setSelectedWidth(width);
      }}
      title="onLayout measurement versus Pretext layout"
      widths={widths}
    >
      <SliteCard
        description="The board uses absolute masonry positions. One unknown text height blocks every card placed after it, so a MeasureLayout-style flow needs a hidden measurement pass. Pretext returns height from native engines before the visible board mounts."
        eyebrow="Complex Layout"
        title="Height is a first-class layout input"
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
            label="onLayout path time"
            value={formatMilliseconds(onLayoutPathMs)}
          />
          <KeyStatRow
            label="Pretext layout path time"
            value={formatMilliseconds(pretextMasonry?.elapsedMs ?? null)}
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
          The onLayout path needs a hidden text render pass before the visible
          board can stabilize. The Pretext path computes height first and then
          renders the same RN card surface once.
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
          onLayoutMs={onLayoutPathMs}
          pretextMs={pretextMasonry?.elapsedMs ?? null}
        />
      </View>

      <SurfaceSection
        description="This path renders hidden RN Text nodes, waits for every onLayout callback, stores width and height, then renders the visible masonry board from those measurements."
        title="onLayout measurement path"
      >
        <SurfaceLabel
          subtitle="The board is blocked until the measurement layer finishes."
          title="Hidden RN Text + onLayout"
        />
        <View style={sharedStyles.summaryMetricList}>
          <SummaryMetric
            label="Render pass count"
            value={String(onLayoutRenderPassCount)}
          />
          <SummaryMetric
            label="First stable height"
            value={formatMilliseconds(onLayoutPathMs)}
          />
          <SummaryMetric
            label="Layout shift count"
            value={String(onLayoutShiftCount)}
          />
          <SummaryMetric
            label="Callbacks"
            value={`${onLayoutMeasuredCount}/${MEASURED_LAYOUT_CARDS.length}`}
          />
          <SummaryMetric
            label="Measured text box"
            value={
              firstMeasurement === null
                ? "-"
                : `${formatPixel(firstMeasurement.width)} x ${formatPixel(
                    firstMeasurement.height,
                  )}`
            }
          />
          <SummaryMetric
            label="Median"
            value={formatMilliseconds(onLayoutMedianMs)}
          />
        </View>
        <OnLayoutMasonryBoard
          boardWidth={boardWidth}
          layout={onLayoutMasonry}
          layoutKey={layoutKey}
          measuredCount={onLayoutMeasuredCount}
          onBoardVisible={handleOnLayoutBoardVisible}
          onMeasuredTextLayout={handleMeasuredTextLayout}
          textWidth={textWidth}
        />
      </SurfaceSection>

      <SurfaceSection
        description="This path calls Pretext.layout() first. Pretext does not render anything; the visible board below is still ordinary RN View and Text, placed with the returned native text metrics."
        title="Pretext layout path"
      >
        <SurfaceLabel
          subtitle="Card positions are available before the visible RN surface mounts."
          title="Pretext.layout + RN View/Text"
        />
        <View style={sharedStyles.summaryMetricList}>
          <SummaryMetric
            label="Render pass count"
            value={String(pretextRenderPassCount)}
          />
          <SummaryMetric
            label="First stable height"
            value={formatMilliseconds(pretextMasonry?.elapsedMs ?? null)}
          />
          <SummaryMetric
            label="Layout shift count"
            value={String(pretextShiftCount)}
          />
          <SummaryMetric
            label="Layout path time"
            value={formatMilliseconds(pretextMasonry?.elapsedMs ?? null)}
          />
          <SummaryMetric
            label="Median"
            value={formatMilliseconds(pretextMedianMs)}
          />
          <SummaryMetric
            label="p95"
            value={formatMilliseconds(percentile(pretextSamples, 0.95))}
          />
        </View>
        {pretextMasonry === null ? (
          <View style={localStyles.placeholder}>
            <Text style={sharedStyles.summaryDescription}>
              Preparing Pretext layout state...
            </Text>
          </View>
        ) : (
          <PretextMasonryBoard
            boardWidth={boardWidth}
            layout={pretextMasonry.layout}
          />
        )}
      </SurfaceSection>
    </ExamplePageShell>
  );
}

function TimingBars({
  onLayoutMs,
  pretextMs,
}: {
  onLayoutMs: number | null;
  pretextMs: number | null;
}) {
  const maxMs = Math.max(onLayoutMs ?? 0, pretextMs ?? 0, 1);

  return (
    <View style={localStyles.timingStack}>
      <TimingBar
        label="onLayout"
        tone="onLayout"
        valueMs={onLayoutMs}
        widthPercent={((onLayoutMs ?? 0) / maxMs) * 100}
      />
      <TimingBar
        label="Pretext"
        tone="pretext"
        valueMs={pretextMs}
        widthPercent={((pretextMs ?? 0) / maxMs) * 100}
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
  tone: "onLayout" | "pretext";
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
            tone === "onLayout"
              ? localStyles.timingFillOnLayout
              : localStyles.timingFillPretext,
            { width: resolvedWidth },
          ]}
        />
      </View>
      <Text style={localStyles.timingValue}>{formatMilliseconds(valueMs)}</Text>
    </View>
  );
}

function OnLayoutMasonryBoard({
  boardWidth,
  layout,
  layoutKey,
  measuredCount,
  onBoardVisible,
  onMeasuredTextLayout,
  textWidth,
}: {
  boardWidth: number;
  layout: MasonryLayout | null;
  layoutKey: string;
  measuredCount: number;
  onBoardVisible: () => void;
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
            Measuring hidden RN Text
          </Text>
          <Text style={localStyles.measureWaitingText}>
            {measuredCount}/{MEASURED_LAYOUT_CARDS.length} boxes reported
            onLayout. The visible masonry board renders after this pass.
          </Text>
        </View>
      ) : (
        layout.cards.map((card, index) => (
          <TextCard
            key={`on-layout-card-${card.id}`}
            card={card}
            footerLabel="Visible after measure"
            onLayout={index === 0 ? onBoardVisible : undefined}
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

function PretextMasonryBoard({
  boardWidth,
  layout,
}: {
  boardWidth: number;
  layout: MasonryLayout;
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
        <TextCard
          key={`pretext-card-${card.id}`}
          card={card}
          footerLabel="Positioned before render"
          textHeight={card.paragraphHeight}
        />
      ))}
    </View>
  );
}

function TextCard({
  card,
  footerLabel,
  onLayout,
  textHeight,
}: {
  card: PositionedCard;
  footerLabel: string;
  onLayout?: () => void;
  textHeight?: number;
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
        style={[
          localStyles.bodyCopy,
          {
            height: textHeight,
            width: card.textWidth,
          },
        ]}
      >
        {card.text}
      </Text>
      <CardFooter label={footerLabel} />
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
    ...TEXT_RENDER_STYLE,
    overflow: "hidden",
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
    justifyContent: "center",
    minHeight: 240,
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
  timingFillOnLayout: {
    backgroundColor: "#d66c3d",
  },
  timingFillPretext: {
    backgroundColor: "#0f8f68",
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

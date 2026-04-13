import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  PreparedParagraphText,
  layoutParagraphsMetadata,
  prepareParagraphsWithStats,
  releaseParagraphs,
  type PreparedParagraphResult,
} from "react-native-nitro-pretext";

import { ExamplePageShell, useExampleWidthSelection } from "../shared";
import {
  BUBBLE_MESSAGES,
  KeyStatRow,
  SliteCard,
  SurfaceLabel,
  SurfaceSection,
  sliteStyles,
} from "./shared";

const BUBBLE_PADDING_H = 12;
const BUBBLE_PADDING_V = 8;

type BubbleLayoutRow = {
  lineCount: number;
  savedAreaPx: number;
  savedWidthPx: number;
  text: string;
  tightBubbleWidth: number;
  tightContentWidth: number;
};

function findTightContentWidth(
  preparedId: number,
  paragraphIndex: number,
  maxContentWidth: number,
  targetLineCount: number,
): number {
  let low = 1;
  let high = Math.max(1, Math.ceil(maxContentWidth));

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const paragraph = layoutParagraphsMetadata(preparedId, mid)[paragraphIndex];
    const lineCount = paragraph?.lineCount ?? targetLineCount;

    if (lineCount <= targetLineCount) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

export function BubblesSliteScreen() {
  const { selectedWidth, setSelectedWidth, widths } =
    useExampleWidthSelection();
  const [prepared, setPrepared] = useState<PreparedParagraphResult | null>(
    null,
  );

  useEffect(() => {
    const nextPrepared = prepareParagraphsWithStats(BUBBLE_MESSAGES, {
      fontFamily: "System",
      fontSize: 15,
      lineHeight: 22,
      letterSpacing: 0,
      locale: "ko-KR",
    });
    setPrepared(nextPrepared);

    return () => {
      releaseParagraphs(nextPrepared.prepared.id);
    };
  }, []);

  const bubbleRows = useMemo<BubbleLayoutRow[]>(() => {
    if (prepared === null) {
      return [];
    }

    const maxContentWidth = Math.max(120, selectedWidth - BUBBLE_PADDING_H * 2);
    const initialParagraphs = layoutParagraphsMetadata(
      prepared.prepared.id,
      maxContentWidth,
    );

    return BUBBLE_MESSAGES.map((text, index) => {
      const initial = initialParagraphs[index];
      const lineCount = Math.max(1, Math.round(initial?.lineCount ?? 1));
      const tightContentWidth = findTightContentWidth(
        prepared.prepared.id,
        index,
        maxContentWidth,
        lineCount,
      );
      const tightParagraph = layoutParagraphsMetadata(
        prepared.prepared.id,
        tightContentWidth,
      )[index];
      const tightHeight = Math.ceil(tightParagraph?.height ?? 22);
      const tightBubbleWidth = tightContentWidth + BUBBLE_PADDING_H * 2;
      const savedWidthPx = Math.max(0, selectedWidth - tightBubbleWidth);
      const savedAreaPx =
        savedWidthPx * Math.max(1, tightHeight + BUBBLE_PADDING_V * 2);

      return {
        lineCount,
        savedAreaPx,
        savedWidthPx,
        text,
        tightBubbleWidth,
        tightContentWidth,
      };
    });
  }, [prepared, selectedWidth]);

  const totalSavedArea = bubbleRows.reduce(
    (total, row) => total + row.savedAreaPx,
    0,
  );
  const averageSavedWidth =
    bubbleRows.length === 0
      ? 0
      : bubbleRows.reduce((total, row) => total + row.savedWidthPx, 0) /
        bubbleRows.length;
  const totalLineCount = bubbleRows.reduce(
    (total, row) => total + row.lineCount,
    0,
  );

  return (
    <ExamplePageShell
      description="Inspired by pretext bubbles. Start from a maximum chat width, keep the same wrapped lines, then search for the smallest width that still preserves that line count."
      lineCount={totalLineCount}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/slites/bubbles"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Tight multiline bubbles without a post-render probe loop"
      widths={widths}
    >
      <SliteCard
        description="Prepared metrics are used as a width search oracle. The regular Text version below keeps every message at the full bubble width, while the prepared version trims width without adding extra lines."
        eyebrow="What changes"
        title="Same lines, less waste"
      >
        <View style={{ gap: 8 }}>
          <KeyStatRow
            label="Bubble max width"
            value={`${selectedWidth.toFixed(0)} px`}
          />
          <KeyStatRow
            label="Average width saved"
            value={`${averageSavedWidth.toFixed(1)} px`}
          />
          <KeyStatRow
            label="Total wasted area removed"
            value={`${Math.round(totalSavedArea).toLocaleString()} px²`}
          />
        </View>
      </SliteCard>

      <SurfaceSection
        description="Plain Text can render the chat bubble, but without precomputed line metrics this version keeps the full target width for every wrapped message."
        title="Plain React Native Text"
      >
        <SurfaceLabel
          subtitle="Every multiline bubble stays at the full width cap."
          title="Baseline"
        />
        <View style={sliteStyles.bubbleStack}>
          {BUBBLE_MESSAGES.map((text, index) => (
            <Text
              key={`baseline-bubble-${index}`}
              allowFontScaling={false}
              style={[sliteStyles.bubbleBaseline, { width: selectedWidth }]}
            >
              {text}
            </Text>
          ))}
        </View>
      </SurfaceSection>

      <SurfaceSection
        description="Prepared paragraph state keeps the same line count, then renders each message at the tightest width that still fits those exact wrapped lines."
        title="PreparedParagraphText + metadata search"
      >
        <SurfaceLabel
          subtitle="Each message width is shrunk to its smallest line-count-preserving value."
          title="Prepared"
        />
        <View style={sliteStyles.bubbleStack}>
          {prepared === null ? (
            <Text>Preparing paragraph state…</Text>
          ) : (
            bubbleRows.map((row, index) => (
              <View key={`prepared-bubble-${index}`} style={{ gap: 6 }}>
                <View style={sliteStyles.badge}>
                  <Text style={sliteStyles.badgeText}>
                    -{Math.round(row.savedWidthPx)} px, {row.lineCount} lines
                  </Text>
                </View>
                <PreparedParagraphText
                  allowFontScaling={false}
                  layoutWidth={row.tightContentWidth}
                  paragraphIndex={index}
                  prepared={prepared.prepared}
                  style={[
                    sliteStyles.bubblePrepared,
                    { width: row.tightBubbleWidth },
                  ]}
                />
              </View>
            ))
          )}
        </View>
      </SurfaceSection>
    </ExamplePageShell>
  );
}

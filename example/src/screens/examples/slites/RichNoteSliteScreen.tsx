import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { TextLayoutEvent } from "react-native";
import {
  PreparedParagraphView,
  layoutParagraphsMetadata,
} from "react-native-nitro-pretext";

import { styles } from "../../../benchmark/constants";
import { ExamplePageShell, useExampleWidthSelection, usePreparedInlineExample } from "../shared";
import {
  KeyStatRow,
  RICH_NOTE_BASELINE_SEGMENTS,
  SliteCard,
  SurfaceLabel,
  SurfaceSection,
  sliteStyles,
} from "./shared";

const RICH_NOTE_SEGMENTS = [
  { text: "Ship ", breakBehavior: "normal" },
  {
    text: "@maya",
    breakBehavior: "never",
    fontWeight: "800",
    fontSize: 18,
    lineHeight: 28,
  },
  { text: "'s rich note once the review turns ", breakBehavior: "normal" },
  { text: "green", breakBehavior: "normal", fontWeight: "800" },
  { text: ". Keep ", breakBehavior: "normal" },
  {
    text: "layoutNextLine()",
    breakBehavior: "never",
    fontFamily: "Menlo",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700",
  },
  { text: " public and route feedback to design sync.", breakBehavior: "normal" },
] as const;

export function RichNoteSliteScreen() {
  const { selectedWidth, setSelectedWidth, widths } = useExampleWidthSelection();
  const inlineSegments = useMemo(
    () => RICH_NOTE_SEGMENTS.map((segment) => ({ ...segment })),
    [],
  );
  const prepared = usePreparedInlineExample(inlineSegments);
  const [baselineLineCount, setBaselineLineCount] = useState<number | null>(
    null,
  );
  const layoutWidth = Math.max(1, selectedWidth);

  const preparedMetrics = useMemo(() => {
    if (prepared === null) {
      return null;
    }

    return layoutParagraphsMetadata(prepared.prepared.id, layoutWidth)[0] ?? null;
  }, [layoutWidth, prepared]);

  return (
    <ExamplePageShell
      description="Inspired by pretext rich-note. This RN prototype currently maps the styled-run part of the demo: mixed inline styles plus non-breakable spans that stay glued together across width changes."
      lineCount={preparedMetrics?.lineCount ?? baselineLineCount}
      prepareMs={prepared?.stats.totalMs ?? null}
      routeLabel="examples/slites/rich-note"
      selectedWidth={selectedWidth}
      setSelectedWidth={setSelectedWidth}
      title="Styled inline runs and glued handles from the same prepared paragraph"
      widths={widths}
    >
      <SliteCard
        description={
          'The current library already supports prepared styled runs and breakBehavior "never". It does not yet implement the full pretext rich-inline chip model with caller-owned chrome width.'
        }
        eyebrow="Current parity"
        title="What this RN prototype already covers"
      >
        <View style={{ gap: 8 }}>
          <KeyStatRow
            label="Prepared lines known before render"
            value={
              preparedMetrics === null
                ? "—"
                : `${Math.round(preparedMetrics.lineCount)}`
            }
          />
          <KeyStatRow
            label="Baseline lines known before render"
            value="No"
          />
          <KeyStatRow label="Break-never span" value="@maya, layoutNextLine()" />
        </View>
      </SliteCard>

      <SurfaceSection
        description="Plain Text can style nested spans, but it does not expose a reusable prepared state. The line count only becomes available after `onTextLayout` fires."
        title="Plain React Native Text"
      >
        <SurfaceLabel
          subtitle="Nested Text styles, no precomputed paragraph handle."
          title="Baseline"
        />
        <View style={styles.summaryCard}>
          <Text
            allowFontScaling={false}
            onTextLayout={(event: TextLayoutEvent) =>
              setBaselineLineCount(event.nativeEvent.lines.length)
            }
            style={[sliteStyles.richBaselineText, { width: selectedWidth }]}
          >
            {RICH_NOTE_BASELINE_SEGMENTS.map((segment, index) => {
              const style =
                segment.kind === "handle"
                  ? sliteStyles.richHandleText
                  : segment.kind === "code"
                    ? sliteStyles.richCodeText
                    : segment.kind === "accent"
                      ? sliteStyles.richAccentText
                      : null;

              return (
                <Text key={`baseline-rich-segment-${index}`} style={style}>
                  {segment.text}
                </Text>
              );
            })}
          </Text>
        </View>
      </SurfaceSection>

      <SurfaceSection
        description="Prepared inline paragraphs keep the styled runs inside native prepared state. The same layout can later feed a native view, line-range renderer, or other custom surface without re-analyzing the paragraph model."
        title="PreparedParagraphView + inline segments"
      >
        <SurfaceLabel
          subtitle="Styled runs and break-never spans inside prepared state."
          title="Prepared"
        />
        <View style={styles.summaryCard}>
          {prepared !== null && preparedMetrics !== null ? (
            <PreparedParagraphView
              layoutWidth={selectedWidth}
              paragraphHeight={preparedMetrics.height}
              paragraphIndex={0}
              paragraphStyle={{
                fontFamily: "System",
                fontSize: 17,
                lineHeight: 28,
                letterSpacing: 0,
                locale: "ko-KR",
              }}
              prepared={prepared.prepared}
              style={{ width: selectedWidth }}
              textColor="#22211f"
            />
          ) : (
            <Text>Preparing paragraph state…</Text>
          )}
        </View>
      </SurfaceSection>
    </ExamplePageShell>
  );
}

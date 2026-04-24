import { useMemo } from "react";
import {
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import type {
  ParagraphLayoutRequest,
  ParagraphStyle,
  PreparedParagraphState,
} from "./Pretext.nitro";
import {
  createParagraphLayoutRequest,
  layoutParagraphLinesWithRequest,
} from "./TextMeasure";

const EMPTY_PARAGRAPH_LINES = {
  height: 0,
  lineCount: 0,
  lines: [],
  maxLineWidth: 0,
};

export type PreparedParagraphLinesViewProps = ViewProps & {
  contentInsetHorizontal?: number;
  contentInsetVertical?: number;
  includeFontPadding?: boolean;
  layoutRequest?: Partial<ParagraphLayoutRequest>;
  layoutWidth: number;
  lineTextProps?: Omit<TextProps, "children" | "style">;
  paragraphIndex: number;
  paragraphStyle: ParagraphStyle;
  paragraphText: string;
  prepared: PreparedParagraphState;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
};

export function PreparedParagraphLinesView({
  contentInsetHorizontal = 0,
  contentInsetVertical = 0,
  includeFontPadding = false,
  layoutRequest,
  layoutWidth,
  lineTextProps,
  paragraphIndex,
  paragraphStyle,
  paragraphText,
  prepared,
  style,
  textColor = "#22211f",
  textStyle,
  ...viewProps
}: PreparedParagraphLinesViewProps) {
  const resolvedLayoutRequest = useMemo(
    () => createParagraphLayoutRequest(layoutWidth, layoutRequest),
    [layoutRequest, layoutWidth],
  );
  const paragraph = useMemo(
    () =>
      layoutParagraphLinesWithRequest(prepared.id, resolvedLayoutRequest)[
        paragraphIndex
      ] ?? EMPTY_PARAGRAPH_LINES,
    [paragraphIndex, prepared.id, resolvedLayoutRequest],
  );
  const containerHeight = paragraph.height + contentInsetVertical * 2;
  const baseTextStyle = useMemo<TextStyle>(
    () => ({
      color: textColor,
      fontFamily: paragraphStyle.fontFamily,
      fontSize: paragraphStyle.fontSize,
      fontWeight: "400",
      includeFontPadding,
      left: 0,
      letterSpacing: paragraphStyle.letterSpacing,
      lineHeight: paragraphStyle.lineHeight,
      margin: 0,
      padding: 0,
      position: "absolute",
      textAlign: "left",
      top: 0,
    }),
    [
      paragraphStyle.fontFamily,
      paragraphStyle.fontSize,
      paragraphStyle.letterSpacing,
      paragraphStyle.lineHeight,
      includeFontPadding,
      textColor,
    ],
  );

  return (
    <View
      {...viewProps}
      style={[
        {
          height: containerHeight,
          overflow: "hidden",
          position: "relative",
        },
        style,
      ]}
    >
      {paragraph.lines.map((line, index) => {
        const textStart = Math.max(
          0,
          Math.min(paragraphText.length, line.textStart),
        );
        const textEnd = Math.max(
          textStart,
          Math.min(paragraphText.length, line.textEnd),
        );
        const lineText = paragraphText.slice(textStart, textEnd);

        return (
          <Text
            {...lineTextProps}
            key={`prepared-line-${paragraphIndex}-${index}-${textStart}-${textEnd}`}
            numberOfLines={1}
            style={[
              baseTextStyle,
              {
                height: Math.max(line.height, paragraphStyle.lineHeight),
                left: contentInsetHorizontal + line.left,
                top: contentInsetVertical + line.top,
                width: Math.max(line.width, 1),
              },
              textStyle,
            ]}
          >
            {lineText}
          </Text>
        );
      })}
    </View>
  );
}

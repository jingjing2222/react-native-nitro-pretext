import { useMemo } from "react";
import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

import { createParagraphLayoutRequest, layoutParagraphsWithRequest } from "./TextMeasure";
import type {
  ParagraphLayoutRequest,
  PreparedParagraphState,
} from "./Pretext.nitro";

export type PreparedParagraphTextProps = Omit<TextProps, "children"> & {
  layoutRequest?: Partial<ParagraphLayoutRequest>;
  layoutWidth: number;
  paragraphIndex: number;
  prepared: PreparedParagraphState;
  style?: StyleProp<TextStyle>;
};

export function PreparedParagraphText({
  layoutRequest,
  layoutWidth,
  paragraphIndex,
  prepared,
  style,
  ...textProps
}: PreparedParagraphTextProps) {
  const request = useMemo(
    () => createParagraphLayoutRequest(layoutWidth, layoutRequest),
    [layoutRequest, layoutWidth],
  );

  const brokenText = useMemo(() => {
    const paragraphs = layoutParagraphsWithRequest(prepared.id, request);
    return paragraphs[paragraphIndex]?.brokenText ?? "";
  }, [paragraphIndex, prepared.id, request]);

  return (
    <Text {...textProps} style={style}>
      {brokenText}
    </Text>
  );
}

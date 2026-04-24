import { Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

export * from "../../src/TextMeasure";
export type * from "../../src/Pretext.nitro";

import type { PreparedTextRange } from "../../src/Pretext.nitro";

type LegacyRendererProps = {
  onSelectionChange?: (selection: PreparedTextRange | null) => void;
  onSelectionCopy?: (text: string) => void;
  paragraphText?: string;
  style?: StyleProp<TextStyle | ViewStyle>;
  [key: string]: unknown;
};

export function PreparedParagraphView(_props: LegacyRendererProps) {
  return <View style={_props.style} />;
}

export function PreparedParagraphsView(_props: LegacyRendererProps) {
  return <View style={_props.style} />;
}

export function PreparedParagraphText(_props: LegacyRendererProps) {
  return <Text style={_props.style}>{_props.paragraphText ?? ""}</Text>;
}

export function PreparedParagraphLinesView(_props: LegacyRendererProps) {
  return <View style={_props.style} />;
}

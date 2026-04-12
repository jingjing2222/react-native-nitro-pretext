import {
  requireNativeComponent,
  type HostComponent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import type {
  ParagraphStyle,
  PreparedParagraphState,
} from "./Pretext.nitro";

type NativePreparedParagraphViewProps = ViewProps & {
  contentInsetLeft: number;
  contentInsetTop: number;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  layoutWidth: number;
  lineHeight: number;
  paragraphIndex: number;
  preparedId: number;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

export type PreparedParagraphViewProps = ViewProps & {
  contentInsetHorizontal?: number;
  contentInsetVertical?: number;
  layoutWidth: number;
  paragraphHeight: number;
  paragraphIndex: number;
  paragraphStyle: ParagraphStyle;
  prepared: PreparedParagraphState;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

let nativePreparedParagraphView: HostComponent<NativePreparedParagraphViewProps> | null =
  null;

function getNativePreparedParagraphView(): HostComponent<NativePreparedParagraphViewProps> {
  if (nativePreparedParagraphView === null) {
    nativePreparedParagraphView =
      requireNativeComponent<NativePreparedParagraphViewProps>(
        "PreparedParagraphView",
      );
  }

  return nativePreparedParagraphView;
}

export function PreparedParagraphView({
  contentInsetHorizontal = 0,
  contentInsetVertical = 0,
  layoutWidth,
  onLayout,
  paragraphHeight,
  paragraphIndex,
  paragraphStyle,
  prepared,
  style,
  textColor = "#22211f",
  ...viewProps
}: PreparedParagraphViewProps) {
  const NativePreparedParagraphView = getNativePreparedParagraphView();

  return (
    <NativePreparedParagraphView
      contentInsetLeft={contentInsetHorizontal}
      contentInsetTop={contentInsetVertical}
      fontFamily={paragraphStyle.fontFamily}
      fontSize={paragraphStyle.fontSize}
      layoutWidth={layoutWidth}
      letterSpacing={paragraphStyle.letterSpacing}
      lineHeight={paragraphStyle.lineHeight}
      onLayout={onLayout}
      paragraphIndex={paragraphIndex}
      preparedId={prepared.id}
      style={[{ height: paragraphHeight + contentInsetVertical * 2 }, style]}
      textColor={textColor}
      {...viewProps}
    />
  );
}

import {
  requireNativeComponent,
  type HostComponent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useMemo } from "react";

import type {
  LaidOutParagraphMetrics,
  ParagraphLayoutRequest,
  ParagraphStyle,
  PreparedParagraphState,
} from "./Pretext.nitro";
import { createParagraphLayoutRequest } from "./TextMeasure";

type NativePreparedParagraphsViewProps = ViewProps & {
  contentInsetLeft: number;
  contentInsetTop: number;
  layoutRequest: ParagraphLayoutRequest;
  layoutWidth: number;
  paragraphCount: number;
  paragraphGap: number;
  preparedId: number;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

export type PreparedParagraphsViewProps = ViewProps & {
  contentInsetHorizontal?: number;
  contentInsetVertical?: number;
  layoutRequest?: Partial<ParagraphLayoutRequest>;
  layoutWidth: number;
  paragraphGap?: number;
  paragraphMetrics: LaidOutParagraphMetrics[];
  paragraphStyle: ParagraphStyle;
  prepared: PreparedParagraphState;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

let nativePreparedParagraphsView: HostComponent<NativePreparedParagraphsViewProps> | null =
  null;

function getNativePreparedParagraphsView(): HostComponent<NativePreparedParagraphsViewProps> {
  if (nativePreparedParagraphsView === null) {
    nativePreparedParagraphsView =
      requireNativeComponent<NativePreparedParagraphsViewProps>(
        "PreparedParagraphsView",
      );
  }

  return nativePreparedParagraphsView;
}

function resolveTotalHeight(args: {
  contentInsetVertical: number;
  paragraphCount: number;
  paragraphGap: number;
  paragraphMetrics: LaidOutParagraphMetrics[];
  paragraphStyle: ParagraphStyle;
}): number {
  if (args.paragraphCount <= 0) {
    return 0;
  }

  const totalParagraphHeight = Array.from(
    { length: args.paragraphCount },
    (_, index) =>
      args.paragraphMetrics[index]?.height ?? args.paragraphStyle.lineHeight,
  ).reduce((total, height) => total + height, 0);
  const totalInsets = args.contentInsetVertical * 2 * args.paragraphCount;
  const totalGaps = args.paragraphGap * Math.max(0, args.paragraphCount - 1);

  return totalParagraphHeight + totalInsets + totalGaps;
}

export function PreparedParagraphsView({
  contentInsetHorizontal = 0,
  contentInsetVertical = 0,
  layoutRequest,
  layoutWidth,
  onLayout,
  paragraphGap = 0,
  paragraphMetrics,
  paragraphStyle,
  prepared,
  style,
  textColor = "#22211f",
  ...viewProps
}: PreparedParagraphsViewProps) {
  const NativePreparedParagraphsView = getNativePreparedParagraphsView();
  const resolvedLayoutRequest = useMemo(
    () => createParagraphLayoutRequest(layoutWidth, layoutRequest),
    [layoutRequest, layoutWidth],
  );
  const paragraphCount = Math.max(0, Math.round(prepared.paragraphCount));
  const totalHeight = resolveTotalHeight({
    contentInsetVertical,
    paragraphCount,
    paragraphGap,
    paragraphMetrics,
    paragraphStyle,
  });

  return (
    <NativePreparedParagraphsView
      contentInsetLeft={contentInsetHorizontal}
      contentInsetTop={contentInsetVertical}
      layoutRequest={resolvedLayoutRequest}
      layoutWidth={layoutWidth}
      onLayout={onLayout}
      paragraphCount={paragraphCount}
      paragraphGap={paragraphGap}
      preparedId={prepared.id}
      style={[{ height: totalHeight }, style]}
      textColor={textColor}
      {...viewProps}
    />
  );
}

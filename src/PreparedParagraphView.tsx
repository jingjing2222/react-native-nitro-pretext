import {
  Pressable,
  requireNativeComponent,
  StyleSheet,
  View,
  type HostComponent,
  type GestureResponderEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useMemo, useRef, useState } from "react";

import type {
  ParagraphLayoutRequest,
  ParagraphStyle,
  PreparedTextPosition,
  PreparedTextRange,
  PreparedParagraphState,
} from "./Pretext.nitro";
import {
  copyPreparedTextSelection,
  hitTestPreparedTextPosition,
  layoutPreparedTextSelectionRects,
  selectAllPreparedText,
  createParagraphLayoutRequest,
} from "./TextMeasure";

type NativePreparedParagraphViewProps = ViewProps & {
  contentInsetLeft: number;
  contentInsetTop: number;
  fontFamily: string;
  fontStyle?: string;
  fontSize: number;
  fontWeight?: string;
  layoutRequest: ParagraphLayoutRequest;
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
  copySelectionOnLongPress?: boolean;
  layoutRequest?: Partial<ParagraphLayoutRequest>;
  layoutWidth: number;
  onSelectionChange?: (selection: PreparedTextRange | null) => void;
  onSelectionCopy?: (text: string) => void;
  paragraphHeight: number;
  paragraphIndex: number;
  paragraphStyle: ParagraphStyle;
  prepared: PreparedParagraphState;
  selectable?: boolean;
  selectAllOnLongPress?: boolean;
  selection?: PreparedTextRange | null;
  selectionColor?: string;
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
  copySelectionOnLongPress = true,
  layoutRequest,
  layoutWidth,
  onLayout,
  onSelectionChange,
  onSelectionCopy,
  paragraphHeight,
  paragraphIndex,
  paragraphStyle,
  prepared,
  selectable = false,
  selectAllOnLongPress = true,
  selection,
  selectionColor = "rgba(31, 95, 84, 0.22)",
  style,
  textColor = "#22211f",
  ...viewProps
}: PreparedParagraphViewProps) {
  const NativePreparedParagraphView = getNativePreparedParagraphView();
  const [internalSelection, setInternalSelection] =
    useState<PreparedTextRange | null>(null);
  const dragAnchorRef = useRef<PreparedTextPosition | null>(null);
  const didDragSelectionRef = useRef(false);
  const resolvedLayoutRequest = useMemo(
    () => createParagraphLayoutRequest(layoutWidth, layoutRequest),
    [layoutRequest, layoutWidth],
  );
  const activeSelection =
    selection === undefined ? internalSelection : selection;
  const selectionRects = useMemo(() => {
    if (activeSelection === null) {
      return [];
    }

    return layoutPreparedTextSelectionRects(
      prepared.id,
      activeSelection,
      resolvedLayoutRequest,
    );
  }, [activeSelection, prepared.id, resolvedLayoutRequest]);
  const resolvedHeight = paragraphHeight + contentInsetVertical * 2;

  function commitSelection(nextSelection: PreparedTextRange | null) {
    if (selection === undefined) {
      setInternalSelection(nextSelection);
    }
    onSelectionChange?.(nextSelection);
  }

  function hitTestEvent(event: GestureResponderEvent): PreparedTextPosition {
    return hitTestPreparedTextPosition(
      prepared.id,
      paragraphIndex,
      resolvedLayoutRequest,
      event.nativeEvent.locationX - contentInsetHorizontal,
      event.nativeEvent.locationY - contentInsetVertical,
    );
  }

  function handlePress(event: GestureResponderEvent) {
    if (!selectable) {
      return;
    }

    if (didDragSelectionRef.current) {
      didDragSelectionRef.current = false;
      return;
    }

    const position = hitTestEvent(event);
    const nextSelection = {
      paragraphIndex: position.paragraphIndex,
      textStart: position.lineTextStart,
      textEnd: position.lineTextEnd,
    };
    commitSelection(nextSelection);
  }

  function handleLongPress() {
    if (!selectable || !selectAllOnLongPress) {
      return;
    }

    const nextSelection = selectAllPreparedText(prepared.id, paragraphIndex);
    commitSelection(nextSelection);
    if (copySelectionOnLongPress) {
      onSelectionCopy?.(copyPreparedTextSelection(prepared.id, nextSelection));
    }
  }

  function handleTouchStart(event: GestureResponderEvent) {
    if (!selectable) {
      return;
    }

    dragAnchorRef.current = hitTestEvent(event);
    didDragSelectionRef.current = false;
  }

  function handleTouchMove(event: GestureResponderEvent) {
    if (!selectable || dragAnchorRef.current === null) {
      return;
    }

    const anchor = dragAnchorRef.current;
    const position = hitTestEvent(event);
    const textStart = Math.min(anchor.offset, position.offset);
    const textEnd = Math.max(anchor.offset, position.offset);
    didDragSelectionRef.current = true;

    commitSelection({
      paragraphIndex: position.paragraphIndex,
      textStart,
      textEnd,
    });
  }

  function handleTouchEnd() {
    dragAnchorRef.current = null;
  }

  const nativeView = (
    <NativePreparedParagraphView
      contentInsetLeft={contentInsetHorizontal}
      contentInsetTop={contentInsetVertical}
      fontFamily={paragraphStyle.fontFamily}
      fontStyle={paragraphStyle.fontStyle}
      fontSize={paragraphStyle.fontSize}
      fontWeight={paragraphStyle.fontWeight}
      layoutRequest={resolvedLayoutRequest}
      layoutWidth={layoutWidth}
      letterSpacing={paragraphStyle.letterSpacing}
      lineHeight={paragraphStyle.lineHeight}
      paragraphIndex={paragraphIndex}
      preparedId={prepared.id}
      pointerEvents={selectable ? "none" : undefined}
      style={
        selectable
          ? StyleSheet.absoluteFill
          : [{ height: resolvedHeight }, style]
      }
      textColor={textColor}
      {...(selectable ? {} : viewProps)}
      {...(selectable ? {} : { onLayout })}
    />
  );

  if (!selectable) {
    return nativeView;
  }

  return (
    <View onLayout={onLayout} style={[{ height: resolvedHeight }, style]}>
      {nativeView}
      {selectionRects.map((rect) => (
        <View
          key={`${rect.paragraphIndex}-${rect.lineIndex}-${rect.textStart}-${rect.textEnd}`}
          pointerEvents="none"
          style={[
            styles.selectionRect,
            {
              backgroundColor: selectionColor,
              height: rect.height,
              left: contentInsetHorizontal + rect.left,
              top: contentInsetVertical + rect.top,
              width: rect.width,
            },
          ]}
        />
      ))}
      <Pressable
        accessibilityRole={viewProps.accessibilityRole ?? "text"}
        onLongPress={handleLongPress}
        onPress={handlePress}
        onTouchCancel={handleTouchEnd}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        style={StyleSheet.absoluteFill}
        {...viewProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  selectionRect: {
    position: "absolute",
    borderRadius: 2,
  },
});

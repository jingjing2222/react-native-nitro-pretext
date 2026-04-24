import { Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import {
  createParagraphLayoutRequest,
  layoutParagraphLinesWithRequest,
  layoutParagraphsMetadataWithRequest,
  layoutRichParagraphLines as layoutRichParagraphLinesWithRequestOnly,
} from "../../src/TextMeasure";
import type {
  ParagraphLayoutRequest,
  ParagraphLineRange,
} from "../../src/Pretext.nitro";

export * from "../../src/TextMeasure";
export type * from "../../src/Pretext.nitro";

export type LaidOutParagraph = {
  brokenText: string;
  lineCount: number;
  height: number;
  maxLineWidth: number;
};

export type PreparedTextRange = {
  paragraphIndex: number;
  textStart: number;
  textEnd: number;
};

export type ParagraphLineCursorState = {
  id: number;
  paragraphIndex: number;
  lineCount: number;
  height: number;
};

export type ParagraphLineCursorStep = {
  done: boolean;
  textStart: number;
  textEnd: number;
  top: number;
  left: number;
  width: number;
  height: number;
  ascent: number;
  descent: number;
};

type CursorRecord = {
  lines: ParagraphLineRange[];
  nextIndex: number;
};

const cursors = new Map<number, CursorRecord>();
let nextCursorId = 1;

type LegacyRendererProps = {
  onSelectionChange?: (selection: PreparedTextRange | null) => void;
  onSelectionCopy?: (text: string) => void;
  paragraphText?: string;
  style?: StyleProp<TextStyle | ViewStyle>;
  [key: string]: unknown;
};

export function layoutParagraphsMetadata(preparedId: number, width: number) {
  return layoutParagraphsMetadataWithRequest(
    preparedId,
    createParagraphLayoutRequest(width),
  );
}

export function layoutParagraphLines(preparedId: number, width: number) {
  return layoutParagraphLinesWithRequest(
    preparedId,
    createParagraphLayoutRequest(width),
  );
}

export function layoutParagraphs(
  preparedId: number,
  width: number,
): LaidOutParagraph[] {
  return layoutParagraphLines(preparedId, width).map((paragraph) => ({
    brokenText: paragraph.lines.map(() => "").join("\n"),
    lineCount: paragraph.lineCount,
    height: paragraph.height,
    maxLineWidth: paragraph.maxLineWidth,
  }));
}

export function layoutRichParagraphLines(
  preparedId: number,
  widthOrRequest: number | ParagraphLayoutRequest,
) {
  return layoutRichParagraphLinesWithRequestOnly(
    preparedId,
    typeof widthOrRequest === "number"
      ? createParagraphLayoutRequest(widthOrRequest)
      : widthOrRequest,
  );
}

export function selectAllPreparedText(
  _preparedId: number,
  paragraphIndex: number,
): PreparedTextRange {
  return {
    paragraphIndex,
    textStart: 0,
    textEnd: 0,
  };
}

export function copyPreparedTextSelection(
  _preparedId: number,
  _selection: PreparedTextRange,
): string {
  return "";
}

export function createParagraphLineCursor(
  preparedId: number,
  paragraphIndex: number,
  request: ParagraphLayoutRequest,
): ParagraphLineCursorState {
  const paragraph =
    layoutParagraphLinesWithRequest(preparedId, request)[paragraphIndex] ??
    null;
  const id = nextCursorId;
  nextCursorId += 1;
  cursors.set(id, {
    lines: paragraph?.lines ?? [],
    nextIndex: 0,
  });

  return {
    id,
    paragraphIndex,
    lineCount: paragraph?.lineCount ?? 0,
    height: paragraph?.height ?? 0,
  };
}

export function nextParagraphLine(cursorId: number): ParagraphLineCursorStep {
  const cursor = cursors.get(cursorId);
  if (cursor === undefined || cursor.nextIndex >= cursor.lines.length) {
    return doneCursorStep();
  }

  const line = cursor.lines[cursor.nextIndex];
  cursor.nextIndex += 1;
  if (line === undefined) {
    return doneCursorStep();
  }

  return {
    done: false,
    textStart: line.textStart,
    textEnd: line.textEnd,
    top: line.top,
    left: line.left,
    width: line.width,
    height: line.height,
    ascent: line.ascent,
    descent: line.descent,
  };
}

export function releaseParagraphLineCursor(cursorId: number): void {
  cursors.delete(cursorId);
}

function doneCursorStep(): ParagraphLineCursorStep {
  return {
    done: true,
    textStart: 0,
    textEnd: 0,
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    ascent: 0,
    descent: 0,
  };
}

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

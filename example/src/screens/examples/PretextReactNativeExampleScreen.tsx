import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  layout,
  type ParagraphLineRange,
  prepare,
  type ParagraphShapeSlice,
  type PretextLinesLayout,
  type PretextPrepared,
  type PretextStyle,
} from "react-native-nitro-pretext";

const SAMPLE_TEXT =
  "Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing, as well as adjusting the space between pairs of letters. Type design is a closely related craft, sometimes considered part of typography. Typography may also be used as an ornamental and decorative device, unrelated to the communication of information.";

const TEXT_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 16,
  includeFontPadding: true,
  lineHeight: 24,
  locale: "en-US",
  textDirection: "auto",
};

const CIRCLE_RADIUS = 62;
const CIRCLE_PADDING = 14;
const LINE_HEIGHT = 24;
const LINE_RENDER_WIDTH_PADDING = 2;
const PREVIEW_HEIGHT = 360;
const MIN_LINE_SLOT_WIDTH = 56;
const SHAPE_LAYOUT_CLEARANCE = 20;
const SHAPE_INTRUSION_TOLERANCE = 0.5;
const GRID_CELL_PERCENT = 100 / 3;
const GRID_CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const GRID_TARGET_FRACTIONS = [0.28, 0.5, 0.72] as const;

type Point = {
  x: number;
  y: number;
};

type CircleMotionReport = {
  intrudingSampleCount: number;
  maxIntrudingLineCount: number;
  minObstacleClearance: number | null;
  sampledPositionCount: number;
  visitedGridCells: number[];
};

function createCircleMotionReport(): CircleMotionReport {
  return {
    intrudingSampleCount: 0,
    maxIntrudingLineCount: 0,
    minObstacleClearance: null,
    sampledPositionCount: 0,
    visitedGridCells: [],
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatMs(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(2)} ms`;
}

function minNullableNumber(
  current: number | null,
  next: number | null,
): number | null {
  if (current === null) {
    return next;
  }

  if (next === null) {
    return current;
  }

  return Math.min(current, next);
}

function getCircleGridCell({
  circle,
  previewWidth,
}: {
  circle: Point;
  previewWidth: number;
}): number | null {
  if (previewWidth <= 0) {
    return null;
  }

  const column = clamp(Math.floor((circle.x / previewWidth) * 3), 0, 2);
  const row = clamp(Math.floor((circle.y / PREVIEW_HEIGHT) * 3), 0, 2);

  return row * 3 + column + 1;
}

function getCircleGridCellStyle(cell: number): ViewStyle {
  const index = cell - 1;
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    height: `${GRID_CELL_PERCENT}%`,
    left: `${column * GRID_CELL_PERCENT}%`,
    top: `${row * GRID_CELL_PERCENT}%`,
    width: `${GRID_CELL_PERCENT}%`,
  };
}

function buildCircleShapeSlices({
  circle,
  lineHeight,
  previewHeight,
  width,
}: {
  circle: Point;
  lineHeight: number;
  previewHeight: number;
  width: number;
}): ParagraphShapeSlice[] {
  if (width <= 0) {
    return [];
  }

  const slices: ParagraphShapeSlice[] = [];
  const obstacleRadius =
    CIRCLE_RADIUS + CIRCLE_PADDING + SHAPE_LAYOUT_CLEARANCE;
  const lineCount = Math.ceil(previewHeight / lineHeight);

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const top = lineIndex * lineHeight;
    const bottom = top + lineHeight;
    if (
      bottom <= circle.y - obstacleRadius ||
      top >= circle.y + obstacleRadius
    ) {
      continue;
    }

    const closestLineY = clamp(circle.y, top, bottom);
    const dy = closestLineY - circle.y;

    const dx = Math.sqrt(obstacleRadius * obstacleRadius - dy * dy);
    const blockedLeft = clamp(circle.x - dx, 0, width);
    const blockedRight = clamp(circle.x + dx, 0, width);
    const leftWidth = blockedLeft;
    const rightWidth = width - blockedRight;

    if (leftWidth >= MIN_LINE_SLOT_WIDTH) {
      slices.push({
        height: lineHeight,
        left: 0,
        top,
        width: leftWidth,
      });
    }

    if (rightWidth >= MIN_LINE_SLOT_WIDTH) {
      slices.push({
        height: lineHeight,
        left: blockedRight,
        top,
        width: rightWidth,
      });
    }

    if (leftWidth < MIN_LINE_SLOT_WIDTH && rightWidth < MIN_LINE_SLOT_WIDTH) {
      slices.push({
        height: lineHeight,
        left: 0,
        top,
        width: 0,
      });
    }
  }

  return slices;
}

function summarizeCircleIntrusions({
  circle,
  lines,
}: {
  circle: Point;
  lines: ParagraphLineRange[];
}): {
  intrudingLineCount: number;
  intrudingLineTexts: string[];
  minObstacleClearance: number | null;
} {
  const obstacleRadius = CIRCLE_RADIUS + CIRCLE_PADDING;
  let hasClearance = false;
  let minObstacleClearance = Number.POSITIVE_INFINITY;
  const intrudingLineTexts: string[] = [];

  lines.forEach((line) => {
    if (line.width <= 0 || line.height <= 0) {
      return;
    }

    const left = line.left;
    const right = line.left + line.width + LINE_RENDER_WIDTH_PADDING;
    const top = line.top;
    const bottom = line.top + line.height;
    const closestX = clamp(circle.x, left, right);
    const closestY = clamp(circle.y, top, bottom);
    const distance = Math.hypot(closestX - circle.x, closestY - circle.y);
    const clearance = distance - obstacleRadius;
    hasClearance = true;
    minObstacleClearance = Math.min(minObstacleClearance, clearance);

    if (clearance < -SHAPE_INTRUSION_TOLERANCE) {
      intrudingLineTexts.push(
        SAMPLE_TEXT.slice(line.textStart, line.textEnd).trim(),
      );
    }
  });

  return {
    intrudingLineCount: intrudingLineTexts.length,
    intrudingLineTexts: intrudingLineTexts.slice(0, 4),
    minObstacleClearance: hasClearance
      ? Number(minObstacleClearance.toFixed(2))
      : null,
  };
}

export function PretextReactNativeExampleScreen() {
  const insets = useSafeAreaInsets();
  const [previewWidth, setPreviewWidth] = useState(0);
  const [circle, setCircle] = useState<Point>({
    x: CIRCLE_RADIUS + CIRCLE_PADDING,
    y: 132,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [circleMoveCount, setCircleMoveCount] = useState(0);
  const [circleMotionReport, setCircleMotionReport] =
    useState<CircleMotionReport>(createCircleMotionReport);
  const circleRef = useRef(circle);
  const dragStartRef = useRef(circle);
  const initializedRef = useRef(false);
  const lastMotionSampleKeyRef = useRef<string | null>(null);
  const [preparedState, setPreparedState] = useState<{
    error: string | null;
    prepared: PretextPrepared | null;
  }>({
    error: null,
    prepared: null,
  });

  useEffect(() => {
    let prepared: PretextPrepared | null = null;

    try {
      prepared = prepare(SAMPLE_TEXT, TEXT_STYLE);
      setPreparedState({ error: null, prepared });
    } catch (error) {
      setPreparedState({ error: describeError(error), prepared: null });
    }

    return () => {
      prepared?.release();
    };
  }, []);

  const updateCircle = useCallback(
    (next: Point) => {
      const minX = CIRCLE_RADIUS * 0.75;
      const maxX = Math.max(minX, previewWidth - CIRCLE_RADIUS * 0.75);
      const clamped = {
        x: clamp(next.x, minX, maxX),
        y: clamp(
          next.y,
          CIRCLE_RADIUS * 0.75,
          PREVIEW_HEIGHT - CIRCLE_RADIUS * 0.75,
        ),
      };

      circleRef.current = clamped;
      setCircle(clamped);
    },
    [previewWidth],
  );

  const finishDrag = useCallback(() => {
    setIsDragging(false);

    const start = dragStartRef.current;
    const current = circleRef.current;
    const moved =
      Math.round(start.x) !== Math.round(current.x) ||
      Math.round(start.y) !== Math.round(current.y);

    if (moved) {
      setCircleMoveCount((count) => count + 1);
    }
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          setIsDragging(true);
          dragStartRef.current = circleRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          const start = dragStartRef.current;
          updateCircle({
            x: start.x + gesture.dx,
            y: start.y + gesture.dy,
          });
        },
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
      }),
    [finishDrag, updateCircle],
  );

  const resetCircleMotionReport = useCallback(() => {
    lastMotionSampleKeyRef.current = null;
    setCircleMoveCount(0);
    setCircleMotionReport(createCircleMotionReport());
  }, []);

  const moveCircleToGridCell = useCallback(
    (cell: number) => {
      const index = cell - 1;
      const column = index % 3;
      const row = Math.floor(index / 3);
      const start = circleRef.current;
      const targetColumnFraction = GRID_TARGET_FRACTIONS[column] ?? 0.5;
      const targetRowFraction = GRID_TARGET_FRACTIONS[row] ?? 0.5;
      const next = {
        x: targetColumnFraction * previewWidth,
        y: targetRowFraction * PREVIEW_HEIGHT,
      };

      updateCircle(next);

      if (
        Math.round(start.x) !== Math.round(next.x) ||
        Math.round(start.y) !== Math.round(next.y)
      ) {
        setCircleMoveCount((count) => count + 1);
      }
    },
    [previewWidth, updateCircle],
  );

  function handlePreviewLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setPreviewWidth(nextWidth);

    if (!initializedRef.current && nextWidth > 0) {
      initializedRef.current = true;
      const initial = {
        x: Math.round(nextWidth / 2),
        y: 132,
      };
      circleRef.current = initial;
      setCircle(initial);
    }
  }

  const shapeSlices = useMemo(
    () =>
      buildCircleShapeSlices({
        circle,
        lineHeight: LINE_HEIGHT,
        previewHeight: PREVIEW_HEIGHT,
        width: previewWidth,
      }),
    [circle, previewWidth],
  );

  const computed = useMemo<{
    elapsedMs: number | null;
    linesLayout: PretextLinesLayout | null;
  }>(() => {
    if (preparedState.prepared === null || previewWidth <= 0) {
      return {
        elapsedMs: null,
        linesLayout: null,
      };
    }

    try {
      const startedAt = Date.now();
      const linesLayout = layout(preparedState.prepared, {
        output: "lines",
        shapeSlices,
        width: previewWidth,
      });

      return {
        elapsedMs: Date.now() - startedAt,
        linesLayout,
      };
    } catch {
      return {
        elapsedMs: null,
        linesLayout: null,
      };
    }
  }, [preparedState.prepared, previewWidth, shapeSlices]);

  const lines = computed.linesLayout?.paragraphs[0]?.lines ?? [];
  const circleIntrusionSummary = summarizeCircleIntrusions({ circle, lines });
  const roundedCircleX = Math.round(circle.x);
  const roundedCircleY = Math.round(circle.y);
  const circleGridCell = getCircleGridCell({ circle, previewWidth });

  useEffect(() => {
    if (previewWidth <= 0 || lines.length === 0) {
      return;
    }

    const sampleKey = `${roundedCircleX}:${roundedCircleY}:${lines.length}`;
    if (lastMotionSampleKeyRef.current === sampleKey) {
      return;
    }

    lastMotionSampleKeyRef.current = sampleKey;
    setCircleMotionReport((current) => ({
      intrudingSampleCount:
        current.intrudingSampleCount +
        (circleIntrusionSummary.intrudingLineCount > 0 ? 1 : 0),
      maxIntrudingLineCount: Math.max(
        current.maxIntrudingLineCount,
        circleIntrusionSummary.intrudingLineCount,
      ),
      minObstacleClearance: minNullableNumber(
        current.minObstacleClearance,
        circleIntrusionSummary.minObstacleClearance,
      ),
      sampledPositionCount: current.sampledPositionCount + 1,
      visitedGridCells:
        circleGridCell === null ||
        current.visitedGridCells.includes(circleGridCell)
          ? current.visitedGridCells
          : [...current.visitedGridCells, circleGridCell].sort(
              (left, right) => left - right,
            ),
    }));
  }, [
    circleGridCell,
    circleIntrusionSummary.intrudingLineCount,
    circleIntrusionSummary.minObstacleClearance,
    lines.length,
    previewWidth,
    roundedCircleX,
    roundedCircleY,
  ]);

  const report = `API_EXAMPLE_REPORT::examples/pretext-react-native-example::${JSON.stringify(
    {
      circleMoveCount,
      circleX: roundedCircleX,
      circleY: roundedCircleY,
      intrudingLineCount: circleIntrusionSummary.intrudingLineCount,
      intrudingLineTexts: circleIntrusionSummary.intrudingLineTexts,
      layoutElapsedMs: computed.elapsedMs,
      lineCount: lines.length,
      minObstacleClearance: circleIntrusionSummary.minObstacleClearance,
      motionIntrudingSampleCount: circleMotionReport.intrudingSampleCount,
      motionMaxIntrudingLineCount: circleMotionReport.maxIntrudingLineCount,
      motionMinObstacleClearance: circleMotionReport.minObstacleClearance,
      motionSampledPositionCount: circleMotionReport.sampledPositionCount,
      motionVisitedGridCellCount: circleMotionReport.visitedGridCells.length,
      motionVisitedGridCells: circleMotionReport.visitedGridCells,
      obstacleRadius: CIRCLE_RADIUS + CIRCLE_PADDING,
      previewWidth,
      shapeLayoutClearance: SHAPE_LAYOUT_CLEARANCE,
      shapeSliceCount: shapeSlices.length,
    },
  )}`;

  return (
    <View style={localStyles.screen}>
      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          { paddingBottom: 56 + insets.bottom },
        ]}
        scrollEnabled={!isDragging}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.header}>
          <Text style={localStyles.route}>
            examples/pretext-react-native-example
          </Text>
          <Text style={localStyles.title}>Draggable shape reflow</Text>
          <Text style={localStyles.description}>
            A React Native version of the Pretext text-around-shape demo.
          </Text>
        </View>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Usage</Text>
          <Text selectable style={localStyles.code}>
            {`const prepared = prepare(text, style);
const lines = layout(prepared, {
  width,
  output: "lines",
  shapeSlices: circleShapeSlices,
});`}
          </Text>
        </View>

        {preparedState.error ? (
          <View style={localStyles.panel}>
            <Text style={localStyles.panelTitle}>Prepare error</Text>
            <Text style={localStyles.body}>{preparedState.error}</Text>
          </View>
        ) : null}

        <View style={localStyles.grid}>
          <Stat label="lines" value={lines.length} />
          <Stat label="shape slices" value={shapeSlices.length} />
          <Stat label="layout" value={formatMs(computed.elapsedMs)} />
        </View>

        <Text
          accessible
          accessibilityLabel={report}
          importantForAccessibility="yes"
          numberOfLines={1}
          selectable
          style={localStyles.automationReportAnchor}
          testID="examples.pretext-react-native-example.report"
        >
          {report}
        </Text>

        <View
          onLayout={handlePreviewLayout}
          style={localStyles.preview}
          testID="examples.pretext-react-native-example.preview"
        >
          {lines.map((line, index) => (
            <Text
              key={`${line.textStart}-${line.textEnd}-${index}`}
              numberOfLines={1}
              style={[
                localStyles.lineText,
                {
                  left: line.left,
                  top: line.top,
                  width: Math.max(1, line.width + LINE_RENDER_WIDTH_PADDING),
                },
              ]}
            >
              {SAMPLE_TEXT.slice(line.textStart, line.textEnd).trimEnd()}
            </Text>
          ))}

          <View
            pointerEvents="box-none"
            style={localStyles.gridTargets}
            testID="examples.pretext-react-native-example.grid"
          >
            {GRID_CELLS.map((cell) => (
              <Pressable
                accessible
                accessibilityLabel={`Move circle to grid cell ${cell}`}
                accessibilityRole="button"
                collapsable={false}
                importantForAccessibility="yes"
                key={cell}
                onPress={() => moveCircleToGridCell(cell)}
                style={[localStyles.gridTarget, getCircleGridCellStyle(cell)]}
                testID={`examples.pretext-react-native-example.grid-cell.${cell}`}
              />
            ))}
          </View>

          <View
            {...panResponder.panHandlers}
            accessibilityRole="adjustable"
            style={[
              localStyles.circle,
              {
                left: circle.x - CIRCLE_RADIUS,
                top: circle.y - CIRCLE_RADIUS,
              },
            ]}
            testID="examples.pretext-react-native-example.circle"
          >
            <View style={localStyles.circleCore} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetCircleMotionReport();
            updateCircle({
              x: previewWidth / 2,
              y: 132,
            });
          }}
          style={({ pressed }) => [
            localStyles.resetButton,
            pressed && localStyles.resetButtonPressed,
          ]}
          testID="examples.pretext-react-native-example.reset"
        >
          <Text style={localStyles.resetButtonText}>Reset circle</Text>
        </Pressable>

        <View style={localStyles.panel}>
          <Text style={localStyles.panelTitle}>Automation report</Text>
          <Text selectable style={localStyles.code}>
            {report}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={localStyles.stat}>
      <Text style={localStyles.statLabel}>{label}</Text>
      <Text style={localStyles.statValue}>{value}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  automationReportAnchor: {
    color: "#f3eee5",
    fontSize: 1,
    height: 1,
    lineHeight: 1,
    overflow: "hidden",
  },
  body: {
    color: "#4f5b57",
    fontSize: 14,
    lineHeight: 20,
  },
  circle: {
    alignItems: "center",
    backgroundColor: "rgba(70, 132, 153, 0.18)",
    borderColor: "rgba(70, 132, 153, 0.48)",
    borderRadius: CIRCLE_RADIUS,
    borderWidth: 1,
    height: CIRCLE_RADIUS * 2,
    justifyContent: "center",
    position: "absolute",
    width: CIRCLE_RADIUS * 2,
    zIndex: 2,
  },
  circleCore: {
    backgroundColor: "rgba(70, 132, 153, 0.28)",
    borderRadius: CIRCLE_RADIUS - 10,
    height: (CIRCLE_RADIUS - 10) * 2,
    width: (CIRCLE_RADIUS - 10) * 2,
  },
  code: {
    backgroundColor: "#1f2725",
    borderRadius: 6,
    color: "#f5efe4",
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 16,
    padding: 12,
  },
  content: {
    gap: 12,
    padding: 20,
  },
  description: {
    color: "#4f5b57",
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridTarget: {
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    position: "absolute",
  },
  gridTargets: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  lineText: {
    color: "#1f2725",
    fontFamily: "System",
    fontSize: TEXT_STYLE.fontSize,
    includeFontPadding: true,
    lineHeight: LINE_HEIGHT,
    position: "absolute",
  },
  panel: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: {
    color: "#1f2725",
    fontSize: 15,
    fontWeight: "900",
  },
  preview: {
    backgroundColor: "#fffaf0",
    borderColor: "#d8d0c2",
    borderRadius: 8,
    borderWidth: 1,
    height: PREVIEW_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: "#1f2725",
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  resetButtonPressed: {
    opacity: 0.72,
  },
  resetButtonText: {
    color: "#fffaf0",
    fontSize: 14,
    fontWeight: "900",
  },
  route: {
    color: "#63706b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  screen: {
    backgroundColor: "#f3eee5",
    flex: 1,
  },
  stat: {
    backgroundColor: "#fffaf0",
    borderColor: "#e6ddcd",
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 100,
    padding: 12,
  },
  statLabel: {
    color: "#63706b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#1f2725",
    fontSize: 18,
    fontWeight: "900",
  },
  title: {
    color: "#1f2725",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
  },
});

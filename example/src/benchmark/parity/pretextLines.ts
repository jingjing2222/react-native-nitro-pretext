import {
  layout,
  prepare,
  type ParagraphLineRange,
} from "react-native-nitro-pretext";

import type { ParityCase, ParityLineSnapshot } from "./types";

const SHAPE_ROW_TOLERANCE = 0.5;
const SHAPE_GEOMETRY_TOLERANCE = 0.5;
const SHAPE_ORACLE_MULTI_SLOT_MISMATCH =
  "shape oracle expected same-row multi-slot output";
const SHAPE_ORACLE_CONTAINMENT_MISMATCH =
  "shape oracle expected lines to stay inside shape slices";

function clampTextRange(
  text: string,
  line: ParagraphLineRange,
): { end: number; start: number } {
  const start = Math.max(0, Math.min(text.length, Math.round(line.textStart)));
  const end = Math.max(start, Math.min(text.length, Math.round(line.textEnd)));

  return { end, start };
}

export function materializePretextParityLines(
  parityCase: ParityCase,
): ParityLineSnapshot[] {
  const prepared = prepare([parityCase.text], parityCase.style);

  try {
    const result = layout(prepared, {
      output: "lines",
      shapeSlices: parityCase.shapeSlices,
      width: parityCase.width,
    });
    const paragraph = result.paragraphs[0];

    return (paragraph?.lines ?? []).map((line) => {
      const range = clampTextRange(parityCase.text, line);

      return {
        geometry: {
          height: line.height,
          left: line.left,
          top: line.top,
          width: line.width,
        },
        text: parityCase.text.slice(range.start, range.end),
      };
    });
  } finally {
    prepared.release();
  }
}

function hasMultiSlotRow(lines: ParityLineSnapshot[]): boolean {
  for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
    const left = lines[leftIndex];
    if (!left) {
      continue;
    }

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < lines.length;
      rightIndex += 1
    ) {
      const right = lines[rightIndex];
      if (!right) {
        continue;
      }

      if (
        Math.abs(left.geometry.top - right.geometry.top) <=
          SHAPE_ROW_TOLERANCE &&
        Math.abs(left.geometry.left - right.geometry.left) > SHAPE_ROW_TOLERANCE
      ) {
        return true;
      }
    }
  }

  return false;
}

function createShapeOracleMismatch(text: string): ParityLineSnapshot[] {
  return [
    {
      geometry: {
        height: 0,
        left: 0,
        top: 0,
        width: 0,
      },
      text,
    },
  ];
}

function shapeSlicesForLineTop(
  shapeSlices: NonNullable<ParityCase["shapeSlices"]>,
  top: number,
): NonNullable<ParityCase["shapeSlices"]> {
  return shapeSlices.filter(
    (slice) =>
      top >= slice.top - SHAPE_ROW_TOLERANCE &&
      top < slice.top + slice.height - SHAPE_ROW_TOLERANCE,
  );
}

function isLineInsideAnyShapeSlice(
  line: ParityLineSnapshot,
  shapeSlices: NonNullable<ParityCase["shapeSlices"]>,
): boolean {
  const rowSlices = shapeSlicesForLineTop(shapeSlices, line.geometry.top);

  if (rowSlices.length === 0) {
    return true;
  }

  const lineLeft = line.geometry.left;
  const lineRight = line.geometry.left + line.geometry.width;

  return rowSlices
    .filter((slice) => slice.width > SHAPE_GEOMETRY_TOLERANCE)
    .some(
      (slice) =>
        lineLeft >= slice.left - SHAPE_GEOMETRY_TOLERANCE &&
        lineRight <= slice.left + slice.width + SHAPE_GEOMETRY_TOLERANCE,
    );
}

export function materializeShapeSliceParityOracleLines(
  parityCase: ParityCase,
  pretextLines: ParityLineSnapshot[],
): ParityLineSnapshot[] | null {
  const shapeSlices = parityCase.shapeSlices ?? [];
  if (shapeSlices.length === 0) {
    return null;
  }

  if (
    pretextLines.some((line) => !isLineInsideAnyShapeSlice(line, shapeSlices))
  ) {
    return createShapeOracleMismatch(SHAPE_ORACLE_CONTAINMENT_MISMATCH);
  }

  if (
    !hasMultiSlotRow(
      shapeSlices.map((slice) => ({
        geometry: {
          height: slice.height,
          left: slice.left,
          top: slice.top,
          width: slice.width,
        },
        text: "",
      })),
    )
  ) {
    return pretextLines;
  }

  if (hasMultiSlotRow(pretextLines)) {
    return pretextLines;
  }

  return createShapeOracleMismatch(SHAPE_ORACLE_MULTI_SLOT_MISMATCH);
}

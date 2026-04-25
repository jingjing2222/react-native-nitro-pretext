import { normalizeParityPlatform } from "./platform";
import type {
  ParityCase,
  ParityFirstDiff,
  ParityLineGeometry,
  ParityLineSnapshot,
  ParityMismatch,
  ParityMismatchKind,
} from "./types";

export const PARITY_GEOMETRY_TOLERANCE = 0.5;

function normalizeLineText(text: string): string {
  return text.replace(/\r?\n/gu, "").replace(/[ \t\u00a0]+$/gu, "");
}

function roundGeometryValue(value: number): number {
  return Number(value.toFixed(2));
}

function valuesDiffer(
  rnValue: number,
  pretextValue: number,
  tolerance: number,
): boolean {
  return Math.abs(rnValue - pretextValue) > tolerance;
}

function findLineTextDiff(
  rnLines: ParityLineSnapshot[],
  pretextLines: ParityLineSnapshot[],
): ParityFirstDiff | null {
  const count = Math.min(rnLines.length, pretextLines.length);

  for (let lineIndex = 0; lineIndex < count; lineIndex += 1) {
    const rnLine = rnLines[lineIndex];
    const pretextLine = pretextLines[lineIndex];
    if (!rnLine || !pretextLine) {
      continue;
    }

    const rnText = normalizeLineText(rnLine.text);
    const pretextText = normalizeLineText(pretextLine.text);
    if (rnText !== pretextText) {
      return {
        field: "text",
        lineIndex,
        pretextValue: pretextText,
        rnValue: rnText,
      };
    }
  }

  return null;
}

function findLineGeometryDiff(
  rnLines: ParityLineSnapshot[],
  pretextLines: ParityLineSnapshot[],
  tolerance: number,
): ParityFirstDiff | null {
  const fields: Array<keyof ParityLineGeometry> = [
    "left",
    "top",
    "width",
    "height",
  ];
  const count = Math.min(rnLines.length, pretextLines.length);

  for (let lineIndex = 0; lineIndex < count; lineIndex += 1) {
    const rnLine = rnLines[lineIndex];
    const pretextLine = pretextLines[lineIndex];
    if (!rnLine || !pretextLine) {
      continue;
    }

    for (const field of fields) {
      const rnValue = rnLine.geometry[field];
      const pretextValue = pretextLine.geometry[field];
      if (valuesDiffer(rnValue, pretextValue, tolerance)) {
        return {
          field,
          lineIndex,
          pretextValue: roundGeometryValue(pretextValue),
          rnValue: roundGeometryValue(rnValue),
        };
      }
    }
  }

  return null;
}

function createMismatch(
  parityCase: ParityCase,
  kind: ParityMismatchKind,
  firstDiff: ParityFirstDiff,
  rnLines: ParityLineSnapshot[],
  pretextLines: ParityLineSnapshot[],
): ParityMismatch {
  return {
    caseId: parityCase.caseId,
    category: parityCase.category,
    firstDiff,
    kind,
    platform: normalizeParityPlatform(),
    pretextLines,
    rnLines,
    style: parityCase.style,
    width: parityCase.width,
  };
}

export function compareParityCaseLines(
  parityCase: ParityCase,
  rnLines: ParityLineSnapshot[],
  pretextLines: ParityLineSnapshot[],
  geometryTolerance = PARITY_GEOMETRY_TOLERANCE,
): ParityMismatch[] {
  const mismatches: ParityMismatch[] = [];

  if (rnLines.length !== pretextLines.length) {
    mismatches.push(
      createMismatch(
        parityCase,
        "line-count",
        {
          field: "count",
          lineIndex: null,
          pretextValue: pretextLines.length,
          rnValue: rnLines.length,
        },
        rnLines,
        pretextLines,
      ),
    );
  }

  const textDiff = findLineTextDiff(rnLines, pretextLines);
  if (textDiff !== null) {
    mismatches.push(
      createMismatch(parityCase, "line-text", textDiff, rnLines, pretextLines),
    );
  }

  const geometryDiff = findLineGeometryDiff(
    rnLines,
    pretextLines,
    geometryTolerance,
  );
  if (geometryDiff !== null) {
    mismatches.push(
      createMismatch(
        parityCase,
        "line-geometry",
        geometryDiff,
        rnLines,
        pretextLines,
      ),
    );
  }

  return mismatches;
}

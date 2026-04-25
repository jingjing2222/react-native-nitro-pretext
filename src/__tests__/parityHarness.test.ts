import { describe, expect, it } from "@jest/globals";

import {
  createParityAutomationReport,
  serializeParityAutomationReport,
} from "../../example/src/benchmark/parity/automation";
import { compareParityCaseLines } from "../../example/src/benchmark/parity/comparator";
import { materializeShapeSliceParityOracleLines } from "../../example/src/benchmark/parity/pretextLines";
import {
  advanceParityLayoutObservation,
  createParityLayoutObservation,
} from "../../example/src/benchmark/parity/settling";
import type {
  ParityCase,
  ParityLineSnapshot,
} from "../../example/src/benchmark/parity/types";

const parityCase: ParityCase = {
  caseId: "unit-parity-001",
  category: "latin",
  description: "unit parity fixture",
  style: {
    fontFamily: "System",
    fontSize: 18,
    includeFontPadding: true,
    letterSpacing: 0,
    lineHeight: 28,
    locale: "",
    textDirection: "auto",
  },
  text: "Unit parity fixture text",
  width: 220,
};

const shapeParityCase: ParityCase = {
  ...parityCase,
  caseId: "unit-shape-001",
  category: "shape",
  shapeSlices: [
    { height: 28, left: 0, top: 0, width: 100 },
    { height: 28, left: 160, top: 0, width: 100 },
  ],
};

function createLine(
  text: string,
  overrides: Partial<ParityLineSnapshot["geometry"]> = {},
): ParityLineSnapshot {
  return {
    geometry: {
      height: 28,
      left: 0,
      top: 0,
      width: 120,
      ...overrides,
    },
    text,
  };
}

describe("RN Text parity harness contracts", () => {
  it("emits fixed mismatch schema for count, text, and geometry drift", () => {
    const mismatches = compareParityCaseLines(
      parityCase,
      [createLine("Unit parity"), createLine("fixture text", { top: 28 })],
      [createLine("Unit mismatch", { width: 130 })],
      0.5,
    );

    expect(mismatches.map((mismatch) => mismatch.kind)).toEqual([
      "line-count",
      "line-text",
      "line-geometry",
    ]);
    expect(mismatches[0]).toMatchObject({
      caseId: "unit-parity-001",
      category: "latin",
      firstDiff: {
        field: "count",
        lineIndex: null,
        pretextValue: 1,
        rnValue: 2,
      },
      width: 220,
    });
  });

  it("summarizes parity automation reports by mismatch kind", () => {
    const mismatches = compareParityCaseLines(
      parityCase,
      [createLine("Unit parity")],
      [createLine("Unit mismatch", { width: 130 })],
      0.5,
    );
    const report = createParityAutomationReport({
      caseCount: 1,
      completedAt: "10:00:00",
      results: [
        {
          caseId: parityCase.caseId,
          category: parityCase.category,
          errorMessage: null,
          mismatches,
          platform: "unknown",
        },
      ],
      status: "completed",
    });

    expect(report).toMatchObject({
      caseCount: 1,
      completedCases: 1,
      lineCountMismatches: 0,
      lineGeometryMismatches: 1,
      lineTextMismatches: 1,
      mismatchCount: 2,
      screen: "benchmark/parity",
      status: "completed",
    });
  });

  it("counts completed and failed cases by unique case id", () => {
    const report = createParityAutomationReport({
      caseCount: 2,
      completedAt: "10:00:00",
      results: [
        {
          caseId: parityCase.caseId,
          category: parityCase.category,
          errorMessage: null,
          mismatches: [],
          platform: "unknown",
        },
        {
          caseId: parityCase.caseId,
          category: parityCase.category,
          errorMessage: "duplicate layout event failed",
          mismatches: [],
          platform: "unknown",
        },
        {
          caseId: "unit-parity-002",
          category: parityCase.category,
          errorMessage: null,
          mismatches: [],
          platform: "unknown",
        },
      ],
      status: "completed",
    });

    expect(report).toMatchObject({
      caseCount: 2,
      completedCases: 2,
      failedCaseResults: [
        {
          caseId: parityCase.caseId,
          category: parityCase.category,
          errorMessage: "duplicate layout event failed",
          platform: "unknown",
        },
      ],
      failedCases: 1,
      mismatchCount: 0,
    });
  });

  it.each([
    ["hard newline", "Unit parity\n", "Unit parity"],
    ["trailing spaces", "Unit parity   ", "Unit parity"],
    ["tab", "Unit\tparity", "Unit parity"],
    ["nonbreaking space", "Unit parity\u00a0", "Unit parity"],
  ])("treats raw line text drift as mismatch: %s", (_, rnText, pretextText) => {
    const mismatches = compareParityCaseLines(
      parityCase,
      [createLine(rnText)],
      [createLine(pretextText)],
      0.5,
    );

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]).toMatchObject({
      firstDiff: {
        field: "text",
        lineIndex: 0,
        pretextValue: pretextText,
        rnValue: rnText,
      },
      kind: "line-text",
    });
  });

  it("counts duplicate result mismatches as observed", () => {
    const mismatches = compareParityCaseLines(
      parityCase,
      [createLine("Unit parity")],
      [createLine("Unit mismatch", { width: 130 })],
      0.5,
    );
    const report = createParityAutomationReport({
      caseCount: 1,
      completedAt: "10:00:00",
      results: [
        {
          caseId: parityCase.caseId,
          category: parityCase.category,
          errorMessage: null,
          mismatches,
          platform: "unknown",
        },
        {
          caseId: parityCase.caseId,
          category: parityCase.category,
          errorMessage: null,
          mismatches,
          platform: "unknown",
        },
      ],
      status: "completed",
    });

    expect(report).toMatchObject({
      completedCases: 1,
      lineGeometryMismatches: 2,
      lineTextMismatches: 2,
      mismatchCount: 4,
    });
    expect(report.mismatches.map((mismatch) => mismatch.kind)).toEqual([
      "line-text",
      "line-geometry",
      "line-text",
      "line-geometry",
    ]);
  });

  it("settles only after the latest RN line snapshot is stable", () => {
    const firstObservation = createParityLayoutObservation({
      caseId: parityCase.caseId,
      eventVersion: 1,
      lines: [createLine("first layout")],
    });
    const firstTick = advanceParityLayoutObservation(firstObservation);
    expect(firstTick.isStable).toBe(false);

    const finalObservation = createParityLayoutObservation({
      caseId: parityCase.caseId,
      eventVersion: 2,
      lines: [createLine("final layout")],
    });
    const finalTickOne = advanceParityLayoutObservation(finalObservation);
    const finalTickTwo = advanceParityLayoutObservation(
      finalTickOne.observation,
    );

    expect(finalTickTwo).toMatchObject({
      isStable: true,
      observation: {
        eventVersion: 2,
        lines: [createLine("final layout")],
        stableFrames: 2,
      },
    });
  });

  it("uses structural same-row oracle for shape slice parity cases", () => {
    const multiSlotLines = [
      createLine("left slot", { width: 90 }),
      createLine("right slot", { left: 160, width: 70 }),
    ];
    const staleSingleSlotLines = [
      createLine("left slot", { width: 90 }),
      createLine("next row", { top: 28, width: 90 }),
    ];

    expect(
      materializeShapeSliceParityOracleLines(shapeParityCase, multiSlotLines),
    ).toEqual(multiSlotLines);
    expect(
      materializeShapeSliceParityOracleLines(
        shapeParityCase,
        staleSingleSlotLines,
      ),
    ).toEqual([
      {
        geometry: {
          height: 0,
          left: 0,
          top: 0,
          width: 0,
        },
        text: "shape oracle expected same-row multi-slot output",
      },
    ]);
  });

  it("rejects shape slice lines that cross blocked gaps", () => {
    const intrudingLines = [
      createLine("left slot crosses gap", { width: 130 }),
      createLine("right slot", { left: 160, width: 70 }),
    ];

    expect(
      materializeShapeSliceParityOracleLines(shapeParityCase, intrudingLines),
    ).toEqual([
      {
        geometry: {
          height: 0,
          left: 0,
          top: 0,
          width: 0,
        },
        text: "shape oracle expected lines to stay inside shape slices",
      },
    ]);
  });

  it("serializes parity reports with grouped mismatch transport", () => {
    const mismatches = compareParityCaseLines(
      parityCase,
      [createLine("Unit parity")],
      [createLine("Unit mismatch", { width: 130 })],
      0.5,
    );
    const report = createParityAutomationReport({
      caseCount: 1,
      completedAt: "10:00:00",
      results: [
        {
          caseId: parityCase.caseId,
          category: parityCase.category,
          errorMessage: null,
          mismatches,
          platform: "unknown",
        },
      ],
      status: "completed",
    });
    const serialized = serializeParityAutomationReport(report);
    const transport = JSON.parse(serialized.slice(serialized.indexOf("{")));

    expect(transport.mismatches).toBeUndefined();
    expect(transport.mismatchGroups).toEqual([
      expect.objectContaining({
        caseId: "unit-parity-001",
        mismatches: [
          expect.objectContaining({ kind: "line-text" }),
          expect.objectContaining({ kind: "line-geometry" }),
        ],
      }),
    ]);
  });
});

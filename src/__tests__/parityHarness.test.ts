import { describe, expect, it } from "@jest/globals";

import {
  createParityAutomationReport,
  serializeParityAutomationReport,
} from "../../example/src/benchmark/parity/automation";
import { compareParityCaseLines } from "../../example/src/benchmark/parity/comparator";
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
      failedCases: 1,
      mismatchCount: 0,
    });
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

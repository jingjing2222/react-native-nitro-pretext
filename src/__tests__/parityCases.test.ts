import { describe, expect, it } from "@jest/globals";

import {
  PARITY_CASE_DISTRIBUTION,
  PARITY_CASES,
} from "../../example/src/benchmark/parity/cases";
import type { ParityCaseCategory } from "../../example/src/benchmark/parity/types";

function countByCategory(): Record<ParityCaseCategory, number> {
  return PARITY_CASES.reduce(
    (counts, parityCase) => ({
      ...counts,
      [parityCase.category]: (counts[parityCase.category] ?? 0) + 1,
    }),
    {} as Record<ParityCaseCategory, number>,
  );
}

describe("RN Text parity corpus", () => {
  it("contains 240 unique parity cases", () => {
    expect(PARITY_CASES).toHaveLength(240);
    expect(
      new Set(PARITY_CASES.map((parityCase) => parityCase.caseId)).size,
    ).toBe(240);
  });

  it("matches the fixed category distribution", () => {
    expect(countByCategory()).toEqual(PARITY_CASE_DISTRIBUTION);
  });

  it("keeps every case as a single width/style contract", () => {
    const signatures = new Set(
      PARITY_CASES.map((parityCase) =>
        JSON.stringify({
          style: parityCase.style,
          text: parityCase.text,
          width: parityCase.width,
        }),
      ),
    );

    expect(signatures.size).toBe(240);
    for (const parityCase of PARITY_CASES) {
      expect(parityCase.width).toBeGreaterThan(0);
      expect(parityCase.style).toBeTruthy();
      expect(parityCase.text.length).toBeGreaterThan(0);
    }
  });

  it("keeps iOS TextKit style regression cases in the corpus", () => {
    const casesById = new Map(
      PARITY_CASES.map((parityCase) => [parityCase.caseId, parityCase]),
    );

    expect(casesById.get("parity-latin-001")?.style.letterSpacing).toBe(0);
    expect(casesById.get("parity-style-007")).toMatchObject({
      style: { fontFamily: "monospace" },
      width: 260,
    });
    expect(casesById.get("parity-style-008")).toMatchObject({
      style: { fontFamily: "serif" },
      width: 340,
    });
    expect(casesById.get("parity-style-009")).toMatchObject({
      style: { textDirection: "rtl" },
      width: 228,
    });
  });
});

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

function textsForCategory(category: ParityCaseCategory): string[] {
  return PARITY_CASES.filter(
    (parityCase) => parityCase.category === category,
  ).map((parityCase) => parityCase.text);
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

  it("does not inflate uniqueness with generated suffix text", () => {
    const corpusText = PARITY_CASES.map((parityCase) => parityCase.text).join(
      "\n",
    );

    expect(corpusText).not.toContain("keeps this fixture unique");
    expect(corpusText).not.toMatch(/Case \d+ keeps/);
  });

  it("keeps strict raw whitespace and newline fixtures", () => {
    const whitespaceTexts = textsForCategory("whitespace");

    expect(whitespaceTexts.some((text) => text.endsWith("   "))).toBe(true);
    expect(whitespaceTexts.some((text) => text.endsWith("\t\t"))).toBe(true);
    expect(whitespaceTexts.some((text) => text.includes("\t"))).toBe(true);
    expect(whitespaceTexts.some((text) => text.includes("\u00a0"))).toBe(true);
    expect(whitespaceTexts.some((text) => text.includes("\n\n"))).toBe(true);
    expect(whitespaceTexts.some((text) => text.endsWith("\n"))).toBe(true);
  });

  it("keeps category-specific hard cases without suffix inflation", () => {
    const thaiTexts = textsForCategory("thai");
    const rtlTexts = textsForCategory("rtl");
    const indicTexts = textsForCategory("indic");
    const emojiTexts = textsForCategory("emoji");

    expect(thaiTexts.some((text) => /[๐-๙]/u.test(text))).toBe(true);
    expect(thaiTexts.every((text) => !/Case \d+ keeps/u.test(text))).toBe(true);
    expect(rtlTexts.some((text) => /[\u0590-\u05ff]/u.test(text))).toBe(true);
    expect(rtlTexts.some((text) => /[\u0600-\u06ff]/u.test(text))).toBe(true);
    expect(indicTexts.some((text) => /[\u0900-\u097f]/u.test(text))).toBe(true);
    expect(indicTexts.some((text) => /[\u0b80-\u0bff]/u.test(text))).toBe(true);
    expect(indicTexts.some((text) => /[\u0c00-\u0c7f]/u.test(text))).toBe(true);
    expect(emojiTexts.some((text) => text.includes("\u200d"))).toBe(true);
    expect(
      emojiTexts.some((text) => /\p{Regional_Indicator}/u.test(text)),
    ).toBe(true);
    expect(emojiTexts.some((text) => /[\u{1f3fb}-\u{1f3ff}]/u.test(text))).toBe(
      true,
    );
    expect(emojiTexts.some((text) => text.includes("\ufe0f"))).toBe(true);
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

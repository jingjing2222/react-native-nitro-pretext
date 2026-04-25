import {
  layout,
  prepare,
  type ParagraphLineRange,
} from "react-native-nitro-pretext";

import type { ParityCase, ParityLineSnapshot } from "./types";

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

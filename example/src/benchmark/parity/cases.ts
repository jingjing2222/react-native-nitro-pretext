import type { ParityCase } from "./types";

export const PARITY_BASE_STYLE = {
  fontFamily: "System",
  fontSize: 18,
  includeFontPadding: true,
  letterSpacing: 0,
  lineHeight: 28,
  locale: "",
  textDirection: "auto",
} as const;

export const PARITY_CASES: ParityCase[] = [
  {
    caseId: "parity-smoke-latin-001",
    category: "latin",
    description: "Latin prose with spaces and punctuation.",
    rnTextProps: {
      android_hyphenationFrequency: "none",
      lineBreakStrategyIOS: "none",
      textBreakStrategy: "highQuality",
    },
    style: PARITY_BASE_STYLE,
    text: "The quick layout contract wraps ordinary React Native text before render.",
    width: 220,
  },
  {
    caseId: "parity-smoke-korean-001",
    category: "korean-cjk",
    description: "Korean and English mixed text.",
    rnTextProps: {
      android_hyphenationFrequency: "none",
      lineBreakStrategyIOS: "none",
      textBreakStrategy: "highQuality",
    },
    style: PARITY_BASE_STYLE,
    text: "한국어와 English 문장이 같은 줄에서 자연스럽게 접히는지 확인한다.",
    width: 240,
  },
  {
    caseId: "parity-smoke-emoji-001",
    category: "emoji",
    description: "Emoji fallback and ZWJ smoke case.",
    rnTextProps: {
      android_hyphenationFrequency: "none",
      lineBreakStrategyIOS: "none",
      textBreakStrategy: "highQuality",
    },
    style: PARITY_BASE_STYLE,
    text: "Status cards include emoji 🙂 and family sequences 👨‍👩‍👧‍👦 near wraps.",
    width: 260,
  },
];

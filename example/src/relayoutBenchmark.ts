import {
  layoutParagraphs,
  layoutParagraphsMetadata,
  prepareParagraphsWithStats,
  releaseParagraphs,
  type LaidOutParagraph,
  type LaidOutParagraphMetrics,
  type ParagraphStyle,
  type PrepareParagraphStats,
  type PreparedParagraphState,
} from "react-native-nitro-pretext";

export const BENCHMARK_PARAGRAPH_COUNT = 48;
export const BENCHMARK_SAMPLE_SIZE = 8;
export const BENCHMARK_WARMUP_RUNS = 5;
export const BENCHMARK_MEASURED_RUNS = 30;

export const BENCHMARK_STYLE: ParagraphStyle = {
  fontFamily: "System",
  fontSize: 18,
  lineHeight: 28,
  letterSpacing: 0,
  locale: "ko-KR",
};

export type BenchmarkMode = "baseline" | "pretext-render" | "pretext-compute";
export type PreparedParagraph = PreparedParagraphState;
export type PreparedParagraphPrepareStats = PrepareParagraphStats;
export type PreparedParagraphMetrics = LaidOutParagraphMetrics;

const CORPUS_LEADS = [
  "회의 직전에 카드 폭이 바뀌면 문단이 다시 접히는지 바로 보여줘야 한다.",
  "이 화면은 prepare once, layout many 가 실제로 이득인지 확인하는 용도다.",
  "같은 문단을 여러 폭으로 반복 relayout 할 때 병목이 엔진인지 렌더러인지 분리해서 보고 싶다.",
  "지금 단계에서는 완전한 native paragraph view 보다 width 변화 배치의 hot path 를 먼저 보는 편이 맞다.",
  "벤치 기준은 첫 mount 가 아니라 폭 변경 한 번당 총비용과 jank 여부다.",
  "줄마다 노드를 쪼개면 line breaker 비교가 아니라 view count 비교가 되기 때문에 이번 PoC 에서는 제외한다.",
  "measureBatch 를 한 번에 호출하고 JS 에서 greedy break 를 반복하면 prepare 과 layout 비용을 분리하기 쉽다.",
  "같은 폰트와 같은 style 로 corpus 를 고정해 두어야 baseline 과 pretext 결과를 공정하게 읽을 수 있다.",
];

const CORPUS_MIDDLES = [
  "The resize loop keeps the same paragraph body, swaps only the target width, and records a full interaction boundary.",
  "Each measured pass waits for every paragraph to report layout so the result stays tied to what the user would actually feel.",
  "A separate compute-only mode helps answer whether the string materialization or React render path is eating the expected win.",
  "The benchmark stays boring on purpose: same corpus, same typography, same container shape, different line breaking owner.",
  "If layoutOnly wins but interaction stays flat, the next question shifts from paragraph math to rendering strategy.",
  "If both numbers lose, plain React Native Text is probably already good enough for this static paragraph workload.",
];

const CORPUS_TAILS = [
  "한국어와 English 를 조금 섞고 emoji 도 넣어서 실제 앱 문단에 가까운 입력으로 맞춘다. 🙂",
  "실패 신호도 명확하다. hot layout 이 비슷하거나 느리면 이 방향은 특수 케이스 전용으로 남긴다. 🚧",
  "성공이면 prepare 비용이 몇 번의 width change 안에서 상쇄되는지 바로 계산할 수 있다. 📈",
  "중간 결과는 median 과 p95, 그리고 20ms 를 넘긴 frame 개수로 정리한다. ⏱️",
  "첫 단계에서는 정확도 100% 보다 prepare and relayout 패턴이 의미 있는지 보는 쪽이 우선이다. 🧪",
  "이 정도만 해도 다음 단계에서 native paragraph view 가 필요한지 판단할 근거가 생긴다. 🧭",
];

export const BENCHMARK_CORPUS = Array.from(
  { length: BENCHMARK_PARAGRAPH_COUNT },
  (_, index) => {
    const lead = CORPUS_LEADS[index % CORPUS_LEADS.length];
    const middle = CORPUS_MIDDLES[(index * 2) % CORPUS_MIDDLES.length];
    const followUp = CORPUS_LEADS[(index + 3) % CORPUS_LEADS.length];
    const tail = CORPUS_TAILS[(index * 3) % CORPUS_TAILS.length];
    const runLabel = `Run ${String(index + 1).padStart(2, "0")} keeps the same body and rotates widths in a fixed sequence.`;

    return [lead, middle, followUp, runLabel, tail].join(" ");
  },
);

export function createWidthSequence(availableWidth: number): number[] {
  const baseSequence = [340, 300, 260, 220, 280, 320];
  const clamped = baseSequence.map((width) =>
    Math.max(180, Math.min(width, availableWidth)),
  );
  const unique = Array.from(new Set(clamped));

  if (unique.length >= 3) {
    return unique;
  }

  return Array.from(
    new Set(
      [
        availableWidth,
        availableWidth - 12,
        availableWidth - 24,
        availableWidth - 40,
      ].map((width) => Math.max(180, Math.min(width, availableWidth))),
    ),
  );
}

export function now(): number {
  const perf = globalThis as { performance?: { now: () => number } };
  return perf.performance?.now() ?? Date.now();
}

export function prepareCorpusPoC(texts: string[]): {
  prepareMs: number;
  prepareStats: PrepareParagraphStats;
  prepared: PreparedParagraphState;
} {
  const result = prepareParagraphsWithStats(texts, BENCHMARK_STYLE);

  return {
    prepareMs: result.stats.totalMs,
    prepareStats: result.stats,
    prepared: result.prepared,
  };
}

export function layoutCorpusPoC(
  prepared: PreparedParagraphState,
  maxWidth: number,
): {
  layoutOnlyMs: number;
  paragraphs: LaidOutParagraph[];
} {
  const startedAt = now();
  const paragraphs = layoutParagraphs(prepared.id, maxWidth);

  return {
    layoutOnlyMs: now() - startedAt,
    paragraphs,
  };
}

export function layoutCorpusMetadataPoC(
  prepared: PreparedParagraphState,
  maxWidth: number,
): {
  layoutOnlyMs: number;
  paragraphs: LaidOutParagraphMetrics[];
} {
  const startedAt = now();
  const paragraphs = layoutParagraphsMetadata(prepared.id, maxWidth);

  return {
    layoutOnlyMs: now() - startedAt,
    paragraphs,
  };
}

export function disposePreparedCorpusPoC(
  prepared: PreparedParagraphState,
): void {
  releaseParagraphs(prepared.id);
}

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const left = sorted[middle - 1];
    const right = sorted[middle];
    if (left === undefined || right === undefined) {
      return null;
    }

    return (left + right) / 2;
  }

  return sorted[middle] ?? null;
}

export function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );

  return sorted[index] ?? null;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

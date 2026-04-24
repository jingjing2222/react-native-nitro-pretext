import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useWindowDimensions } from "react-native";

import { MODE_LABELS, PARAGRAPH_HORIZONTAL_PADDING } from "./constants";
import {
  BENCHMARK_CORPUS,
  BENCHMARK_STYLE,
  BENCHMARK_MEASURED_RUNS,
  BENCHMARK_WARMUP_RUNS,
  createWidthSequence,
  layoutBenchmarkCorpusDiagnostics,
  layoutBenchmarkCorpusMetadata,
  layoutBenchmarkCorpusSampleLineTexts,
  now,
  type PretextParagraphMetrics,
} from "../relayoutBenchmark";
import {
  beginJankTracker,
  buildSummary,
  compareLineParity,
} from "./harnessUtils";
import {
  createBenchmarkDiagnostics,
  createBenchmarkDiagnosticsFromNative,
} from "./diagnostics";
import {
  createSummaryRecord,
  type BenchmarkHarnessArgs,
  type ModeRunMetric,
  type RunStatus,
  type SummaryRecord,
} from "./types";

type PretextLayoutRenderPass = {
  expectedParagraphs: number;
  seenParagraphs: Set<number>;
  startedAt: number;
  resolve: (observation: { interactionMs: number; jankCount: number }) => void;
  stopJankTracking: () => number;
};

type PretextLayoutHarnessState = {
  activeMode: "pretext-render" | "pretext-compute";
  handleParagraphLayout: (index: number) => void;
  isRunning: boolean;
  lastCompletedAt: string | null;
  paragraphMetrics: PretextParagraphMetrics[];
  paragraphWidth: number;
  runBenchmarkSuite: () => Promise<void>;
  runStatus: RunStatus;
  summaries: SummaryRecord;
  totalRuns: number;
  widthSequence: number[];
};

const EMPTY_PARAGRAPH_METRIC: PretextParagraphMetrics = {
  lineCount: 1,
  height: BENCHMARK_STYLE.lineHeight ?? BENCHMARK_STYLE.fontSize,
  maxLineWidth: 0,
};

function createEmptyParagraphMetrics(): PretextParagraphMetrics[] {
  return BENCHMARK_CORPUS.map(() => EMPTY_PARAGRAPH_METRIC);
}

export function usePretextLayoutBenchmarkHarness({
  baselineInteractionMedianMs,
  baselineSampleLineCountsByWidth,
  baselineSampleLineTextsByWidth,
  initialCompletedAt,
  initialSummaries,
  onCompleted,
  prepareMs,
  preparedParagraphs,
}: Omit<BenchmarkHarnessArgs, "modes">): PretextLayoutHarnessState {
  const { width: windowWidth } = useWindowDimensions();
  const availableParagraphWidth = Math.max(220, windowWidth - 48);
  const widthSequence = useMemo(
    () => createWidthSequence(availableParagraphWidth),
    [availableParagraphWidth],
  );
  const initialParagraphWidth = widthSequence[widthSequence.length - 1] ?? 220;
  const totalRuns = BENCHMARK_WARMUP_RUNS + BENCHMARK_MEASURED_RUNS;
  const [paragraphMetrics, setParagraphMetrics] = useState<
    PretextParagraphMetrics[]
  >(createEmptyParagraphMetrics);
  const [paragraphWidth, setParagraphWidth] = useState<number>(
    initialParagraphWidth,
  );
  const [activeMode, setActiveMode] = useState<
    "pretext-render" | "pretext-compute"
  >("pretext-render");
  const [summaries, setSummaries] = useState(() =>
    createSummaryRecord(initialSummaries),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(
    initialCompletedAt,
  );
  const [runStatus, setRunStatus] = useState<RunStatus>({
    mode: null,
    runIndex: 0,
    totalRuns,
    width: initialParagraphWidth,
    label: "Ready",
  });
  const activeRenderPassRef = useRef<PretextLayoutRenderPass | null>(null);
  const sampleLineTextsByWidth = useMemo(() => {
    if (!preparedParagraphs) {
      return {};
    }

    return Object.fromEntries(
      widthSequence.map((width) => {
        const layoutWidth = Math.max(
          1,
          width - PARAGRAPH_HORIZONTAL_PADDING * 2,
        );

        return [
          width,
          layoutBenchmarkCorpusSampleLineTexts(preparedParagraphs, layoutWidth),
        ];
      }),
    ) as Record<number, string[][]>;
  }, [preparedParagraphs, widthSequence]);

  useEffect(() => {
    if (isRunning) {
      return;
    }

    const nextWidth = widthSequence[widthSequence.length - 1] ?? 220;
    setParagraphWidth(nextWidth);
  }, [isRunning, widthSequence]);

  useEffect(() => {
    if (isRunning || !preparedParagraphs) {
      return;
    }

    const layoutWidth = Math.max(
      1,
      initialParagraphWidth - PARAGRAPH_HORIZONTAL_PADDING * 2,
    );
    const preview = layoutBenchmarkCorpusMetadata(
      preparedParagraphs,
      layoutWidth,
    );
    setParagraphMetrics(preview.paragraphs);
    setParagraphWidth(initialParagraphWidth);
  }, [initialParagraphWidth, isRunning, preparedParagraphs]);

  const handleParagraphLayout = useCallback((index: number) => {
    const activeRenderPass = activeRenderPassRef.current;
    if (!activeRenderPass || activeRenderPass.seenParagraphs.has(index)) {
      return;
    }

    activeRenderPass.seenParagraphs.add(index);

    if (
      activeRenderPass.seenParagraphs.size < activeRenderPass.expectedParagraphs
    ) {
      return;
    }

    const interactionMs = now() - activeRenderPass.startedAt;
    const stopJankTracking = activeRenderPass.stopJankTracking;
    const resolve = activeRenderPass.resolve;
    activeRenderPassRef.current = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve({
          interactionMs,
          jankCount: stopJankTracking(),
        });
      });
    });
  }, []);

  const measureRenderInteraction = useCallback(
    (
      width: number,
      nextParagraphMetrics: PretextParagraphMetrics[],
      startedAt: number,
    ) =>
      new Promise<{
        interactionMs: number;
        jankCount: number;
      }>((resolve) => {
        activeRenderPassRef.current = {
          expectedParagraphs: 1,
          seenParagraphs: new Set<number>(),
          startedAt,
          resolve,
          stopJankTracking: beginJankTracker(),
        };

        startTransition(() => {
          setActiveMode("pretext-render");
          setParagraphWidth(width);
          setParagraphMetrics(nextParagraphMetrics);
        });
      }),
    [],
  );

  const runBenchmarkSuite = useCallback(async () => {
    if (isRunning || !preparedParagraphs || prepareMs === null) {
      return;
    }

    setIsRunning(true);
    setLastCompletedAt(null);
    setSummaries(createSummaryRecord());

    const nextSummaries = createSummaryRecord();
    const modes: Array<"pretext-render" | "pretext-compute"> = [
      "pretext-render",
      "pretext-compute",
    ];
    const baselineMedianMs = baselineInteractionMedianMs;

    try {
      for (const mode of modes) {
        const modeMetrics: ModeRunMetric[] = [];

        for (let runIndex = 0; runIndex < totalRuns; runIndex += 1) {
          const width = widthSequence[runIndex % widthSequence.length] ?? 220;
          const phaseLabel =
            runIndex < BENCHMARK_WARMUP_RUNS ? "Warmup" : "Measured";
          const interactionStartedAt = now();
          setRunStatus({
            mode,
            runIndex: runIndex + 1,
            totalRuns,
            width,
            label: `${MODE_LABELS[mode]} · ${phaseLabel}`,
          });

          const layoutWidth = Math.max(
            1,
            width - PARAGRAPH_HORIZONTAL_PADDING * 2,
          );
          const layoutResult = layoutBenchmarkCorpusMetadata(
            preparedParagraphs,
            layoutWidth,
          );
          const expectedLineCounts = layoutResult.paragraphs.map(
            (paragraph) => paragraph.lineCount,
          );
          const expectedLineTexts = sampleLineTextsByWidth[width] ?? null;
          const interaction =
            mode === "pretext-render"
              ? await measureRenderInteraction(
                  width,
                  layoutResult.paragraphs,
                  interactionStartedAt,
                )
              : {
                  interactionMs: layoutResult.layoutOnlyMs,
                  jankCount: 0,
                };

          if (runIndex < BENCHMARK_WARMUP_RUNS) {
            continue;
          }

          const parity = compareLineParity(
            baselineSampleLineCountsByWidth?.[width],
            expectedLineCounts,
            baselineSampleLineTextsByWidth?.[width],
            expectedLineTexts,
          );

          modeMetrics.push({
            interactionMs: interaction.interactionMs,
            layoutOnlyMs: layoutResult.layoutOnlyMs,
            jankCount: interaction.jankCount,
            lineTextParityChecks: parity.lineTextParityChecks,
            lineTextParityMismatches: parity.lineTextParityMismatches,
            parityMismatches: parity.parityMismatches,
            parityChecks: parity.parityChecks,
          });
        }

        const summaryLayoutWidths = widthSequence.map((width) =>
          Math.max(1, width - PARAGRAPH_HORIZONTAL_PADDING * 2),
        );
        const summaryDiagnostics =
          preparedParagraphs === null
            ? createBenchmarkDiagnostics(mode)
            : createBenchmarkDiagnosticsFromNative(
                mode,
                layoutBenchmarkCorpusDiagnostics(
                  preparedParagraphs,
                  summaryLayoutWidths,
                ),
              );
        const summary = buildSummary(
          modeMetrics,
          prepareMs,
          baselineMedianMs,
          summaryDiagnostics,
        );
        nextSummaries[mode] = summary;
        setSummaries(createSummaryRecord(nextSummaries));
      }

      const completedAt = new Date().toLocaleTimeString("ko-KR", {
        hour12: false,
      });
      setRunStatus({
        mode: null,
        runIndex: totalRuns,
        totalRuns,
        width: paragraphWidth,
        label: "Benchmark complete",
      });
      setLastCompletedAt(completedAt);
      setActiveMode("pretext-render");

      onCompleted({
        completedAt,
        summaries: createSummaryRecord(nextSummaries),
      });
    } finally {
      setIsRunning(false);
      activeRenderPassRef.current = null;
    }
  }, [
    baselineInteractionMedianMs,
    baselineSampleLineCountsByWidth,
    baselineSampleLineTextsByWidth,
    isRunning,
    measureRenderInteraction,
    onCompleted,
    paragraphWidth,
    prepareMs,
    preparedParagraphs,
    sampleLineTextsByWidth,
    totalRuns,
    widthSequence,
  ]);

  return {
    activeMode,
    handleParagraphLayout,
    isRunning,
    lastCompletedAt,
    paragraphMetrics,
    paragraphWidth,
    runBenchmarkSuite,
    runStatus,
    summaries,
    totalRuns,
    widthSequence,
  };
}

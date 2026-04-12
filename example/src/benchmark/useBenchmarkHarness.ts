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
  BENCHMARK_MEASURED_RUNS,
  BENCHMARK_PARAGRAPH_COUNT,
  BENCHMARK_SAMPLE_SIZE,
  BENCHMARK_WARMUP_RUNS,
  createWidthSequence,
  layoutCorpusPoC,
  layoutCorpusMetadataPoC,
  now,
} from "../relayoutBenchmark";
import {
  beginJankTracker,
  buildSummary,
  compareLineCounts,
} from "./harnessUtils";
import {
  createSummaryRecord,
  type ActiveRenderPass,
  type BenchmarkHarnessArgs,
  type BenchmarkHarnessState,
  type ModeRunMetric,
  type RunStatus,
} from "./types";

export function useBenchmarkHarness({
  baselineInteractionMedianMs,
  baselineSampleLineCountsByWidth,
  initialCompletedAt,
  initialSummaries,
  modes,
  onCompleted,
  prepareMs,
  preparedParagraphs,
}: BenchmarkHarnessArgs): BenchmarkHarnessState {
  const { width: windowWidth } = useWindowDimensions();
  const availableParagraphWidth = Math.max(220, windowWidth - 48);
  const widthSequence = useMemo(
    () => createWidthSequence(availableParagraphWidth),
    [availableParagraphWidth],
  );
  const initialParagraphWidth = widthSequence[widthSequence.length - 1] ?? 220;
  const totalRuns = BENCHMARK_WARMUP_RUNS + BENCHMARK_MEASURED_RUNS;
  const [renderedParagraphs, setRenderedParagraphs] =
    useState<string[]>(BENCHMARK_CORPUS);
  const [paragraphWidth, setParagraphWidth] = useState<number>(
    initialParagraphWidth,
  );
  const [activeMode, setActiveMode] = useState(modes[0] ?? "baseline");
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
  const activeRenderPassRef = useRef<ActiveRenderPass | null>(null);
  const baselineParityRef = useRef<Map<number, number[]>>(new Map());

  useEffect(() => {
    if (isRunning) {
      return;
    }

    const nextWidth = widthSequence[widthSequence.length - 1] ?? 220;
    setParagraphWidth(nextWidth);
  }, [isRunning, widthSequence]);

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
    const sampleLineCounts = [...activeRenderPass.sampleLineCounts];
    const stopJankTracking = activeRenderPass.stopJankTracking;
    const resolve = activeRenderPass.resolve;
    activeRenderPassRef.current = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve({
          interactionMs,
          jankCount: stopJankTracking(),
          sampleLineCounts,
        });
      });
    });
  }, []);

  const handleParagraphTextLayout = useCallback(
    (index: number, lineCount: number) => {
      const activeRenderPass = activeRenderPassRef.current;
      if (!activeRenderPass || index >= BENCHMARK_SAMPLE_SIZE) {
        return;
      }

      activeRenderPass.sampleLineCounts[index] = lineCount;
    },
    [],
  );

  const measureInteraction = useCallback(
    (
      mode: typeof activeMode,
      width: number,
      texts: string[],
      startedAt: number,
    ) =>
      new Promise<{
        interactionMs: number;
        jankCount: number;
        sampleLineCounts: number[];
      }>((resolve) => {
        activeRenderPassRef.current = {
          expectedParagraphs: BENCHMARK_PARAGRAPH_COUNT,
          sampleLineCounts: Array<number>(BENCHMARK_SAMPLE_SIZE).fill(0),
          seenParagraphs: new Set<number>(),
          startedAt,
          resolve,
          stopJankTracking: beginJankTracker(),
        };

        startTransition(() => {
          setActiveMode(mode);
          setParagraphWidth(width);
          setRenderedParagraphs(texts);
        });
      }),
    [],
  );

  const runBenchmarkSuite = useCallback(async () => {
    const needsPreparedParagraphs = modes.some((mode) => mode !== "baseline");
    if (
      isRunning ||
      (needsPreparedParagraphs && (!preparedParagraphs || prepareMs === null))
    ) {
      return;
    }

    setIsRunning(true);
    setLastCompletedAt(null);
    baselineParityRef.current.clear();
    setSummaries(createSummaryRecord());

    const nextSummaries = createSummaryRecord();
    let baselineMedianMs = baselineInteractionMedianMs;

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

          let layoutOnlyMs: number | null = null;
          let expectedLineCounts: number[] | null = null;
          let renderTexts = BENCHMARK_CORPUS;
          const layoutWidth = Math.max(
            1,
            width - PARAGRAPH_HORIZONTAL_PADDING * 2,
          );

          if (mode === "pretext-render") {
            const layoutResult = layoutCorpusPoC(
              preparedParagraphs!,
              layoutWidth,
            );
            layoutOnlyMs = layoutResult.layoutOnlyMs;
            expectedLineCounts = layoutResult.paragraphs.map(
              (paragraph) => paragraph.lineCount,
            );
            renderTexts = layoutResult.paragraphs.map(
              (paragraph) => paragraph.brokenText,
            );
          }

          if (mode === "pretext-compute") {
            const layoutResult = layoutCorpusMetadataPoC(
              preparedParagraphs!,
              layoutWidth,
            );
            layoutOnlyMs = layoutResult.layoutOnlyMs;
            expectedLineCounts = layoutResult.paragraphs.map(
              (paragraph) => paragraph.lineCount,
            );
          }

          const interaction = await measureInteraction(
            mode,
            width,
            renderTexts,
            interactionStartedAt,
          );

          if (mode === "baseline") {
            baselineParityRef.current.set(width, interaction.sampleLineCounts);
          }

          if (runIndex < BENCHMARK_WARMUP_RUNS) {
            continue;
          }

          const parity = compareLineCounts(
            mode === "baseline"
              ? undefined
              : (baselineSampleLineCountsByWidth?.[width] ??
                  baselineParityRef.current.get(width)),
            expectedLineCounts,
          );

          modeMetrics.push({
            interactionMs: interaction.interactionMs,
            layoutOnlyMs,
            jankCount: interaction.jankCount,
            parityMismatches: parity.parityMismatches,
            parityChecks: parity.parityChecks,
          });
        }

        const summary = buildSummary(
          modeMetrics,
          prepareMs ?? 0,
          baselineMedianMs,
        );
        nextSummaries[mode] = summary;
        setSummaries(createSummaryRecord(nextSummaries));

        if (mode === "baseline") {
          baselineMedianMs = summary.interactionMedianMs;
        }
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

      onCompleted({
        completedAt,
        sampleLineCountsByWidth: modes.includes("baseline")
          ? Object.fromEntries(baselineParityRef.current)
          : undefined,
        summaries: createSummaryRecord(nextSummaries),
      });
    } finally {
      setIsRunning(false);
      activeRenderPassRef.current = null;
    }
  }, [
    baselineInteractionMedianMs,
    baselineSampleLineCountsByWidth,
    isRunning,
    measureInteraction,
    modes,
    onCompleted,
    paragraphWidth,
    prepareMs,
    preparedParagraphs,
    totalRuns,
    widthSequence,
  ]);

  return {
    activeMode,
    handleParagraphLayout,
    handleParagraphTextLayout,
    isRunning,
    lastCompletedAt,
    paragraphWidth,
    renderedParagraphs,
    runBenchmarkSuite,
    runStatus,
    summaries,
    totalRuns,
    widthSequence,
  };
}

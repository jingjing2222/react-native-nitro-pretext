import { startTransition, useEffect, useState } from "react";

import {
  BENCHMARK_CORPUS,
  disposePreparedCorpusPoC,
  prepareCorpusPoC,
} from "../relayoutBenchmark";
import type { PreparedParagraphPrepareStats } from "../relayoutBenchmark";
import type { PreparedParagraph } from "./types";

export function usePreparedParagraphs(): {
  isPreparing: boolean;
  prepareMs: number | null;
  prepareStats: PreparedParagraphPrepareStats | null;
  preparedParagraphs: PreparedParagraph | null;
} {
  const [preparedParagraphs, setPreparedParagraphs] =
    useState<PreparedParagraph | null>(null);
  const [prepareMs, setPrepareMs] = useState<number | null>(null);
  const [prepareStats, setPrepareStats] =
    useState<PreparedParagraphPrepareStats | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let preparedForCleanup: PreparedParagraph | null = null;
    const frameId = requestAnimationFrame(() => {
      const nextPrepared = prepareCorpusPoC(BENCHMARK_CORPUS);
      if (cancelled) {
        disposePreparedCorpusPoC(nextPrepared.prepared);
        return;
      }

      preparedForCleanup = nextPrepared.prepared;
      startTransition(() => {
        setPreparedParagraphs(nextPrepared.prepared);
        setPrepareMs(nextPrepared.prepareMs);
        setPrepareStats(nextPrepared.prepareStats);
        setIsPreparing(false);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (preparedForCleanup !== null) {
        disposePreparedCorpusPoC(preparedForCleanup);
      }
    };
  }, []);

  return {
    isPreparing,
    prepareMs,
    prepareStats,
    preparedParagraphs,
  };
}

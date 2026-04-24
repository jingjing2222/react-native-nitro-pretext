import { startTransition, useEffect, useState } from "react";

import {
  BENCHMARK_CORPUS,
  disposePreparedCorpusPoC,
  prepareCorpusPoC,
} from "../relayoutBenchmark";
import type { PreTextPrepareStats } from "../relayoutBenchmark";
import type { PreTextPreparedCorpus } from "./types";

export function usePreTextPreparedCorpus(): {
  isPreparing: boolean;
  prepareMs: number | null;
  prepareStats: PreTextPrepareStats | null;
  preparedParagraphs: PreTextPreparedCorpus | null;
} {
  const [preparedParagraphs, setPreparedParagraphs] =
    useState<PreTextPreparedCorpus | null>(null);
  const [prepareMs, setPrepareMs] = useState<number | null>(null);
  const [prepareStats, setPrepareStats] = useState<PreTextPrepareStats | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let preparedForCleanup: PreTextPreparedCorpus | null = null;
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

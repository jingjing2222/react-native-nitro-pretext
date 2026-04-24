import { startTransition, useEffect, useState } from "react";

import {
  BENCHMARK_CORPUS,
  disposePreparedBenchmarkCorpus,
  prepareBenchmarkCorpus,
} from "../relayoutBenchmark";
import type { PretextPrepareStats } from "../relayoutBenchmark";
import type { PretextPreparedCorpus } from "./types";

export function usePretextPreparedCorpus(): {
  isPreparing: boolean;
  prepareMs: number | null;
  prepareStats: PretextPrepareStats | null;
  preparedParagraphs: PretextPreparedCorpus | null;
} {
  const [preparedParagraphs, setPreparedParagraphs] =
    useState<PretextPreparedCorpus | null>(null);
  const [prepareMs, setPrepareMs] = useState<number | null>(null);
  const [prepareStats, setPrepareStats] = useState<PretextPrepareStats | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let preparedForCleanup: PretextPreparedCorpus | null = null;
    const frameId = requestAnimationFrame(() => {
      const nextPrepared = prepareBenchmarkCorpus(BENCHMARK_CORPUS);
      if (cancelled) {
        disposePreparedBenchmarkCorpus(nextPrepared.prepared);
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
        disposePreparedBenchmarkCorpus(preparedForCleanup);
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

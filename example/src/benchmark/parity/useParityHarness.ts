import { useCallback, useMemo, useRef, useState } from "react";

import { compareParityCaseLines } from "./comparator";
import { materializePretextParityLines } from "./pretextLines";
import {
  createParityAutomationReport,
  createParityAutomationStatusLine,
} from "./automation";
import type {
  ParityAutomationReport,
  ParityAutomationStatus,
  ParityCase,
  ParityCaseResult,
  ParityLineSnapshot,
} from "./types";

export type ParityHarnessState = {
  activeCase: ParityCase | null;
  completedAt: string | null;
  handleTextLayout: (caseId: string, rnLines: ParityLineSnapshot[]) => void;
  report: ParityAutomationReport;
  results: ParityCaseResult[];
  runParitySuite: () => void;
  status: ParityAutomationStatus;
  statusLine: string;
};

function createCompletedAt(): string {
  return new Date().toLocaleTimeString("ko-KR", {
    hour12: false,
  });
}

export function useParityHarness(
  parityCases: readonly ParityCase[],
): ParityHarnessState {
  const [status, setStatus] = useState<ParityAutomationStatus>("idle");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [results, setResults] = useState<ParityCaseResult[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const processedCaseIdRef = useRef<string | null>(null);
  const resultsRef = useRef<ParityCaseResult[]>([]);
  const activeCase =
    activeIndex === null ? null : (parityCases[activeIndex] ?? null);

  const finishRun = useCallback((nextStatus: ParityAutomationStatus) => {
    processedCaseIdRef.current = null;
    setActiveIndex(null);
    setStatus(nextStatus);
    setCompletedAt(createCompletedAt());
    setResults([...resultsRef.current]);
  }, []);

  const runParitySuite = useCallback(() => {
    if (status === "running") {
      return;
    }

    resultsRef.current = [];
    processedCaseIdRef.current = null;
    setResults([]);
    setCompletedAt(null);

    if (parityCases.length === 0) {
      finishRun("completed");
      return;
    }

    setStatus("running");
    setActiveIndex(0);
  }, [finishRun, parityCases.length, status]);

  const handleTextLayout = useCallback(
    (caseId: string, rnLines: ParityLineSnapshot[]) => {
      if (
        status !== "running" ||
        activeIndex === null ||
        processedCaseIdRef.current === caseId
      ) {
        return;
      }

      const parityCase = parityCases[activeIndex];
      if (!parityCase || parityCase.caseId !== caseId) {
        return;
      }

      processedCaseIdRef.current = caseId;

      let result: ParityCaseResult;
      try {
        const pretextLines = materializePretextParityLines(parityCase);
        result = {
          caseId,
          category: parityCase.category,
          errorMessage: null,
          mismatches: compareParityCaseLines(parityCase, rnLines, pretextLines),
          platform: "unknown",
        };
      } catch (error) {
        result = {
          caseId,
          category: parityCase.category,
          errorMessage:
            error instanceof Error ? error.message : "Unknown parity error",
          mismatches: [],
          platform: "unknown",
        };
      }

      resultsRef.current = [...resultsRef.current, result];
      setResults(resultsRef.current);

      requestAnimationFrame(() => {
        processedCaseIdRef.current = null;
        const nextIndex = activeIndex + 1;
        if (nextIndex >= parityCases.length) {
          finishRun(
            resultsRef.current.some((item) => item.errorMessage !== null)
              ? "failed"
              : "completed",
          );
          return;
        }

        setActiveIndex(nextIndex);
      });
    },
    [activeIndex, finishRun, parityCases, status],
  );

  const report = useMemo(
    () =>
      createParityAutomationReport({
        caseCount: parityCases.length,
        completedAt,
        results,
        status,
      }),
    [completedAt, parityCases.length, results, status],
  );
  const statusLine = createParityAutomationStatusLine({
    activeCaseId: activeCase?.caseId ?? null,
    caseCount: parityCases.length,
    completedCases: results.length,
    status,
  });

  return {
    activeCase,
    completedAt,
    handleTextLayout,
    report,
    results,
    runParitySuite,
    status,
    statusLine,
  };
}

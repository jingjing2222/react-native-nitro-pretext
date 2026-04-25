import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { compareParityCaseLines } from "./comparator";
import {
  materializePretextParityLines,
  materializeShapeSliceParityOracleLines,
} from "./pretextLines";
import { normalizeParityPlatform } from "./platform";
import {
  advanceParityLayoutObservation,
  createParityLayoutObservation,
  type ParityLayoutObservation,
} from "./settling";
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

const PARITY_CASE_SETTLE_TIMEOUT_MS = 2000;

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
  const activeIndexRef = useRef<number | null>(null);
  const caseDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventVersionRef = useRef(0);
  const finalizedCaseIdsRef = useRef<Set<string>>(new Set());
  const latestObservationRef = useRef<ParityLayoutObservation | null>(null);
  const settleFrameRef = useRef<number | null>(null);
  const resultsRef = useRef<ParityCaseResult[]>([]);
  const statusRef = useRef<ParityAutomationStatus>(status);
  const activeCase =
    activeIndex === null ? null : (parityCases[activeIndex] ?? null);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearSettleFrame = useCallback(() => {
    if (settleFrameRef.current !== null) {
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }
  }, []);

  const clearCaseDeadline = useCallback(() => {
    if (caseDeadlineRef.current !== null) {
      clearTimeout(caseDeadlineRef.current);
      caseDeadlineRef.current = null;
    }
  }, []);

  const finishRun = useCallback(
    (nextStatus: ParityAutomationStatus) => {
      clearCaseDeadline();
      clearSettleFrame();
      latestObservationRef.current = null;
      setActiveIndex(null);
      setStatus(nextStatus);
      setCompletedAt(createCompletedAt());
      setResults([...resultsRef.current]);
    },
    [clearCaseDeadline, clearSettleFrame],
  );

  const completeCase = useCallback(
    (caseIndex: number, result: ParityCaseResult) => {
      if (
        statusRef.current !== "running" ||
        activeIndexRef.current !== caseIndex ||
        finalizedCaseIdsRef.current.has(result.caseId)
      ) {
        return;
      }

      clearCaseDeadline();
      clearSettleFrame();
      latestObservationRef.current = null;
      finalizedCaseIdsRef.current.add(result.caseId);
      resultsRef.current = [...resultsRef.current, result];
      setResults(resultsRef.current);

      requestAnimationFrame(() => {
        const nextIndex = caseIndex + 1;
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
    [clearCaseDeadline, clearSettleFrame, finishRun, parityCases.length],
  );

  const finalizeObservedCase = useCallback(
    (caseIndex: number, caseId: string, rnLines: ParityLineSnapshot[]) => {
      const parityCase = parityCases[caseIndex];
      if (!parityCase || parityCase.caseId !== caseId) {
        return;
      }

      const platform = normalizeParityPlatform();
      let result: ParityCaseResult;
      try {
        const pretextLines = materializePretextParityLines(parityCase);
        const expectedLines =
          materializeShapeSliceParityOracleLines(parityCase, pretextLines) ??
          rnLines;
        result = {
          caseId,
          category: parityCase.category,
          errorMessage: null,
          mismatches: compareParityCaseLines(
            parityCase,
            expectedLines,
            pretextLines,
          ),
          platform,
        };
      } catch (error) {
        result = {
          caseId,
          category: parityCase.category,
          errorMessage:
            error instanceof Error ? error.message : "Unknown parity error",
          mismatches: [],
          platform,
        };
      }

      completeCase(caseIndex, result);
    },
    [completeCase, parityCases],
  );

  const scheduleSettleFrame = useCallback(
    (caseIndex: number, caseId: string, eventVersion: number) => {
      clearSettleFrame();
      settleFrameRef.current = requestAnimationFrame(() => {
        settleFrameRef.current = null;
        const observation = latestObservationRef.current;
        if (
          observation === null ||
          observation.caseId !== caseId ||
          observation.eventVersion !== eventVersion
        ) {
          return;
        }

        const advanced = advanceParityLayoutObservation(observation);
        latestObservationRef.current = advanced.observation;
        if (advanced.isStable) {
          finalizeObservedCase(caseIndex, caseId, advanced.observation.lines);
          return;
        }

        scheduleSettleFrame(caseIndex, caseId, eventVersion);
      });
    },
    [clearSettleFrame, finalizeObservedCase],
  );

  const runParitySuite = useCallback(() => {
    if (status === "running") {
      return;
    }

    resultsRef.current = [];
    finalizedCaseIdsRef.current = new Set();
    latestObservationRef.current = null;
    eventVersionRef.current = 0;
    clearCaseDeadline();
    clearSettleFrame();
    setResults([]);
    setCompletedAt(null);

    if (parityCases.length === 0) {
      finishRun("completed");
      return;
    }

    setStatus("running");
    setActiveIndex(0);
  }, [
    clearCaseDeadline,
    clearSettleFrame,
    finishRun,
    parityCases.length,
    status,
  ]);

  const handleTextLayout = useCallback(
    (caseId: string, rnLines: ParityLineSnapshot[]) => {
      if (
        status !== "running" ||
        activeIndex === null ||
        finalizedCaseIdsRef.current.has(caseId)
      ) {
        return;
      }

      const parityCase = parityCases[activeIndex];
      if (!parityCase || parityCase.caseId !== caseId) {
        return;
      }

      const eventVersion = eventVersionRef.current + 1;
      eventVersionRef.current = eventVersion;
      latestObservationRef.current = createParityLayoutObservation({
        caseId,
        eventVersion,
        lines: rnLines,
      });
      scheduleSettleFrame(activeIndex, caseId, eventVersion);
    },
    [activeIndex, parityCases, scheduleSettleFrame, status],
  );

  useEffect(() => {
    if (status !== "running" || activeIndex === null || activeCase === null) {
      clearCaseDeadline();
      return;
    }

    const caseIndex = activeIndex;
    const caseId = activeCase.caseId;
    clearCaseDeadline();
    caseDeadlineRef.current = setTimeout(() => {
      const parityCase = parityCases[caseIndex];
      if (!parityCase || parityCase.caseId !== caseId) {
        return;
      }

      completeCase(caseIndex, {
        caseId,
        category: parityCase.category,
        errorMessage:
          latestObservationRef.current === null
            ? "RN text layout event did not fire"
            : "RN text layout event did not stabilize",
        mismatches: [],
        platform: normalizeParityPlatform(),
      });
    }, PARITY_CASE_SETTLE_TIMEOUT_MS);

    return clearCaseDeadline;
  }, [
    activeCase,
    activeIndex,
    clearCaseDeadline,
    completeCase,
    parityCases,
    status,
  ]);

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
    completedCases: report.completedCases,
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

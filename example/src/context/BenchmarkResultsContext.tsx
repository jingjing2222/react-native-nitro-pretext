import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  EMPTY_PREPARED_VIEW_RESULTS,
  EMPTY_BASELINE_RESULTS,
  type BaseTextResultState,
  type PreparedViewResultState,
} from "../benchmark/types";

type BenchmarkResultsContextValue = {
  baselineResults: BaseTextResultState;
  preparedViewResults: PreparedViewResultState;
  setBaselineResults: (results: BaseTextResultState) => void;
  setPreparedViewResults: (results: PreparedViewResultState) => void;
};

const BenchmarkResultsContext =
  createContext<BenchmarkResultsContextValue | null>(null);

export function BenchmarkResultsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [baselineResults, setBaselineResults] = useState<BaseTextResultState>(
    EMPTY_BASELINE_RESULTS,
  );
  const [preparedViewResults, setPreparedViewResults] =
    useState<PreparedViewResultState>(EMPTY_PREPARED_VIEW_RESULTS);

  const value = useMemo(
    () => ({
      baselineResults,
      preparedViewResults,
      setBaselineResults,
      setPreparedViewResults,
    }),
    [baselineResults, preparedViewResults],
  );

  return (
    <BenchmarkResultsContext.Provider value={value}>
      {children}
    </BenchmarkResultsContext.Provider>
  );
}

export function useBenchmarkResults(): BenchmarkResultsContextValue {
  const value = useContext(BenchmarkResultsContext);
  if (value === null) {
    throw new Error(
      "useBenchmarkResults must be used inside BenchmarkResultsProvider",
    );
  }

  return value;
}

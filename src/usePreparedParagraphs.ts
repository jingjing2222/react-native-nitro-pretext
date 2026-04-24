import { useEffect, useState } from "react";

import type {
  InlineSegment,
  ParagraphStyle,
  PreparedParagraphState,
  PrepareParagraphStats,
} from "./Pretext.nitro";
import {
  prepareInlineParagraphs,
  prepareInlineParagraphsWithStats,
  prepareParagraphs,
  prepareParagraphsWithStats,
  releaseParagraphs,
} from "./TextMeasure";

export type UsePreparedParagraphsOptions = {
  enabled?: boolean;
  withStats?: boolean;
};

export type UsePreparedParagraphsResult = {
  error: unknown | null;
  isPreparing: boolean;
  prepared: PreparedParagraphState | null;
  stats: PrepareParagraphStats | null;
};

const IDLE_STATE: UsePreparedParagraphsResult = {
  error: null,
  isPreparing: false,
  prepared: null,
  stats: null,
};

function resolveOptions(
  options: UsePreparedParagraphsOptions | undefined,
): Required<UsePreparedParagraphsOptions> {
  return {
    enabled: options?.enabled ?? true,
    withStats: options?.withStats ?? true,
  };
}

export function usePreparedParagraphs(
  texts: string[],
  style: ParagraphStyle,
  options?: UsePreparedParagraphsOptions,
): UsePreparedParagraphsResult {
  const resolvedOptions = resolveOptions(options);
  const [state, setState] = useState<UsePreparedParagraphsResult>(IDLE_STATE);

  useEffect(() => {
    if (!resolvedOptions.enabled) {
      setState(IDLE_STATE);
      return;
    }

    let preparedId: number | null = null;
    setState({
      error: null,
      isPreparing: true,
      prepared: null,
      stats: null,
    });

    try {
      const result = resolvedOptions.withStats
        ? prepareParagraphsWithStats(texts, style)
        : {
            prepared: prepareParagraphs(texts, style),
            stats: null,
          };
      preparedId = result.prepared.id;
      setState({
        error: null,
        isPreparing: false,
        prepared: result.prepared,
        stats: result.stats,
      });
    } catch (error) {
      setState({
        error,
        isPreparing: false,
        prepared: null,
        stats: null,
      });
    }

    return () => {
      if (preparedId !== null) {
        releaseParagraphs(preparedId);
      }
    };
  }, [resolvedOptions.enabled, resolvedOptions.withStats, style, texts]);

  return state;
}

export function usePreparedInlineParagraphs(
  paragraphs: InlineSegment[][],
  style: ParagraphStyle,
  options?: UsePreparedParagraphsOptions,
): UsePreparedParagraphsResult {
  const resolvedOptions = resolveOptions(options);
  const [state, setState] = useState<UsePreparedParagraphsResult>(IDLE_STATE);

  useEffect(() => {
    if (!resolvedOptions.enabled) {
      setState(IDLE_STATE);
      return;
    }

    let preparedId: number | null = null;
    setState({
      error: null,
      isPreparing: true,
      prepared: null,
      stats: null,
    });

    try {
      const result = resolvedOptions.withStats
        ? prepareInlineParagraphsWithStats(paragraphs, style)
        : {
            prepared: prepareInlineParagraphs(paragraphs, style),
            stats: null,
          };
      preparedId = result.prepared.id;
      setState({
        error: null,
        isPreparing: false,
        prepared: result.prepared,
        stats: result.stats,
      });
    } catch (error) {
      setState({
        error,
        isPreparing: false,
        prepared: null,
        stats: null,
      });
    }

    return () => {
      if (preparedId !== null) {
        releaseParagraphs(preparedId);
      }
    };
  }, [paragraphs, resolvedOptions.enabled, resolvedOptions.withStats, style]);

  return state;
}

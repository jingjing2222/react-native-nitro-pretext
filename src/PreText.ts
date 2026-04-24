import { useEffect, useMemo, useState } from "react";

import type {
  InlineSegment,
  LaidOutParagraphLines,
  LaidOutParagraphLinesWithDiagnostics,
  LaidOutParagraphMetrics,
  LaidOutRichParagraphLines,
  ParagraphLayoutRequest,
  ParagraphShapeSlice,
  ParagraphStyle,
  PrepareParagraphStats,
  PreparedParagraphState,
} from "./Pretext.nitro";
import {
  createParagraphLayoutRequest,
  layoutParagraphLinesWithDiagnostics,
  layoutParagraphLinesWithRequest,
  layoutParagraphsMetadataWithRequest,
  layoutRichParagraphLines,
  prepareInlineParagraphsWithStats,
  prepareParagraphsWithStats,
  releaseParagraphs,
} from "./TextMeasure";

export type PreTextSource =
  | string
  | readonly string[]
  | readonly (readonly InlineSegment[])[];

export type PreTextStyle = Omit<ParagraphStyle, "letterSpacing" | "locale"> &
  Partial<Pick<ParagraphStyle, "letterSpacing" | "locale">>;

export type PreTextLayoutOutput =
  | "metrics"
  | "lines"
  | "diagnostics"
  | "rich";

export type PreTextLayoutOptions = {
  left?: number;
  output?: PreTextLayoutOutput;
  shapeSlices?: ParagraphShapeSlice[];
  whiteSpace?: string;
  width: number;
  wordBreak?: string;
};

export type PreTextPrepared = {
  readonly paragraphCount: number;
  readonly stats: PrepareParagraphStats;
  release(): void;
};

export type PreTextMetricsLayout = {
  readonly output: "metrics";
  readonly paragraphs: LaidOutParagraphMetrics[];
};

export type PreTextLinesLayout = {
  readonly output: "lines";
  readonly paragraphs: LaidOutParagraphLines[];
};

export type PreTextDiagnosticsLayout = {
  readonly output: "diagnostics";
  readonly paragraphs: LaidOutParagraphLinesWithDiagnostics[];
};

export type PreTextRichLayout = {
  readonly output: "rich";
  readonly paragraphs: LaidOutRichParagraphLines[];
};

export type PreTextLayout =
  | PreTextMetricsLayout
  | PreTextLinesLayout
  | PreTextDiagnosticsLayout
  | PreTextRichLayout;

export type UsePreTextLayoutOptions = PreTextLayoutOptions & {
  enabled?: boolean;
  style: PreTextStyle;
  text: PreTextSource;
};

export type UsePreTextLayoutResult = {
  error: unknown | null;
  isPreparing: boolean;
  layout: PreTextLayout | null;
  paragraphCount: number;
  stats: PrepareParagraphStats | null;
};

type PreparedRecord = {
  nativeState: PreparedParagraphState;
  released: boolean;
};

const preparedRecords = new WeakMap<PreTextPrepared, PreparedRecord>();

export function prepare(
  text: PreTextSource,
  style: PreTextStyle,
): PreTextPrepared {
  const resolvedStyle = normalizeStyle(style);
  const result = isInlineSource(text)
    ? prepareInlineParagraphsWithStats(toMutableInlineParagraphs(text), resolvedStyle)
    : prepareParagraphsWithStats(toTextParagraphs(text), resolvedStyle);
  const record: PreparedRecord = {
    nativeState: result.prepared,
    released: false,
  };
  const prepared: PreTextPrepared = {
    paragraphCount: result.prepared.paragraphCount,
    stats: result.stats,
    release() {
      if (record.released) {
        return;
      }
      record.released = true;
      preparedRecords.delete(prepared);
      releaseParagraphs(record.nativeState.id);
    },
  };

  preparedRecords.set(prepared, record);
  return Object.freeze(prepared);
}

export function layout(
  prepared: PreTextPrepared,
  options: PreTextLayoutOptions & { output: "lines" },
): PreTextLinesLayout;
export function layout(
  prepared: PreTextPrepared,
  options: PreTextLayoutOptions & { output: "diagnostics" },
): PreTextDiagnosticsLayout;
export function layout(
  prepared: PreTextPrepared,
  options: PreTextLayoutOptions & { output: "rich" },
): PreTextRichLayout;
export function layout(
  prepared: PreTextPrepared,
  options: PreTextLayoutOptions,
): PreTextLayout;
export function layout(
  prepared: PreTextPrepared,
  options: PreTextLayoutOptions,
): PreTextLayout {
  const record = resolvePreparedRecord(prepared);
  const request = createLayoutRequest(options);

  if (options.output === "lines") {
    return {
      output: "lines",
      paragraphs: layoutParagraphLinesWithRequest(record.nativeState.id, request),
    };
  }

  if (options.output === "diagnostics") {
    return {
      output: "diagnostics",
      paragraphs: layoutParagraphLinesWithDiagnostics(
        record.nativeState.id,
        request,
      ),
    };
  }

  if (options.output === "rich") {
    return {
      output: "rich",
      paragraphs: layoutRichParagraphLines(record.nativeState.id, request),
    };
  }

  return {
    output: "metrics",
    paragraphs: layoutParagraphsMetadataWithRequest(
      record.nativeState.id,
      request,
    ),
  };
}

export function usePreTextLayout({
  enabled = true,
  left,
  output,
  shapeSlices,
  style,
  text,
  whiteSpace,
  width,
  wordBreak,
}: UsePreTextLayoutOptions): UsePreTextLayoutResult {
  const [state, setState] = useState<{
    error: unknown | null;
    isPreparing: boolean;
    prepared: PreTextPrepared | null;
  }>({
    error: null,
    isPreparing: false,
    prepared: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        error: null,
        isPreparing: false,
        prepared: null,
      });
      return;
    }

    let prepared: PreTextPrepared | null = null;
    setState({
      error: null,
      isPreparing: true,
      prepared: null,
    });

    try {
      prepared = prepare(text, style);
      setState({
        error: null,
        isPreparing: false,
        prepared,
      });
    } catch (error) {
      setState({
        error,
        isPreparing: false,
        prepared: null,
      });
    }

    return () => {
      prepared?.release();
    };
  }, [enabled, style, text]);

  const resolvedLayout = useMemo(() => {
    if (!enabled || state.prepared === null) {
      return null;
    }

    try {
      return layout(state.prepared, {
        left,
        output,
        shapeSlices,
        whiteSpace,
        width,
        wordBreak,
      });
    } catch {
      return null;
    }
  }, [
    enabled,
    left,
    output,
    shapeSlices,
    whiteSpace,
    width,
    wordBreak,
    state.prepared,
  ]);

  return {
    error: state.error,
    isPreparing: state.isPreparing,
    layout: resolvedLayout,
    paragraphCount: state.prepared?.paragraphCount ?? 0,
    stats: state.prepared?.stats ?? null,
  };
}

export const PreText = {
  layout,
  prepare,
  usePreTextLayout,
} as const;

function normalizeStyle(style: PreTextStyle): ParagraphStyle {
  return {
    ...style,
    includeFontPadding: style.includeFontPadding ?? true,
    letterSpacing: style.letterSpacing ?? 0,
    locale: style.locale ?? "",
    textDirection: style.textDirection ?? "auto",
  };
}

function isInlineSource(
  source: PreTextSource,
): source is readonly (readonly InlineSegment[])[] {
  return (
    Array.isArray(source) &&
    source.length > 0 &&
    Array.isArray(source[0])
  );
}

function toTextParagraphs(source: string | readonly string[]): string[] {
  return typeof source === "string" ? [source] : [...source];
}

function toMutableInlineParagraphs(
  source: readonly (readonly InlineSegment[])[],
): InlineSegment[][] {
  return source.map((paragraph) => [...paragraph]);
}

function createLayoutRequest(
  options: PreTextLayoutOptions,
): ParagraphLayoutRequest {
  return createParagraphLayoutRequest(options.width, {
    left: options.left,
    shapeSlices: options.shapeSlices,
    whiteSpace: options.whiteSpace,
    wordBreak: options.wordBreak,
  });
}

function resolvePreparedRecord(prepared: PreTextPrepared): PreparedRecord {
  const record = preparedRecords.get(prepared);
  if (record === undefined || record.released) {
    throw new Error("PreText prepared layout has already been released.");
  }

  return record;
}

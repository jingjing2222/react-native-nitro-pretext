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

export type PretextSource =
  | string
  | readonly string[]
  | readonly (readonly InlineSegment[])[];

export type PretextStyle = Omit<
  ParagraphStyle,
  "fontFamily" | "letterSpacing" | "lineHeight" | "locale"
> &
  Partial<
    Pick<
      ParagraphStyle,
      "fontFamily" | "letterSpacing" | "lineHeight" | "locale"
    >
  >;

export type PretextLayoutOutput = "metrics" | "lines" | "diagnostics" | "rich";

export type PretextLayoutOptions = {
  left?: number;
  output?: PretextLayoutOutput;
  shapeSlices?: ParagraphShapeSlice[];
  whiteSpace?: string;
  width: number;
  wordBreak?: string;
};

export type PretextLayoutInput = number | PretextLayoutOptions;

export type PretextPrepared = {
  readonly paragraphCount: number;
  readonly stats: PrepareParagraphStats;
  release(): void;
};

export type PretextMetricsLayout = {
  readonly output: "metrics";
  readonly height: number;
  readonly lineCount: number;
  readonly maxLineWidth: number;
  readonly paragraphs: LaidOutParagraphMetrics[];
};

export type PretextLinesLayout = {
  readonly output: "lines";
  readonly paragraphs: LaidOutParagraphLines[];
};

export type PretextDiagnosticsLayout = {
  readonly output: "diagnostics";
  readonly paragraphs: LaidOutParagraphLinesWithDiagnostics[];
};

export type PretextRichLayout = {
  readonly output: "rich";
  readonly paragraphs: LaidOutRichParagraphLines[];
};

export type PretextLayout =
  | PretextMetricsLayout
  | PretextLinesLayout
  | PretextDiagnosticsLayout
  | PretextRichLayout;

export type UsePretextLayoutOptions = PretextLayoutOptions & {
  enabled?: boolean;
  style: PretextStyle;
  text: PretextSource;
};

export type UsePretextLayoutResult = {
  error: unknown | null;
  isPreparing: boolean;
  layout: PretextLayout | null;
  paragraphCount: number;
  stats: PrepareParagraphStats | null;
};

type PreparedRecord = {
  nativeState: PreparedParagraphState;
  released: boolean;
};

const preparedRecords = new WeakMap<PretextPrepared, PreparedRecord>();
const preparedFinalizer =
  typeof FinalizationRegistry === "function"
    ? new FinalizationRegistry<number>((preparedId) => {
        try {
          releaseParagraphs(preparedId);
        } catch {
          // The native runtime can already be torn down when JS finalizers run.
        }
      })
    : null;

export function prepare(
  text: PretextSource,
  style: PretextStyle,
): PretextPrepared {
  const resolvedStyle = normalizeStyle(style);
  const result = isInlineSource(text)
    ? prepareInlineParagraphsWithStats(
        toMutableInlineParagraphs(text),
        resolvedStyle,
      )
    : prepareParagraphsWithStats(toTextParagraphs(text), resolvedStyle);
  const record: PreparedRecord = {
    nativeState: result.prepared,
    released: false,
  };
  const prepared: PretextPrepared = {
    paragraphCount: result.prepared.paragraphCount,
    stats: result.stats,
    release() {
      if (record.released) {
        return;
      }
      record.released = true;
      preparedRecords.delete(prepared);
      preparedFinalizer?.unregister(prepared);
      releaseParagraphs(record.nativeState.id);
    },
  };

  preparedRecords.set(prepared, record);
  preparedFinalizer?.register(prepared, record.nativeState.id, prepared);
  return Object.freeze(prepared);
}

export function layout(
  prepared: PretextPrepared,
  width: number,
): PretextMetricsLayout;
export function layout(
  prepared: PretextPrepared,
  options: PretextLayoutOptions & { output?: "metrics" },
): PretextMetricsLayout;
export function layout(
  prepared: PretextPrepared,
  options: PretextLayoutOptions & { output: "lines" },
): PretextLinesLayout;
export function layout(
  prepared: PretextPrepared,
  options: PretextLayoutOptions & { output: "diagnostics" },
): PretextDiagnosticsLayout;
export function layout(
  prepared: PretextPrepared,
  options: PretextLayoutOptions & { output: "rich" },
): PretextRichLayout;
export function layout(
  prepared: PretextPrepared,
  options: PretextLayoutOptions,
): PretextLayout;
export function layout(
  prepared: PretextPrepared,
  options: PretextLayoutInput,
): PretextLayout {
  const record = resolvePreparedRecord(prepared);
  const resolvedOptions = normalizeLayoutOptions(options);
  const request = createLayoutRequest(resolvedOptions);

  if (resolvedOptions.output === "lines") {
    return {
      output: "lines",
      paragraphs: layoutParagraphLinesWithRequest(
        record.nativeState.id,
        request,
      ),
    };
  }

  if (resolvedOptions.output === "diagnostics") {
    return {
      output: "diagnostics",
      paragraphs: layoutParagraphLinesWithDiagnostics(
        record.nativeState.id,
        request,
      ),
    };
  }

  if (resolvedOptions.output === "rich") {
    return {
      output: "rich",
      paragraphs: layoutRichParagraphLines(record.nativeState.id, request),
    };
  }

  const paragraphs = layoutParagraphsMetadataWithRequest(
    record.nativeState.id,
    request,
  );

  return {
    output: "metrics",
    ...summarizeMetrics(paragraphs),
    paragraphs,
  };
}

export function usePretextLayout({
  enabled = true,
  left,
  output,
  shapeSlices,
  style,
  text,
  whiteSpace,
  width,
  wordBreak,
}: UsePretextLayoutOptions): UsePretextLayoutResult {
  const {
    fontFamily,
    fontSize,
    fontStyle,
    fontWeight,
    includeFontPadding,
    letterSpacing,
    lineHeight,
    locale,
    textDirection,
  } = style;
  const normalizedStyle = useMemo<ParagraphStyle>(
    () => ({
      fontFamily: fontFamily ?? "System",
      fontSize,
      fontStyle,
      fontWeight,
      includeFontPadding: includeFontPadding ?? true,
      letterSpacing: letterSpacing ?? 0,
      lineHeight: lineHeight ?? 0,
      locale: locale ?? "",
      textDirection: textDirection ?? "auto",
    }),
    [
      fontFamily,
      fontSize,
      fontStyle,
      fontWeight,
      includeFontPadding,
      letterSpacing,
      lineHeight,
      locale,
      textDirection,
    ],
  );
  const sourceSignature = createSourceSignature(text);
  const normalizedSource = useMemo<PretextSource>(
    () => parseSourceSignature(sourceSignature),
    [sourceSignature],
  );
  const [state, setState] = useState<{
    error: unknown | null;
    isPreparing: boolean;
    prepared: PretextPrepared | null;
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

    let prepared: PretextPrepared | null = null;
    setState({
      error: null,
      isPreparing: true,
      prepared: null,
    });

    try {
      prepared = prepare(normalizedSource, normalizedStyle);
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
  }, [enabled, normalizedStyle, normalizedSource]);

  const resolvedLayout = useMemo<{
    error: unknown | null;
    layout: PretextLayout | null;
  }>(() => {
    if (!enabled || state.prepared === null) {
      return {
        error: null,
        layout: null,
      };
    }

    try {
      return {
        error: null,
        layout: layout(state.prepared, {
          left,
          output,
          shapeSlices,
          whiteSpace,
          width,
          wordBreak,
        }),
      };
    } catch (error) {
      return {
        error,
        layout: null,
      };
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
    error: state.error ?? resolvedLayout.error,
    isPreparing: state.isPreparing,
    layout: resolvedLayout.layout,
    paragraphCount: state.prepared?.paragraphCount ?? 0,
    stats: state.prepared?.stats ?? null,
  };
}

export const Pretext = {
  layout,
  prepare,
  usePretextLayout,
} as const;

function normalizeStyle(style: PretextStyle): ParagraphStyle {
  return {
    fontFamily: style.fontFamily ?? "System",
    fontSize: style.fontSize,
    lineHeight: style.lineHeight ?? 0,
    letterSpacing: style.letterSpacing ?? 0,
    locale: style.locale ?? "",
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    includeFontPadding: style.includeFontPadding ?? true,
    textDirection: style.textDirection ?? "auto",
  };
}

function isInlineSource(
  source: PretextSource,
): source is readonly (readonly InlineSegment[])[] {
  return Array.isArray(source) && source.length > 0 && Array.isArray(source[0]);
}

function toTextParagraphs(source: string | readonly string[]): string[] {
  return typeof source === "string" ? [source] : [...source];
}

function createSourceSignature(source: PretextSource): string {
  return typeof source === "string"
    ? `text:${source}`
    : `json:${JSON.stringify(source)}`;
}

function parseSourceSignature(signature: string): PretextSource {
  return signature.startsWith("text:")
    ? signature.slice("text:".length)
    : (JSON.parse(signature.slice("json:".length)) as PretextSource);
}

function toMutableInlineParagraphs(
  source: readonly (readonly InlineSegment[])[],
): InlineSegment[][] {
  return source.map((paragraph) => [...paragraph]);
}

function createLayoutRequest(
  options: PretextLayoutOptions,
): ParagraphLayoutRequest {
  return createParagraphLayoutRequest(options.width, {
    left: options.left,
    shapeSlices: options.shapeSlices,
    whiteSpace: options.whiteSpace,
    wordBreak: options.wordBreak,
  });
}

function normalizeLayoutOptions(
  options: PretextLayoutInput,
): PretextLayoutOptions {
  return typeof options === "number" ? { width: options } : options;
}

function summarizeMetrics(
  paragraphs: LaidOutParagraphMetrics[],
): Pick<PretextMetricsLayout, "height" | "lineCount" | "maxLineWidth"> {
  return paragraphs.reduce(
    (summary, paragraph) => ({
      height: summary.height + paragraph.height,
      lineCount: summary.lineCount + paragraph.lineCount,
      maxLineWidth: Math.max(summary.maxLineWidth, paragraph.maxLineWidth),
    }),
    {
      height: 0,
      lineCount: 0,
      maxLineWidth: 0,
    },
  );
}

function resolvePreparedRecord(prepared: PretextPrepared): PreparedRecord {
  const record = preparedRecords.get(prepared);
  if (record === undefined || record.released) {
    throw new Error("Pretext prepared layout has already been released.");
  }

  return record;
}

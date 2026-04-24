# API Reference

This document is the detailed reference for public APIs, component props, accepted values, and lifecycle rules.

## Lifecycle Rule

Prepared paragraph state is stored in a native map. Every state created by `prepareParagraphs()`, `prepareParagraphsWithStats()`, `prepareInlineParagraphs()`, or `prepareInlineParagraphsWithStats()` must eventually be released with `releaseParagraphs(prepared.id)`.

Recommended app code should use `usePreparedParagraphs()` or `usePreparedInlineParagraphs()` so cleanup is automatic.

```tsx
const texts = useMemo(() => ["Body copy"], []);
const style = useMemo<ParagraphStyle>(
  () => ({
    fontFamily: "System",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    locale: "ko-KR",
    includeFontPadding: true,
    textDirection: "auto",
  }),
  [],
);
const { prepared, stats, isPreparing, error } = usePreparedParagraphs(
  texts,
  style,
);
```

Keep `texts`, `paragraphs`, and `style` stable with `useMemo` when they are created inside a component. The hook treats changed object identity as a new preparation request.

## Platform Contract

| Platform          | Canonical path                                 | Notes                                                                                  |
| ----------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Android API 29+   | `MeasuredText + LineBreaker`                   | Performance and accuracy claims target this path.                                      |
| Android API 24-28 | named legacy fallback                          | Supported, but not canonical parity. Do not use API 24-28 numbers as canonical claims. |
| iOS               | Core Text `CTTypesetter + CTLine + CTLineDraw` | Layout and native drawing use the same Core Text artifacts.                            |
| RN `<Text>`       | compatibility oracle / fallback signal         | Useful for comparing drift, not the correctness source.                                |

Height is native text-engine output. Do not compute paragraph height from `fontSize`; real height depends on font metrics, explicit `lineHeight`, fallback fonts, emoji, locale, Android `includeFontPadding`, text direction, and line breaking.

## Hooks

### `usePreparedParagraphs(texts, style, options?)`

Prepares plain text paragraphs and releases the native prepared state when the component unmounts or dependencies change.

Parameters:

| Name      | Type                           | Description                                                  |
| --------- | ------------------------------ | ------------------------------------------------------------ |
| `texts`   | `string[]`                     | Source paragraphs. Public offsets are UTF-16 source offsets. |
| `style`   | `ParagraphStyle`               | Base text style used by native measurement/layout.           |
| `options` | `UsePreparedParagraphsOptions` | Optional lifecycle options.                                  |

Options:

| Prop        | Type      | Default | Description                                                                                                                                            |
| ----------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`   | `boolean` | `true`  | When `false`, no native state is prepared and any previous state from the hook is released by React effect cleanup.                                    |
| `withStats` | `boolean` | `true`  | When `true`, uses `prepareParagraphsWithStats()` and returns prepare timing stats. When `false`, uses `prepareParagraphs()` and returns `stats: null`. |

Return value:

| Field         | Type                             | Description                                                      |
| ------------- | -------------------------------- | ---------------------------------------------------------------- |
| `prepared`    | `PreparedParagraphState \| null` | Native prepared state. Pass this to layout/render APIs.          |
| `stats`       | `PrepareParagraphStats \| null`  | Cold preparation timing when `withStats` is enabled.             |
| `isPreparing` | `boolean`                        | `true` while the hook is preparing state for the current inputs. |
| `error`       | `unknown \| null`                | Error thrown by the native prepare call, if any.                 |

### `usePreparedInlineParagraphs(paragraphs, style, options?)`

Same lifecycle behavior as `usePreparedParagraphs()`, but accepts `InlineSegment[][]` for styled runs and atomic boxes.

## Preparation APIs

### `prepareParagraphs(texts, style)`

Creates native prepared state for plain text paragraphs.

Returns `PreparedParagraphState`.

### `prepareParagraphsWithStats(texts, style)`

Creates native prepared state and returns cold setup stats.

Returns `PreparedParagraphResult`.

### `prepareInlineParagraphs(paragraphs, style)`

Creates native prepared state from `InlineSegment[][]`.

### `prepareInlineParagraphsWithStats(paragraphs, style)`

Creates native inline prepared state and returns cold setup stats.

### `releaseParagraphs(preparedId)`

Releases native prepared state. Required when not using the lifecycle hooks.

## Measurement APIs

### `measure(text, fontFamily, fontSize)`

Measures a single string with the platform text backend.

### `measureBatch(texts, fontFamily, fontSize)`

Measures many strings in one native call. This is mainly a low-level measurement primitive used during preparation.

## Layout APIs

### Width-only layout

| API                                           | Return                      | Description                                                                                     |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `layoutParagraphs(preparedId, width)`         | `LaidOutParagraph[]`        | Returns `brokenText`, `lineCount`, `height`, and `maxLineWidth`.                                |
| `layoutParagraphsMetadata(preparedId, width)` | `LaidOutParagraphMetrics[]` | Returns line count and height without materializing broken text. Prefer for renderer placement. |
| `layoutParagraphLines(preparedId, width)`     | `LaidOutParagraphLines[]`   | Returns explicit line ranges and geometry.                                                      |

### Request-based layout

| API                                                        | Return                                   | Description                                             |
| ---------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `createParagraphLayoutRequest(width, overrides?)`          | `ParagraphLayoutRequest`                 | Normalizes request defaults.                            |
| `layoutParagraphsWithRequest(preparedId, request)`         | `LaidOutParagraph[]`                     | Text layout with shape and break policy.                |
| `layoutParagraphsMetadataWithRequest(preparedId, request)` | `LaidOutParagraphMetrics[]`              | Metadata-only request layout.                           |
| `layoutParagraphLinesWithRequest(preparedId, request)`     | `LaidOutParagraphLines[]`                | Line geometry request layout.                           |
| `layoutParagraphLinesWithDiagnostics(preparedId, request)` | `LaidOutParagraphLinesWithDiagnostics[]` | Line geometry plus engine/renderer/drift diagnostics.   |
| `layoutRichParagraphLines(preparedId, request)`            | `LaidOutRichParagraphLines[]`            | Line geometry plus `InlineBoxFrame[]` for inline boxes. |

### Cursor layout

| API                                                              | Return                     | Description                                     |
| ---------------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| `createParagraphLineCursor(preparedId, paragraphIndex, request)` | `ParagraphLineCursorState` | Opens a native cursor for one paragraph layout. |
| `nextParagraphLine(cursorId)`                                    | `ParagraphLineCursorStep`  | Returns the next line until `done: true`.       |
| `releaseParagraphLineCursor(cursorId)`                           | `void`                     | Releases cursor state.                          |

Always release cursors manually. The paragraph lifecycle hooks do not own line cursors.

## Selection APIs

| API                                                                      | Return                        | Description                                                  |
| ------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------ |
| `hitTestPreparedTextPosition(preparedId, paragraphIndex, request, x, y)` | `PreparedTextPosition`        | Maps a point to source UTF-16 offset and line bounds.        |
| `layoutPreparedTextSelectionRects(preparedId, range, request)`           | `PreparedTextSelectionRect[]` | Returns selection highlight rectangles.                      |
| `selectAllPreparedText(preparedId, paragraphIndex)`                      | `PreparedTextRange`           | Selects the full source paragraph.                           |
| `getPreparedTextSelection(preparedId, range)`                            | `string`                      | Reads selected source text.                                  |
| `copyPreparedTextSelection(preparedId, range)`                           | `string`                      | Copies selected text to the native clipboard and returns it. |

Editing and paste are out of scope. Prepared text is selectable/copyable, not an editable text input.

## Renderer Components

All renderer components accept their listed props plus the React Native props shown in the type definition.

### `PreparedParagraphView`

Single native paragraph surface. Use this when one prepared paragraph is rendered by one native surface.

Props:

| Prop                       | Type                              | Required | Description                                                                                  |
| -------------------------- | --------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `prepared`                 | `PreparedParagraphState`          | yes      | Prepared state from a hook or prepare API.                                                   |
| `paragraphIndex`           | `number`                          | yes      | Paragraph index inside `prepared`.                                                           |
| `paragraphStyle`           | `ParagraphStyle`                  | yes      | Style used by native drawing. Match the style used at prepare time.                          |
| `layoutWidth`              | `number`                          | yes      | Text layout width, excluding content inset.                                                  |
| `paragraphHeight`          | `number`                          | yes      | Height from `layoutParagraphsMetadata*()`.                                                   |
| `layoutRequest`            | `Partial<ParagraphLayoutRequest>` | no       | Shape/break overrides. Defaults are produced by `createParagraphLayoutRequest(layoutWidth)`. |
| `contentInsetHorizontal`   | `number`                          | no       | Left content inset. Default `0`.                                                             |
| `contentInsetVertical`     | `number`                          | no       | Top/bottom content inset. Default `0`.                                                       |
| `textColor`                | `string`                          | no       | Native text color. Default `#22211f`.                                                        |
| `selectable`               | `boolean`                         | no       | Enables prepared selection overlay and gestures. Default `false`.                            |
| `selection`                | `PreparedTextRange \| null`       | no       | Controlled selection. If omitted, the component owns internal selection.                     |
| `onSelectionChange`        | `(selection) => void`             | no       | Called when selection changes.                                                               |
| `onSelectionCopy`          | `(text) => void`                  | no       | Called after long-press copy.                                                                |
| `selectAllOnLongPress`     | `boolean`                         | no       | Selects all text on long press. Default `true`.                                              |
| `copySelectionOnLongPress` | `boolean`                         | no       | Copies after long press selection. Default `true`.                                           |
| `selectionColor`           | `string`                          | no       | Highlight color. Default `rgba(31, 95, 84, 0.22)`.                                           |
| `style`                    | `StyleProp<ViewStyle>`            | no       | Surface style. Height is resolved from `paragraphHeight + contentInsetVertical * 2`.         |

### `PreparedParagraphsView`

Batched native renderer for a prepared corpus. Prefer this for benchmark-like lists or feeds because it avoids mounting one RN `<Text>` per paragraph.

Props:

| Prop                     | Type                              | Required | Description                                                              |
| ------------------------ | --------------------------------- | -------- | ------------------------------------------------------------------------ |
| `prepared`               | `PreparedParagraphState`          | yes      | Prepared corpus.                                                         |
| `paragraphStyle`         | `ParagraphStyle`                  | yes      | Style used by native drawing.                                            |
| `layoutWidth`            | `number`                          | yes      | Text layout width.                                                       |
| `paragraphMetrics`       | `LaidOutParagraphMetrics[]`       | yes      | Metrics for every paragraph, usually from `layoutParagraphsMetadata*()`. |
| `layoutRequest`          | `Partial<ParagraphLayoutRequest>` | no       | Shared request overrides for the batch.                                  |
| `paragraphGap`           | `number`                          | no       | Vertical gap between paragraphs. Default `0`.                            |
| `contentInsetHorizontal` | `number`                          | no       | Left content inset per paragraph. Default `0`.                           |
| `contentInsetVertical`   | `number`                          | no       | Top/bottom inset per paragraph. Default `0`.                             |
| `textColor`              | `string`                          | no       | Native text color. Default `#22211f`.                                    |
| `style`                  | `StyleProp<ViewStyle>`            | no       | Batch surface style. Height is resolved from metrics, insets, and gaps.  |

### `PreparedParagraphLinesView`

JS renderer that positions one RN `<Text>` node per native line range. Use for custom renderer experiments, not as the fastest path.

Props:

| Prop                     | Type                                     | Required | Description                                                                                                                                           |
| ------------------------ | ---------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prepared`               | `PreparedParagraphState`                 | yes      | Prepared state.                                                                                                                                       |
| `paragraphIndex`         | `number`                                 | yes      | Paragraph index.                                                                                                                                      |
| `paragraphText`          | `string`                                 | yes      | Source paragraph text for slicing line ranges.                                                                                                        |
| `paragraphStyle`         | `ParagraphStyle`                         | yes      | Base text style.                                                                                                                                      |
| `layoutWidth`            | `number`                                 | yes      | Text layout width.                                                                                                                                    |
| `layoutRequest`          | `Partial<ParagraphLayoutRequest>`        | no       | Request overrides.                                                                                                                                    |
| `includeFontPadding`     | `boolean`                                | no       | RN Text line node padding. Default `false` because this is a compat/custom renderer helper. Make it explicit when comparing with Android RN `<Text>`. |
| `contentInsetHorizontal` | `number`                                 | no       | Left inset. Default `0`.                                                                                                                              |
| `contentInsetVertical`   | `number`                                 | no       | Top/bottom inset. Default `0`.                                                                                                                        |
| `lineTextProps`          | `Omit<TextProps, "children" \| "style">` | no       | Extra props for each line `<Text>`.                                                                                                                   |
| `textColor`              | `string`                                 | no       | Line text color. Default `#22211f`.                                                                                                                   |
| `textStyle`              | `StyleProp<TextStyle>`                   | no       | Additional per-line style.                                                                                                                            |
| `style`                  | `StyleProp<ViewStyle>`                   | no       | Container style.                                                                                                                                      |

### `PreparedParagraphText`

Compatibility renderer that materializes prepared line breaks back into a single RN `<Text>`.

Props:

| Prop             | Type                              | Required | Description        |
| ---------------- | --------------------------------- | -------- | ------------------ |
| `prepared`       | `PreparedParagraphState`          | yes      | Prepared state.    |
| `paragraphIndex` | `number`                          | yes      | Paragraph index.   |
| `layoutWidth`    | `number`                          | yes      | Text layout width. |
| `layoutRequest`  | `Partial<ParagraphLayoutRequest>` | no       | Request overrides. |
| `style`          | `StyleProp<TextStyle>`            | no       | RN Text style.     |

All other `TextProps` except `children` are accepted.

## Types And Props

### `ParagraphStyle`

| Field                | Type                       | Required | Values / notes                                                                                       |
| -------------------- | -------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `fontFamily`         | `string`                   | yes      | Platform font family, for example `"System"`.                                                        |
| `fontSize`           | `number`                   | yes      | Font size in React Native points. Not enough to derive height by itself.                             |
| `lineHeight`         | `number`                   | yes      | Explicit line height. Native font metrics can still affect top/bottom padding and fallback behavior. |
| `letterSpacing`      | `number`                   | yes      | React Native-style letter spacing.                                                                   |
| `locale`             | `string`                   | yes      | BCP-47 style locale such as `"ko-KR"` or `"en-US"`.                                                  |
| `fontWeight`         | `string`                   | no       | Platform/RN weight string such as `"400"`, `"700"`, or `"bold"`.                                     |
| `fontStyle`          | `string`                   | no       | Usually `"normal"` or `"italic"`.                                                                    |
| `includeFontPadding` | `boolean`                  | no       | Android padding policy. Defaults to `true` for RN compatibility. Reported in Android diagnostics.    |
| `textDirection`      | `"auto" \| "ltr" \| "rtl"` | no       | Defaults to `"auto"`. Visual order belongs to native rendering; public offsets remain source UTF-16. |

### `ParagraphLayoutRequest`

| Field         | Type                    | Required | Values / notes                                                       |
| ------------- | ----------------------- | -------- | -------------------------------------------------------------------- |
| `width`       | `number`                | yes      | Available text width.                                                |
| `left`        | `number`                | yes      | Base x offset. Defaults to `0` via `createParagraphLayoutRequest()`. |
| `whiteSpace`  | `string`                | yes      | Supported values: `"normal"`, `"pre"`.                               |
| `wordBreak`   | `string`                | yes      | Supported values: `"normal"`, `"break-all"`.                         |
| `shapeSlices` | `ParagraphShapeSlice[]` | yes      | Per-band layout constraints. Defaults to `[]`.                       |

### `ParagraphShapeSlice`

| Field    | Type     | Description                           |
| -------- | -------- | ------------------------------------- |
| `top`    | `number` | Vertical start of the band.           |
| `height` | `number` | Band height.                          |
| `left`   | `number` | Text x offset inside the band.        |
| `width`  | `number` | Available text width inside the band. |

### `InlineSegment`

Text segment fields:

| Field           | Type     | Required             | Description                                                                                |
| --------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `text`          | `string` | yes for text segment | Source text.                                                                               |
| `breakBehavior` | `string` | yes                  | Supported values: `"normal"`, `"never"`. `"never"` keeps the segment atomic when possible. |
| `kind`          | `string` | no                   | Omit or use a non-`"box"` value for text.                                                  |
| `fontFamily`    | `string` | no                   | Segment override.                                                                          |
| `fontSize`      | `number` | no                   | Segment override.                                                                          |
| `lineHeight`    | `number` | no                   | Segment override.                                                                          |
| `letterSpacing` | `number` | no                   | Segment override.                                                                          |
| `locale`        | `string` | no                   | Segment override.                                                                          |
| `fontWeight`    | `string` | no                   | Segment override.                                                                          |
| `fontStyle`     | `string` | no                   | Segment override.                                                                          |

Box segment fields:

| Field                | Type     | Required | Description                                          |
| -------------------- | -------- | -------- | ---------------------------------------------------- |
| `kind`               | `"box"`  | yes      | Marks an atomic inline box.                          |
| `boxId`              | `string` | yes      | Stable caller-owned id returned in `InlineBoxFrame`. |
| `width`              | `number` | yes      | Box width supplied by the caller.                    |
| `height`             | `number` | yes      | Box height supplied by the caller.                   |
| `baseline`           | `number` | yes      | Baseline offset supplied by the caller.              |
| `breakBehavior`      | `string` | yes      | Use `"never"` for atomic wrapping.                   |
| `accessibilityLabel` | `string` | no       | Metadata returned in `InlineBoxFrame`.               |
| `accessibilityHint`  | `string` | no       | Metadata returned in `InlineBoxFrame`.               |
| `accessibilityRole`  | `string` | no       | Metadata returned in `InlineBoxFrame`.               |

### Layout Output Types

| Type                      | Fields                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `PreparedParagraphState`  | `id`, `paragraphCount`                                                                                                               |
| `PreparedParagraphResult` | `prepared`, `stats`                                                                                                                  |
| `PrepareParagraphStats`   | `tokenizeMs`, `measurementMs`, `buildPreparedMs`, `totalMs`, `paragraphCount`, `totalTokenCount`, `uniqueTokenCount`                 |
| `LaidOutParagraph`        | `brokenText`, `lineCount`, `height`, `maxLineWidth`                                                                                  |
| `LaidOutParagraphMetrics` | `lineCount`, `height`, `maxLineWidth`                                                                                                |
| `LaidOutParagraphLines`   | `lineCount`, `height`, `maxLineWidth`, `lines`                                                                                       |
| `ParagraphLineRange`      | `textStart`, `textEnd`, `top`, `left`, `width`, `height`, `ascent`, `descent`                                                        |
| `InlineBoxFrame`          | `boxId`, `paragraphIndex`, `lineIndex`, `textStart`, `textEnd`, `left`, `top`, `width`, `height`, `baseline`, accessibility metadata |

### Selection Types

| Type                        | Fields                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PreparedTextPosition`      | `paragraphIndex`, `lineIndex`, `offset`, `lineTextStart`, `lineTextEnd`, `x`, `y`, `layoutEngine`, `heightMetricSource`, `fallbackReason?`       |
| `PreparedTextRange`         | `paragraphIndex`, `textStart`, `textEnd`                                                                                                         |
| `PreparedTextSelectionRect` | `paragraphIndex`, `lineIndex`, `textStart`, `textEnd`, `left`, `top`, `width`, `height`, `layoutEngine`, `heightMetricSource`, `fallbackReason?` |

### Diagnostics Types

`layoutParagraphLinesWithDiagnostics()` and `layoutRichParagraphLines()` expose:

| Field                     | Description                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalizedRequest`       | The request actually used by native layout.                                                                                                                                                                                              |
| `ruleLayer`               | Rule layer name, currently pretext-style rules over native engines.                                                                                                                                                                      |
| `canvasPixelParityTarget` | Always `false`; browser canvas pixel parity is not the target.                                                                                                                                                                           |
| `textDirection`           | Resolved paragraph direction policy.                                                                                                                                                                                                     |
| `layoutEngine`            | Engine name such as `android_measured_text_line_breaker`, `android_legacy_fallback`, or `ios_core_text`.                                                                                                                                 |
| `heightMetricSource`      | Source of height metrics, normally `platform_text_engine_metrics`.                                                                                                                                                                       |
| `fallbackReason`          | Present when a degraded fallback path was used.                                                                                                                                                                                          |
| `driftKinds`              | Drift classes such as `engine_drift`, `renderer_drift`, `padding_drift`, `algorithm_rule_drift`, `height_metric_drift`, `line_break_strategy_drift`, `fallback_font_drift`, `emoji_metric_drift`, `locale_metric_drift`, `compat_drift`. |
| `heightMetricDrivers`     | Known drivers of height differences: `font_metrics`, `explicit_line_height`, `fallback_font`, `emoji_fallback`, `locale`, `include_font_padding`, `line_break_strategy`.                                                                 |
| `breakTable`              | Hard breaks, native soft breaks, grapheme boundaries, and atomic spans.                                                                                                                                                                  |
| `boundaryMap`             | UTF-16 length, grapheme/run/hard-break/native-soft-break/atomic-span boundaries, and cluster violations.                                                                                                                                 |
| `complexShapeCounters`    | Bidi, emoji, complex cluster, and cluster violation counters.                                                                                                                                                                            |
| `lineDiagnostics`         | Per-line engine, direction, height source, fallback, drift, and cluster violation data.                                                                                                                                                  |

## Benchmark Compatibility APIs

These are kept for benchmark/corpus compatibility:

| API                                                   | Description                                   |
| ----------------------------------------------------- | --------------------------------------------- |
| `prepareBenchmarkCorpus(texts, fontFamily, fontSize)` | Prepares text with a minimal benchmark style. |
| `layoutPreparedBenchmarkCorpus(preparedId, width)`    | Width-only benchmark layout alias.            |
| `releasePreparedBenchmarkCorpus(preparedId)`          | Release alias.                                |

Prefer the normal preparation/layout APIs in product code.

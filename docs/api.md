# API Reference

Pretext is layout-only. The public runtime API is:

```ts
import {
  Pretext,
  prepare,
  layout,
  usePretextLayout,
} from "react-native-nitro-pretext";
```

There are no public renderer components and no public raw native ids.

Example app coverage is kept in sync by `yarn verify:api-examples`. The
learning routes live under `examples/use-case/*`; the matching plain RN
workarounds live under `examples/non-use-case/*`.

## Platform Contract

| Platform          | Layout path                       | Notes                                                               |
| ----------------- | --------------------------------- | ------------------------------------------------------------------- |
| Android API 29+   | `MeasuredText + LineBreaker`      | Canonical Android path for performance and accuracy claims.         |
| Android API 24-28 | named legacy fallback             | Supported, but not canonical parity. Do not benchmark as canonical. |
| iOS               | Core Text `CTTypesetter + CTLine` | Canonical iOS path.                                                 |
| RN `<Text>`       | final visible renderer            | Not the correctness source. Match render styles to reduce drift.    |

Height is not derived from `fontSize`. It depends on font metrics,
`lineHeight`, fallback fonts, emoji, locale, Android `includeFontPadding`, text
direction, and the platform line breaking strategy.
When `lineHeight` is omitted, Pretext asks the native engine for platform font
metrics instead of deriving height from `fontSize`.

Since Pretext does not own the final pixels, your visible RN `<Text>` style must
match the style used for Pretext layout. The biggest Android footgun is
`includeFontPadding`: RN `<Text>` defaults it to `true`, and Pretext also
defaults it to `true`. Changing one side without the other can change height.

## `prepare(text, style)`

Prepares native paragraph state and returns an opaque JS object. The native id
is intentionally hidden.

Example route: `examples/use-case/prepare`
([source](../example/src/screens/examples/use-case/ExampleUseCasePrepareScreen.tsx)).
RN-only contrast: `examples/non-use-case/prepare`
([source](../example/src/screens/examples/non-use-case/ExampleNonUseCasePrepareScreen.tsx)).

```ts
const prepared = prepare(["Title", "Body"], {
  fontSize: 16,
});
```

Parameters:

| Name    | Type            | Required | Description                                           |
| ------- | --------------- | -------- | ----------------------------------------------------- |
| `text`  | `PretextSource` | yes      | A string, string array, or inline segment paragraphs. |
| `style` | `PretextStyle`  | yes      | Native text style used for shaping and line breaking. |

Returns `PretextPrepared`:

| Field            | Type                    | Description                                         |
| ---------------- | ----------------------- | --------------------------------------------------- |
| `paragraphCount` | `number`                | Number of prepared paragraphs.                      |
| `stats`          | `PrepareParagraphStats` | Cold prepare timing and corpus stats.               |
| `release()`      | `() => void`            | Releases native state. Safe to call more than once. |

Manual lifecycle rule:

```ts
const prepared = prepare(text, style);
try {
  return layout(prepared, 320);
} finally {
  prepared.release();
}
```

Calling `layout()` after `prepared.release()` throws
`"Pretext prepared layout has already been released."`.

## `layout(prepared, widthOrOptions)`

Layouts a prepared object for a width and optional request rules.

Example routes:

| Use case      | Pretext route                          | RN-only contrast                             |
| ------------- | -------------------------------------- | -------------------------------------------- |
| Metrics       | `examples/use-case/layout-metrics`     | `examples/non-use-case/layout-metrics`       |
| Options/rules | `examples/use-case/layout-options`     | `examples/non-use-case/layout-options`       |
| Lines         | `examples/use-case/layout-lines`       | `examples/non-use-case/layout-lines`         |
| Diagnostics   | `examples/use-case/layout-diagnostics` | `examples/non-use-case/layout-diagnostics`   |
| Rich inline   | `examples/use-case/layout-rich`        | `examples/non-use-case/layout-rich`          |
| Case study    | `benchmark/measured-layout`            | Hidden RN `<Text onLayout>` measurement path |

```ts
const metrics = layout(prepared, 320);
const height = metrics.height;

const lines = layout(prepared, {
  width: 320,
  output: "lines",
});
```

Parameters:

| Name             | Type                             | Required | Description                                                       |
| ---------------- | -------------------------------- | -------- | ----------------------------------------------------------------- |
| `prepared`       | `PretextPrepared`                | yes      | Object returned by `prepare()`.                                   |
| `widthOrOptions` | `number \| PretextLayoutOptions` | yes      | Width shorthand for metrics, or width plus optional layout rules. |

Use `layout(prepared, width)` for the common height-before-render path. Use the
object form when you need line data, diagnostics, rich inline boxes, or custom
rules.

```ts
const rich = layout(preparedInlineParagraphs, {
  width: 320,
  output: "rich",
});
```

`PretextLayoutOptions`:

| Prop          | Type                                              | Default     | Description                                                  |
| ------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------ |
| `width`       | `number`                                          | required    | Available text width.                                        |
| `output`      | `"metrics" \| "lines" \| "diagnostics" \| "rich"` | `"metrics"` | Amount of layout data to return.                             |
| `left`        | `number`                                          | `0`         | Base x offset for returned line geometry.                    |
| `shapeSlices` | `ParagraphShapeSlice[]`                           | `[]`        | Per-band constraints for obstacle-aware layout.              |
| `whiteSpace`  | `"normal" \| "pre" \| string`                     | `"normal"`  | Whitespace rule. Current native support is normal/pre.       |
| `wordBreak`   | `"normal" \| "break-all" \| string`               | `"normal"`  | Word break rule. Current native support is normal/break-all. |

Return value depends on `output`.

### `output: "metrics"`

Default output. Use this for height-before-render placement.

Example route: `examples/use-case/layout-metrics`
([source](../example/src/screens/examples/use-case/ExampleUseCaseLayoutMetricsScreen.tsx)).
RN-only contrast: `examples/non-use-case/layout-metrics`
([source](../example/src/screens/examples/non-use-case/ExampleNonUseCaseLayoutMetricsScreen.tsx)).

```ts
type PretextMetricsLayout = {
  output: "metrics";
  height: number;
  lineCount: number;
  maxLineWidth: number;
  paragraphs: LaidOutParagraphMetrics[];
};
```

The top-level fields are the convenience values for the common case. For a
single paragraph, they match that paragraph. For multiple paragraphs, `height`
and `lineCount` are summed and `maxLineWidth` is the widest paragraph.

`LaidOutParagraphMetrics`:

| Field          | Type     | Description                  |
| -------------- | -------- | ---------------------------- |
| `lineCount`    | `number` | Number of native text lines. |
| `height`       | `number` | Native paragraph height.     |
| `maxLineWidth` | `number` | Widest line width.           |

### `output: "lines"`

Returns line ranges and geometry for custom placement or hit testing that you
own outside this package.

Example route: `examples/use-case/layout-lines`
([source](../example/src/screens/examples/use-case/ExampleUseCaseLayoutLinesScreen.tsx)).
RN-only contrast: `examples/non-use-case/layout-lines`
([source](../example/src/screens/examples/non-use-case/ExampleNonUseCaseLayoutLinesScreen.tsx)).

```ts
type PretextLinesLayout = {
  output: "lines";
  paragraphs: LaidOutParagraphLines[];
};
```

`ParagraphLineRange`:

| Field       | Type     | Description                 |
| ----------- | -------- | --------------------------- |
| `textStart` | `number` | Source UTF-16 start offset. |
| `textEnd`   | `number` | Source UTF-16 end offset.   |
| `top`       | `number` | Line top.                   |
| `left`      | `number` | Line x offset.              |
| `width`     | `number` | Line width.                 |
| `height`    | `number` | Line height.                |
| `ascent`    | `number` | Native ascent.              |
| `descent`   | `number` | Native descent.             |

### `output: "diagnostics"`

Returns line geometry plus engine, rule, drift, and boundary diagnostics.

Example route: `examples/use-case/layout-diagnostics`
([source](../example/src/screens/examples/use-case/ExampleUseCaseDiagnosticsScreen.tsx)).
RN-only contrast: `examples/non-use-case/layout-diagnostics`
([source](../example/src/screens/examples/non-use-case/ExampleNonUseCaseDiagnosticsScreen.tsx)).

```ts
type PretextDiagnosticsLayout = {
  output: "diagnostics";
  paragraphs: LaidOutParagraphLinesWithDiagnostics[];
};
```

Important diagnostics fields:

| Field                     | Description                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `normalizedRequest`       | Request actually used by native layout.                                                                  |
| `ruleLayer`               | Pretext rule layer over native engines.                                                                  |
| `canvasPixelParityTarget` | Always `false`; browser canvas pixel parity is not a target.                                             |
| `layoutEngine`            | `android_measured_text_line_breaker`, `android_legacy_fallback`, or `ios_core_text`.                     |
| `heightMetricSource`      | Normally `platform_text_engine_metrics`.                                                                 |
| `fallbackReason`          | Present when a degraded fallback path was used.                                                          |
| `driftKinds`              | `engine_drift`, `renderer_drift`, `padding_drift`, `algorithm_rule_drift`, and related classes.          |
| `heightMetricDrivers`     | Drivers such as `font_metrics`, `fallback_font`, `emoji_fallback`, `locale`, and `include_font_padding`. |
| `breakTable`              | Hard breaks, native soft breaks, grapheme boundaries, and atomic spans.                                  |
| `boundaryMap`             | UTF-16, grapheme, run, break, atomic-span, and cluster-violation boundaries.                             |
| `complexShapeCounters`    | Bidi, emoji, complex cluster, and cluster violation counters.                                            |
| `lineDiagnostics`         | Per-line engine, direction, height source, fallback, drift, and cluster data.                            |

### `output: "rich"`

Returns line geometry plus inline box frames.

Example route: `examples/use-case/layout-rich`
([source](../example/src/screens/examples/use-case/ExampleUseCaseLayoutRichScreen.tsx)).
RN-only contrast: `examples/non-use-case/layout-rich`
([source](../example/src/screens/examples/non-use-case/ExampleNonUseCaseLayoutRichScreen.tsx)).

```ts
type PretextRichLayout = {
  output: "rich";
  paragraphs: LaidOutRichParagraphLines[];
};
```

`InlineBoxFrame`:

| Field                | Type     | Description                                       |
| -------------------- | -------- | ------------------------------------------------- |
| `boxId`              | `string` | Caller-supplied box id.                           |
| `paragraphIndex`     | `number` | Paragraph containing the box.                     |
| `lineIndex`          | `number` | Line containing the box.                          |
| `textStart`          | `number` | Source UTF-16 start offset of replacement span.   |
| `textEnd`            | `number` | Source UTF-16 end offset of replacement span.     |
| `left`               | `number` | Box x position.                                   |
| `top`                | `number` | Box y position.                                   |
| `width`              | `number` | Caller-supplied box width.                        |
| `height`             | `number` | Caller-supplied box height.                       |
| `baseline`           | `number` | Caller-supplied baseline offset.                  |
| `accessibilityLabel` | `string` | Optional metadata echoed from the inline segment. |
| `accessibilityHint`  | `string` | Optional metadata echoed from the inline segment. |
| `accessibilityRole`  | `string` | Optional metadata echoed from the inline segment. |

## `usePretextLayout(options)`

React hook that prepares native state, runs layout, and releases native state
on unmount or dependency change.

Example route: `examples/use-case/use-pretext-layout`
([source](../example/src/screens/examples/use-case/ExampleUseCaseHookScreen.tsx)).
RN-only contrast: `examples/non-use-case/use-pretext-layout`
([source](../example/src/screens/examples/non-use-case/ExampleNonUseCaseHookScreen.tsx)).

```tsx
const result = usePretextLayout({
  text,
  width,
  style,
  output: "metrics",
});
```

Options:

| Prop          | Type                    | Required | Default     | Description                                   |
| ------------- | ----------------------- | -------- | ----------- | --------------------------------------------- |
| `text`        | `PretextSource`         | yes      | n/a         | Source string, strings, or inline paragraphs. |
| `style`       | `PretextStyle`          | yes      | n/a         | Native layout style.                          |
| `width`       | `number`                | yes      | n/a         | Available text width.                         |
| `enabled`     | `boolean`               | no       | `true`      | When `false`, no native state is prepared.    |
| `output`      | `PretextLayoutOutput`   | no       | `"metrics"` | Layout output mode.                           |
| `left`        | `number`                | no       | `0`         | Base x offset.                                |
| `shapeSlices` | `ParagraphShapeSlice[]` | no       | `[]`        | Per-band constraints.                         |
| `whiteSpace`  | `string`                | no       | `"normal"`  | Whitespace rule.                              |
| `wordBreak`   | `string`                | no       | `"normal"`  | Word break rule.                              |

Return value:

| Field            | Type                            | Description                                        |
| ---------------- | ------------------------------- | -------------------------------------------------- |
| `layout`         | `PretextLayout \| null`         | Layout output, or `null` while disabled/preparing. |
| `stats`          | `PrepareParagraphStats \| null` | Prepare timing, or `null` before prepare finishes. |
| `paragraphCount` | `number`                        | Prepared paragraph count.                          |
| `isPreparing`    | `boolean`                       | `true` while the hook is preparing current inputs. |
| `error`          | `unknown \| null`               | Error thrown by native prepare or layout, if any.  |

The hook catches native prepare/layout exceptions and returns them in `error`.
It does not rethrow during render. When `error` is non-null, `layout` is null.

Keep `text` arrays, inline segment arrays, `shapeSlices`, and other non-style
object/array inputs stable with `useMemo` when they are created inside a
component. Plain style objects are normalized by value, so an inline style
literal with the same scalar values does not force a new prepare.

## `Pretext`

Namespace object with the same functions:

Example route: `examples/use-case/namespace-and-types`
([source](../example/src/screens/examples/use-case/ExampleUseCaseNamespaceAndTypesScreen.tsx)).

```ts
Pretext.prepare(text, style);
Pretext.layout(prepared, width);
Pretext.layout(prepared, options);
Pretext.usePretextLayout(options);
```

Use either named functions or the namespace object. They call the same
implementation.

## Types

The type helpers in this section are exported from the package root.

### `PretextSource`

```ts
type PretextSource =
  | string
  | readonly string[]
  | readonly (readonly InlineSegment[])[];
```

String sources prepare plain paragraphs. Inline segment sources prepare styled
runs and optional atomic boxes.

### `PretextLayoutInput`

```ts
type PretextLayoutInput = number | PretextLayoutOptions;
```

The number shorthand is equivalent to `{ width, output: "metrics" }`.

### `PretextStyle`

| Field                | Type                       | Required | Default             | Description                                                         |
| -------------------- | -------------------------- | -------- | ------------------- | ------------------------------------------------------------------- |
| `fontFamily`         | `string`                   | no       | `"System"`          | Platform font family, for example `"System"`.                       |
| `fontSize`           | `number`                   | yes      | n/a                 | RN point size. Not enough to derive height.                         |
| `lineHeight`         | `number`                   | no       | native font metrics | Explicit line height. Omit to match RN's default line box behavior. |
| `letterSpacing`      | `number`                   | no       | `0`                 | RN-style letter spacing.                                            |
| `locale`             | `string`                   | no       | `""`                | BCP-47 locale such as `"ko-KR"` or `"en-US"`.                       |
| `fontWeight`         | `string`                   | no       | platform            | Weight such as `"400"`, `"700"`, or `"bold"`.                       |
| `fontStyle`          | `string`                   | no       | platform            | Usually `"normal"` or `"italic"`.                                   |
| `includeFontPadding` | `boolean`                  | no       | `true`              | Android padding policy, aligned with RN default.                    |
| `textDirection`      | `"auto" \| "ltr" \| "rtl"` | no       | `"auto"`            | Direction policy. Offsets remain source UTF-16.                     |

### `PrepareParagraphStats`

| Field              | Type     | Description                         |
| ------------------ | -------- | ----------------------------------- |
| `tokenizeMs`       | `number` | Time spent tokenizing source text.  |
| `measurementMs`    | `number` | Time spent in native text metrics.  |
| `buildPreparedMs`  | `number` | Time spent building prepared state. |
| `totalMs`          | `number` | End-to-end prepare time.            |
| `paragraphCount`   | `number` | Paragraph count.                    |
| `totalTokenCount`  | `number` | Total prepared token count.         |
| `uniqueTokenCount` | `number` | Unique token count.                 |

### `ParagraphShapeSlice`

| Field    | Type     | Description                             |
| -------- | -------- | --------------------------------------- |
| `top`    | `number` | Vertical start of the constrained band. |
| `height` | `number` | Band height.                            |
| `left`   | `number` | Text x offset inside the band.          |
| `width`  | `number` | Available text width inside the band.   |

### `InlineSegment`

Text segment fields:

| Field           | Type     | Required             | Description                               |
| --------------- | -------- | -------------------- | ----------------------------------------- |
| `text`          | `string` | yes for text segment | Source text.                              |
| `breakBehavior` | `string` | yes                  | `"normal"` or `"never"`.                  |
| `kind`          | `string` | no                   | Omit or use a non-`"box"` value for text. |
| `fontFamily`    | `string` | no                   | Segment style override.                   |
| `fontSize`      | `number` | no                   | Segment style override.                   |
| `lineHeight`    | `number` | no                   | Segment style override.                   |
| `letterSpacing` | `number` | no                   | Segment style override.                   |
| `locale`        | `string` | no                   | Segment locale override.                  |
| `fontWeight`    | `string` | no                   | Segment weight override.                  |
| `fontStyle`     | `string` | no                   | Segment style override.                   |

Box segment fields:

| Field                | Type     | Required | Description                             |
| -------------------- | -------- | -------- | --------------------------------------- |
| `kind`               | `"box"`  | yes      | Marks an atomic inline box.             |
| `boxId`              | `string` | yes      | Stable id returned in `InlineBoxFrame`. |
| `width`              | `number` | yes      | Caller-supplied box width.              |
| `height`             | `number` | yes      | Caller-supplied box height.             |
| `baseline`           | `number` | yes      | Caller-supplied baseline offset.        |
| `breakBehavior`      | `string` | yes      | Use `"never"` for atomic wrapping.      |
| `accessibilityLabel` | `string` | no       | Metadata returned in `InlineBoxFrame`.  |
| `accessibilityHint`  | `string` | no       | Metadata returned in `InlineBoxFrame`.  |
| `accessibilityRole`  | `string` | no       | Metadata returned in `InlineBoxFrame`.  |

## Performance Guidance

- `prepare()` is the cold step. It is usually measurement-bound.
- `layout()` with `output: "metrics"` is the hot path for height-before-render.
- `output: "lines"` returns more geometry and should be used only when needed.
- `output: "diagnostics"` is for tests, gates, and debugging drift.
- `output: "rich"` is for inline boxes and returns `InlineBoxFrame[]`.
- `usePretextLayout()` has the same native cost as `prepare()` plus `layout()`,
  but handles release automatically.

## Compatibility Notes

- Browser canvas pixel parity is explicitly out of scope.
- Public offsets are source UTF-16 offsets.
- Visual order belongs to the final renderer.
- Do not split surrogate pairs, ZWJ emoji, flags, combining sequences, or
  complex-script clusters in caller code.
- Android API 24-28 is a supported fallback, not the canonical parity target.

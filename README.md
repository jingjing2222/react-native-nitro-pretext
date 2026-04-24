# react-native-nitro-pretext

Native paragraph layout for React Native screens that need text geometry before render.

`react-native-nitro-pretext` prepares paragraph state once, relayouts it cheaply across widths or shape constraints, and renders it through native paragraph surfaces. It is built for feeds, chat bubbles, bottom sheets, editorial layouts, dashboards, and any UI where text height is an input to the rest of the layout.

## Why

React Native `<Text>` is excellent for rendering text, but it only tells you final width and height after mount through `onLayout` / `onTextLayout`. That forces a two-pass pattern:

1. render hidden text for measurement
2. wait for layout callbacks
3. compute the real layout
4. render the visible UI

This library moves the paragraph geometry step into native text engines so you can ask for line count, height, line ranges, selection rects, and inline box frames before mounting the final surface.

Height is not guessed from `fontSize`. It comes from platform text metrics: font metrics, `lineHeight`, fallback fonts, emoji, locale, Android `includeFontPadding`, text direction, and line breaking.

## Highlights

- prepare once, layout many
- Android canonical path: `MeasuredText + LineBreaker` on API 29+
- iOS canonical path: Core Text `CTTypesetter + CTLine + CTLineDraw`
- batched native renderer: `PreparedParagraphsView`
- single-paragraph native renderer: `PreparedParagraphView`
- request-based relayout with `shapeSlices`, `left`, `whiteSpace`, and `wordBreak`
- rich inline text runs and caller-supplied atomic inline boxes
- prepared selection helpers: hit testing, selection rects, select-all, text readback, copy
- diagnostics for engine, renderer, padding, break tables, complex shaping, and drift
- lifecycle hooks that release native prepared state automatically

## Install

```sh
npm install react-native-nitro-pretext react-native-nitro-modules
```

`react-native-nitro-modules` is required because the native engine is exposed through Nitro Modules.

## Quick Start

Use the hook in app code so native prepared state is released on unmount or dependency change.

```tsx
import { useMemo } from "react";
import {
  PreparedParagraphView,
  layoutParagraphsMetadata,
  usePreparedParagraphs,
  type ParagraphStyle,
} from "react-native-nitro-pretext";

const style: ParagraphStyle = {
  fontFamily: "System",
  fontSize: 18,
  lineHeight: 28,
  letterSpacing: 0,
  locale: "ko-KR",
  includeFontPadding: true,
  textDirection: "auto",
};

export function CardCopy() {
  const texts = useMemo(
    () => ["Prepare native paragraph state once, then relayout by width."],
    [],
  );
  const { prepared, stats } = usePreparedParagraphs(texts, style);
  const width = 280;
  const [metrics] =
    prepared === null ? [] : layoutParagraphsMetadata(prepared.id, width);

  if (prepared === null || metrics === undefined) {
    return null;
  }

  return (
    <PreparedParagraphView
      layoutWidth={width}
      paragraphHeight={metrics.height}
      paragraphIndex={0}
      paragraphStyle={style}
      prepared={prepared}
      style={{ width }}
    />
  );
}
```

For all APIs, props, accepted values, and lifecycle guidance, see [API Reference](docs/api.md).

## Example App

The example app includes focused routes for renderer usage and real layout problems:

- `examples/measured-layout`: hidden `<Text onLayout>` measurement pass vs prepared native metrics in a masonry layout
- `examples/prepared-view`: native paragraph surface
- `examples/inline-segments`: styled inline runs and atomic boxes
- `examples/line-cursor`: line streaming for custom renderers
- `examples/slites/*`: accordion height prediction, bubble width search, obstacle-aware layout, rich note comparison
- `benchmark/*`: BaseText vs prepared native batch benchmark pages

Run it locally:

```sh
yarn example:ios
yarn example:android
```

## Performance Snapshot

Latest validated iOS suite snapshot: April 24, 2026.

| Path                         |    Baseline |    Prepared |                           Result |
| ---------------------------- | ----------: | ----------: | -------------------------------: |
| Batched native render median | `231.35 ms` |  `67.08 ms` |                   `71.0% faster` |
| Batched native render p95    | `364.52 ms` | `103.79 ms` |                   `71.5% faster` |
| Hot relayout only            | RN internal |   `0.18 ms` |             isolated native path |
| Prepare once                 |         n/a |  `48.10 ms` | amortized after about 1 relayout |

Read the benchmark details and limits in [Benchmark Report](docs/benchmark-improvement-report.md).

Important validation status:

- The iOS numbers above are measured and useful for direction.
- Android release-device benchmark numbers are not published yet because no Android device was connected during the latest local verification.
- Do not claim Android speedups from the iOS snapshot. Android adoption confidence requires an Android release-device benchmark on the target device class.
- Android performance and accuracy claims are for API 29+ canonical `MeasuredText + LineBreaker`.
- Android API 24-28 is supported as a named legacy fallback, but it is not the canonical parity path.

## Platform Accuracy

The renderer and measurement engine must match. If you measure with one engine and render with another, pixel-level drift is expected.

This library keeps canonical prepared paths aligned:

- Android API 29+: `MeasuredText + LineBreaker` for layout and native drawing records
- iOS: Core Text for layout and drawing
- RN `<Text>`: compatibility oracle and fallback signal, not the correctness source

Android `includeFontPadding` is explicit and defaults to `true` for RN compatibility. Turning it off changes height and should be treated as an intentional rendering policy change.

## Documentation

- [API Reference](docs/api.md)
- [Benchmark Report](docs/benchmark-improvement-report.md)
- [Contributing](CONTRIBUTING.md)

## Development

```sh
yarn typecheck
yarn lint
yarn fmt:check
yarn test --runInBand
yarn build
```

Example native builds:

```sh
yarn workspace react-native-nitro-pretext-example build:android
yarn workspace react-native-nitro-pretext-example build:ios
```

## License

MIT

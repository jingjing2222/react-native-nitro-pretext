# react-native-nitro-pretext

React Native paragraph engine prototype built around prepared paragraph state.

The current goal is not to copy all of `pretext`. The implemented path is narrower and more renderer-oriented:

- prepare paragraph state once
- relayout the same paragraphs across many widths cheaply
- feed the prepared state into React Native, custom native views, or future renderer paths

## Status

Implemented in the repository:

- native `measure()` and `measureBatch()`
- `prepareParagraphs()` and `prepareParagraphsWithStats()`
- inline paragraph preparation with `InlineSegment[]` and `breakBehavior: "never"`
- repeated relayout with `layoutParagraphs()`, `layoutParagraphsMetadata()`, and `layoutParagraphLines()`
- request-based relayout with `whiteSpace`, `wordBreak`, `shapeSlices`, and `left`
- cursor-style streaming with `createParagraphLineCursor()` and `nextParagraphLine()`
- `PreparedParagraphView`, a native paragraph surface that consumes `preparedId + paragraphIndex + width` directly
- `PreparedParagraphText`, a React Native `<Text>` renderer that materializes prepared paragraph breaks on demand
- benchmark corpus helpers: `prepareBenchmarkCorpus()`, `layoutPreparedBenchmarkCorpus()`, and `releasePreparedBenchmarkCorpus()`
- split example app into dedicated `screens/benchmark/*` and `screens/examples/*` pages with React Navigation

Platform backends:

- Android: `MeasuredText + LineBreaker` on API 29+, token fallback below API 29
- iOS: `CTTypesetter`-based line breaking via CoreText

Not implemented yet:

- rich inline styling and embedded non-text content like chips/images
- renderer integrations beyond the current native paragraph view and React Native `<Text>` helpers
- full `pretext` feature parity for advanced inline layout, shaping, and parity-perfect line breaking

## Installation

```sh
npm install react-native-nitro-pretext react-native-nitro-modules
```

`react-native-nitro-modules` is required because this library is built on [Nitro Modules](https://nitro.margelo.com/).

## Core Model

The library is organized around three steps:

1. `prepareParagraphsWithStats()`
   Build prepared paragraph state once and capture cold setup cost.
2. `layoutParagraphsMetadata()` or `layoutParagraphLines()`
   Reflow the same prepared paragraphs for a new width on the hot path.
3. `PreparedParagraphView`
   Render a paragraph by passing a prepared handle and paragraph index to a native view instead of materializing line objects through JS props.

## Usage

```ts
import {
  PreparedParagraphView,
  PreparedParagraphText,
  createParagraphLayoutRequest,
  createParagraphLineCursor,
  layoutParagraphsMetadata,
  layoutParagraphLinesWithRequest,
  nextParagraphLine,
  prepareInlineParagraphsWithStats,
  prepareParagraphsWithStats,
  type InlineSegment,
  type ParagraphStyle,
} from "react-native-nitro-pretext";

const style: ParagraphStyle = {
  fontFamily: "System",
  fontSize: 18,
  lineHeight: 28,
  letterSpacing: 0,
  locale: "ko-KR",
};

const { prepared, stats } = prepareParagraphsWithStats(
  [
    "같은 문단을 여러 폭으로 다시 흐르게 하는 prepared paragraph state",
  ],
  style,
);

const contentWidth = 320 - 14 * 2;
const [metrics] = layoutParagraphsMetadata(prepared.id, contentWidth);

function Example() {
  return (
    <PreparedParagraphView
      contentInsetHorizontal={14}
      contentInsetVertical={14}
      layoutWidth={contentWidth}
      paragraphHeight={metrics.height}
      paragraphIndex={0}
      paragraphStyle={style}
      prepared={prepared}
      style={{ width: 320, borderRadius: 18, backgroundColor: "#fff" }}
    />
  );
}
```

For inline content with non-breakable spans:

```ts
const inlineParagraph: InlineSegment[] = [
  { text: "@pretext", breakBehavior: "never" },
  { text: " keeps the handle together while the rest can wrap normally.", breakBehavior: "normal" },
];

const inlinePrepared = prepareInlineParagraphsWithStats([inlineParagraph], style);

function InlineExample() {
  return (
    <PreparedParagraphText
      layoutWidth={280}
      paragraphIndex={0}
      prepared={inlinePrepared.prepared}
      style={{ width: 280, color: "#22211f", fontSize: 18, lineHeight: 28 }}
    />
  );
}
```

If you are building your own renderer, `layoutParagraphLines()` exposes explicit line ranges with `textStart`, `textEnd`, `top`, `left`, `width`, `height`, `ascent`, and `descent`.

For shaped relayout or policy control, use a request object:

```ts
const request = createParagraphLayoutRequest(280, {
  left: 12,
  whiteSpace: "normal",
  wordBreak: "break-all",
  shapeSlices: [
    { top: 0, height: 28, left: 12, width: 240 },
    { top: 28, height: 56, left: 48, width: 204 },
  ],
});

const [paragraph] = layoutParagraphLinesWithRequest(prepared.id, request);
const cursor = createParagraphLineCursor(prepared.id, 0, request);
const firstLine = nextParagraphLine(cursor.id);
```

## Public API

- `ParagraphEngine`
- `TextMeasure`
- `measure(text, fontFamily, fontSize)`
- `measureBatch(texts, fontFamily, fontSize)`
- `prepareParagraphs(texts, style)`
- `prepareParagraphsWithStats(texts, style)`
- `prepareInlineParagraphs(paragraphs, style)`
- `prepareInlineParagraphsWithStats(paragraphs, style)`
- `layoutParagraphs(preparedId, width)`
- `layoutParagraphsMetadata(preparedId, width)`
- `layoutParagraphLines(preparedId, width)`
- `createParagraphLayoutRequest(width, overrides)`
- `layoutParagraphsWithRequest(preparedId, request)`
- `layoutParagraphsMetadataWithRequest(preparedId, request)`
- `layoutParagraphLinesWithRequest(preparedId, request)`
- `createParagraphLineCursor(preparedId, paragraphIndex, request)`
- `nextParagraphLine(cursorId)`
- `releaseParagraphLineCursor(cursorId)`
- `releaseParagraphs(preparedId)`
- `prepareBenchmarkCorpus(texts, fontFamily, fontSize)`
- `layoutPreparedBenchmarkCorpus(preparedId, width)`
- `releasePreparedBenchmarkCorpus(preparedId)`
- `PreparedParagraphView`
- `PreparedParagraphText`

## Benchmark App

The example app is intentionally split by page so each path can be measured independently.

- `Home`: combines the latest results from both benchmark pages
- `screens/benchmark/BenchmarkIndexScreen`: benchmark landing page
- `screens/benchmark/BaseTextBenchmarkScreen`: plain React Native `<Text>` baseline and line-count oracle
- `screens/benchmark/PreparedParagraphViewBenchmarkScreen`: prepared-state relayout plus native paragraph view rendering
- `screens/examples/ExampleIndexScreen`: examples landing page
- `screens/examples/PreparedViewExampleScreen`: native paragraph surface example
- `screens/examples/PreparedTextExampleScreen`: prepared-state-backed `<Text>` example
- `screens/examples/InlineSegmentsExampleScreen`: non-breakable inline span example
- `screens/examples/LineCursorExampleScreen`: request-based relayout and cursor streaming example

Run the example app:

```sh
yarn example:android
yarn example:ios
```

For meaningful benchmark numbers, use release builds on the same device class:

```sh
cd example
npx react-native run-android --mode release --device <serial> --no-packager --extra-params "--console=plain --no-daemon"
npx react-native run-ios --simulator "${IOS_SIMULATOR:-iPhone 16}" --mode Release --no-packager --extra-params "ONLY_ACTIVE_ARCH=YES ARCHS=arm64"
```

For the current benchmark flow:

1. Run `BaseText` first.
2. Run `Prepared View` next.
3. Return to `benchmark/*` or `Home` to compare the latest summaries.

The benchmark focuses on repeated width relayout, not first mount only.

## Latest Local Benchmark Snapshot

Latest checked local release snapshots on `2026-04-13`:

| Platform | Device / build                 | BaseText median | BaseText p95 | Prepared view median | Prepared view p95 | Render layout-only median | Compute-only median | Cold prepare | Line parity         |
| -------- | ------------------------------ | --------------- | ------------ | -------------------- | ----------------- | ------------------------- | ------------------- | ------------ | ------------------- |
| Android  | Pixel 9 Pro emulator / Release | `23.17 ms`      | `26.03 ms`   | `19.45 ms`           | `20.66 ms`        | `1.89 ms`                 | `1.33 ms`           | `43.56 ms`   | `80 / 240 mismatch` |
| iOS      | iPhone 16 simulator / Release  | `154.58 ms`     | `310.06 ms`  | `92.63 ms`           | `137.20 ms`       | `13.92 ms`                | `13.56 ms`          | `340.88 ms`  | `35 / 240 mismatch` |

Current reading of the numbers:

- the prepared native view path is already faster than plain RN `<Text>` in the repeated-relayout benchmark on both local release runs
- most cold cost is still in native measurement during `prepare*()`, not in JS object construction
- the renderer-oriented path is where the architecture currently pays off; `PreparedParagraphText` exists as a compatibility helper, but the main performance win comes from consuming prepared state directly from native
- line parity is not perfect yet, so these numbers show structural value, not final quality parity

Do not treat these numbers as universal. Compare on the same device, same build type, same font, and same corpus.

## Relationship to Pretext

This project is currently similar to `pretext` in the following areas:

- `prepare once + layout many`
- expose line layout output from prepared state
- allow simple non-breakable inline segments
- expose a cursor-style line streaming path for custom renderers
- support simple shape-aware relayout and line-break policy overrides
- amortize cold preparation over repeated relayouts

The key difference is the target architecture. The current implementation is explicitly renderer-oriented:

- mount 전에 paragraph geometry 를 얻고
- 같은 prepared paragraph state 를 여러 width / shape 에 대해 다시 흘리고
- `PreparedParagraphView`, custom native paragraph views, and future renderer paths that can consume precomputed line ranges directly

It is not yet equivalent to `pretext` as a full feature set. The current implementation is closer to a React Native native paragraph engine prototype than a full `pretext` clone, and today the clearest win appears when prepared state is consumed directly by a native renderer instead of being rematerialized back into plain RN `<Text>`.

## Development

```sh
yarn typecheck
yarn test --runInBand
yarn build
```

Useful example-specific commands:

```sh
cd example
yarn build:android
yarn build:ios
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

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
- machine-readable benchmark exports plus Maestro flows/scripts for `benchmark/base-text`, `benchmark/prepared-view`, and the combined benchmark suite

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

## Benchmark Automation

The benchmark pages expose machine-readable status/report lines so Maestro can run the scenario and print the measured numbers without parsing the visual summary cards by hand.

Top-level wrappers:

```sh
yarn benchmark:ios
yarn benchmark:android
```

What the wrappers do:

- root `package.json` delegates to `example/package.json`, so the benchmark entrypoint lives with the example app instead of forking script ownership
- iOS: runs the benchmark suite flow against the configured simulator device id
- Android: installs the embedded Maestro driver APKs if needed, starts the instrumentation server, forces IPv4 gRPC, and then runs the benchmark suite flow
- both wrappers: store debug artifacts under `.maestro-artifacts/<platform>-suite/`, parse the latest benchmark `JsConsole` events from `maestro.log`, and write a human-readable summary to `.maestro-artifacts/<platform>-suite/latest-summary.txt`

Environment overrides:

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial> yarn benchmark:android
```

If Maestro reports `iOS driver not ready in time`, restart the simulator and rerun the command. The benchmark flows themselves are machine-readable and were validated successfully on the release app; the flaky part is the local XCTest runner bootstrap.

## Latest Local Benchmark Snapshot

Latest Maestro-driven release snapshots on `2026-04-13`:

| Platform | Device / build                 | BaseText median | BaseText p95 | Prepared view median | Prepared view p95 | Layout-only median | Cold prepare | Native measure | Median delta |
| -------- | ------------------------------ | --------------- | ------------ | -------------------- | ----------------- | ------------------ | ------------ | -------------- | ------------ |
| Android  | Pixel 9 Pro emulator / Release | `32.20 ms`      | `38.76 ms`   | `21.81 ms`           | `23.62 ms`        | `3.81 ms`          | `21.06 ms`   | `15.54 ms`     | `-10.39 ms`  |
| iOS      | iPhone 16 simulator / Release  | `179.23 ms`     | `346.82 ms`  | `95.13 ms`           | `143.17 ms`       | `13.95 ms`         | `308.06 ms`  | `307.59 ms`    | `-84.10 ms`  |

Current reading of the numbers:

- the prepared native view path is already faster than plain RN `<Text>` in the repeated-relayout benchmark on both local release runs
- most cold cost is still in native measurement during `prepare*()`, not in JS object construction
- the renderer-oriented path is where the architecture currently pays off; `PreparedParagraphText` exists as a compatibility helper, but the main performance win comes from consuming prepared state directly from native
- the automated suite now measures exactly the relayout question we care about: BaseText vs prepared-native-view across the same width sequence, plus the hot-path layout-only cost

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

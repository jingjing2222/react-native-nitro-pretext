# react-native-nitro-pretext

React Native paragraph engine prototype built around prepared paragraph state.

The current goal is not to copy all of `pretext`. The implemented path is narrower and more renderer-oriented:

- prepare paragraph state once
- relayout the same paragraphs across many widths cheaply
- feed the prepared state into React Native, custom native views, or future renderer paths

## Status

Implemented today:

- native `measure()` and `measureBatch()`
- `prepareParagraphs()` and `prepareParagraphsWithStats()`
- repeated relayout with `layoutParagraphs()`, `layoutParagraphsMetadata()`, and `layoutParagraphLines()`
- `PreparedParagraphView`, a native paragraph surface that consumes `preparedId + paragraphIndex + width` directly
- split benchmark app with separate `BaseText` and `Prepared View` pages

Platform backends:

- Android: `MeasuredText + LineBreaker` on API 29+, token fallback below API 29
- iOS: `CTTypesetter`-based line breaking via CoreText

Not implemented yet:

- rich inline segments like mentions/chips/images
- cursor-based streaming APIs like `layoutNextLineRange()`
- locale and line-break policy controls such as `whiteSpace` and `wordBreak`
- shape-aware text flow
- renderer integrations beyond the current native paragraph view prototype

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
  layoutParagraphsMetadata,
  prepareParagraphsWithStats,
  type ParagraphStyle,
} from "react-native-nitro-pretext";

const style: ParagraphStyle = {
  fontFamily: "System",
  fontSize: 18,
  lineHeight: 28,
  letterSpacing: 0,
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

If you are building your own renderer, `layoutParagraphLines()` exposes explicit line ranges with `textStart`, `textEnd`, `top`, `width`, and `height`.

## Public API

- `measure(text, fontFamily, fontSize)`
- `measureBatch(texts, fontFamily, fontSize)`
- `prepareParagraphs(texts, style)`
- `prepareParagraphsWithStats(texts, style)`
- `layoutParagraphs(preparedId, width)`
- `layoutParagraphsMetadata(preparedId, width)`
- `layoutParagraphLines(preparedId, width)`
- `releaseParagraphs(preparedId)`
- `PreparedParagraphView`

## Benchmark App

The example app is intentionally split by page so each path can be measured independently.

- `Home`: combines the latest results from both pages
- `BaseText`: plain React Native `<Text>` baseline and line-count oracle
- `Prepared View`: prepared-state relayout plus native paragraph view rendering

Run the example app:

```sh
yarn example:android
yarn example:ios
```

For the current benchmark flow:

1. Run `BaseText` first.
2. Run `Prepared View` next.
3. Return to `Home` to compare the latest summaries.

The benchmark focuses on repeated width relayout, not first mount only.

## Latest Local Benchmark Snapshot

Latest local Android release run on `2026-04-13`:

- BaseText median interaction: `24.38 ms`
- BaseText p95 interaction: `31.27 ms`
- Prepared Native View median interaction: `19.33 ms`
- Prepared Native View p95 interaction: `21.96 ms`
- Prepared compute-only median: `1.41 ms`
- Cold prepare: `25.76 ms`
- Sample line parity mismatch: `15 / 240`

Interpretation:

- the prepared native view path currently beats plain RN `<Text>` end-to-end in the local release benchmark
- the architecture shows value mainly when prepared state is consumed directly by a renderer
- hot relayout is no longer the ultra-fast greedy prototype; accuracy was improved by moving to platform-native line breaking, so there is a real speed vs parity tradeoff

Do not treat these numbers as universal. Compare on the same device, same build type, same font, and same corpus.

## Relationship to Pretext

This project is currently similar to `pretext` in one specific area:

- `prepare once + layout many`
- expose line layout output from prepared state
- amortize cold preparation over repeated relayouts

It is not yet equivalent to `pretext` as a full feature set. The current implementation is closer to a React Native native paragraph engine prototype than a full `pretext` clone.

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

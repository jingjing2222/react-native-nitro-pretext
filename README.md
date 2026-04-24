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
- inline paragraph preparation with `InlineSegment[]`, segment-level font overrides, and `breakBehavior: "never"`
- repeated relayout with `layoutParagraphs()`, `layoutParagraphsMetadata()`, and `layoutParagraphLines()`
- request-based relayout with `whiteSpace`, `wordBreak`, `shapeSlices`, and `left`
- native request-level relayout cache on iOS and Android for repeated width / request reuse
- cursor-style streaming with `createParagraphLineCursor()` and `nextParagraphLine()`
- `PreparedParagraphView`, a native paragraph surface that consumes `preparedId + paragraphIndex + layoutRequest` directly
- `PreparedParagraphsView`, a batched native paragraph surface that renders a prepared corpus without mounting one RN `<Text>` per paragraph
- `PreparedParagraphLinesView`, a line-range renderer that consumes explicit line positions and places one RN `<Text>` node per line
- `PreparedParagraphText`, a React Native `<Text>` renderer that materializes prepared paragraph breaks on demand
- `layoutParagraphLinesWithDiagnostics()` for native engine, renderer, padding, break-table, boundary-map, and drift diagnostics
- `layoutRichParagraphLines()` with caller-supplied inline box metrics and returned `InlineBoxFrame[]`
- native prepared selection helpers: hit testing, selection rects, select-all, selected-text readback, and clipboard copy
- benchmark corpus helpers: `prepareBenchmarkCorpus()`, `layoutPreparedBenchmarkCorpus()`, and `releasePreparedBenchmarkCorpus()`
- split example app into dedicated `screens/benchmark/*` and `screens/examples/*` pages with React Navigation
- pretext-style comparison scenarios under `screens/examples/slites/*`
- machine-readable benchmark exports plus Maestro flows/scripts for `benchmark/base-text`, `benchmark/prepared-view`, and the combined benchmark suite
- benchmark quality gates with line-count parity, line-text parity, and CI execution on the iOS benchmark suite

Platform backends:

- Android: canonical `MeasuredText + LineBreaker` on API 29+, named legacy/token fallback below API 29
- iOS: Core Text `CTTypesetter + CTLine + CTLineDraw`

Not implemented yet:

- editing and paste support; prepared text is selectable/copyable, not an editable text input
- Android API 24-28 canonical parity; those versions remain supported only through named legacy fallback paths
- browser canvas pixel parity; diagnostics compare native engine traces instead
- full `pretext` feature parity for every advanced shaping and rich inline layout case

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
3. `PreparedParagraphsView` or `PreparedParagraphView`
   Render prepared state through native surfaces instead of materializing line objects through JS props.

## Usage

```ts
import {
  PreparedParagraphView,
  PreparedParagraphLinesView,
  PreparedParagraphText,
  copyPreparedTextSelection,
  createParagraphLayoutRequest,
  createParagraphLineCursor,
  hitTestPreparedTextPosition,
  layoutParagraphLinesWithDiagnostics,
  layoutParagraphLinesWithRequest,
  layoutParagraphsMetadata,
  layoutParagraphsMetadataWithRequest,
  layoutPreparedTextSelectionRects,
  layoutRichParagraphLines,
  nextParagraphLine,
  prepareInlineParagraphsWithStats,
  prepareParagraphsWithStats,
  selectAllPreparedText,
  type InlineSegment,
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

const { prepared, stats } = prepareParagraphsWithStats(
  [
    "같은 문단을 여러 폭으로 다시 흐르게 하는 prepared paragraph state",
  ],
  style,
);

const contentWidth = 320 - 14 * 2;
const request = createParagraphLayoutRequest(contentWidth, {
  shapeSlices: [
    { top: 0, height: 28, left: 0, width: contentWidth },
    { top: 28, height: 56, left: 36, width: contentWidth - 36 },
  ],
});
const [metrics] = layoutParagraphsMetadataWithRequest(prepared.id, request);

function Example() {
  return (
    <PreparedParagraphView
      contentInsetHorizontal={14}
      contentInsetVertical={14}
      layoutRequest={request}
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

If you want to consume explicit line ranges directly from JS:

```tsx
<PreparedParagraphLinesView
  contentInsetHorizontal={14}
  contentInsetVertical={14}
  layoutRequest={request}
  layoutWidth={contentWidth}
  paragraphIndex={0}
  paragraphStyle={style}
  paragraphText="같은 문단을 여러 폭으로 다시 흐르게 하는 prepared paragraph state"
  prepared={prepared}
  style={{ width: 320, borderRadius: 18, backgroundColor: "#fff" }}
/>
```

For inline content with styled runs, atomic boxes, and non-breakable spans:

```ts
const inlineParagraph: InlineSegment[] = [
  { text: "Prepared state can carry ", breakBehavior: "normal" },
  { text: "bold runs", breakBehavior: "normal", fontWeight: "700" },
  { text: ", ", breakBehavior: "normal" },
  { text: "italic emphasis", breakBehavior: "normal", fontStyle: "italic" },
  { text: ", a ", breakBehavior: "normal" },
  { kind: "box", boxId: "badge", width: 28, height: 22, baseline: 17, breakBehavior: "never" },
  { text: " badge, and ", breakBehavior: "normal" },
  { text: "@pretext", breakBehavior: "never", fontSize: 20, lineHeight: 30, fontWeight: "700" },
  { text: " while the rest can wrap normally.", breakBehavior: "normal" },
];

const inlinePrepared = prepareInlineParagraphsWithStats([inlineParagraph], style);
const [richLayout] = layoutRichParagraphLines(
  inlinePrepared.prepared.id,
  createParagraphLayoutRequest(280),
);
const badgeFrame = richLayout.boxFrames[0];

function InlineExample() {
  const [metrics] = layoutParagraphsMetadata(inlinePrepared.prepared.id, 280);

  return (
    <PreparedParagraphView
      contentInsetHorizontal={14}
      contentInsetVertical={14}
      layoutWidth={280}
      paragraphHeight={metrics.height}
      paragraphIndex={0}
      paragraphStyle={style}
      prepared={inlinePrepared.prepared}
      style={{ width: 320, borderRadius: 18, backgroundColor: "#fff" }}
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
const [diagnosticParagraph] = layoutParagraphLinesWithDiagnostics(
  prepared.id,
  request,
);
const cursor = createParagraphLineCursor(prepared.id, 0, request);
const firstLine = nextParagraphLine(cursor.id);
```

For native prepared selection, use `PreparedParagraphView` with `selectable`, or call the lower-level helpers directly:

```ts
const position = hitTestPreparedTextPosition(prepared.id, 0, request, 48, 12);
const selected = selectAllPreparedText(prepared.id, position.paragraphIndex);
const rects = layoutPreparedTextSelectionRects(prepared.id, selected, request);
const copiedText = copyPreparedTextSelection(prepared.id, selected);
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
- `layoutParagraphLinesWithDiagnostics(preparedId, request)`
- `layoutRichParagraphLines(preparedId, request)`
- `hitTestPreparedTextPosition(preparedId, paragraphIndex, request, x, y)`
- `layoutPreparedTextSelectionRects(preparedId, range, request)`
- `selectAllPreparedText(preparedId, paragraphIndex)`
- `getPreparedTextSelection(preparedId, range)`
- `copyPreparedTextSelection(preparedId, range)`
- `createParagraphLineCursor(preparedId, paragraphIndex, request)`
- `nextParagraphLine(cursorId)`
- `releaseParagraphLineCursor(cursorId)`
- `releaseParagraphs(preparedId)`
- `prepareBenchmarkCorpus(texts, fontFamily, fontSize)`
- `layoutPreparedBenchmarkCorpus(preparedId, width)`
- `releasePreparedBenchmarkCorpus(preparedId)`
- `PreparedParagraphView`
- `PreparedParagraphsView`
- `PreparedParagraphLinesView`
- `PreparedParagraphText`

Important public types and style fields:

- `ParagraphStyle.includeFontPadding?: boolean`: Android padding policy is explicit and defaults to `true` for RN `<Text>` compatibility.
- `ParagraphStyle.textDirection?: "auto" | "ltr" | "rtl"`: native engines own visual order; public ranges stay source UTF-16 offsets.
- `InlineSegment` supports text segments and box segments. Box segments use caller-supplied `boxId`, `width`, `height`, `baseline`, and `breakBehavior`.
- `InlineBoxFrame` reports the native frame for each box so React Native overlays can render non-text content without participating in text layout.
- `ParagraphLayoutDiagnostics`, `ParagraphBoundaryMap`, and `ParagraphComplexShapeCounters` expose engine, renderer, padding, break, grapheme, bidi, emoji, and fallback diagnostics.
- `PreparedTextPosition`, `PreparedTextRange`, and `PreparedTextSelectionRect` back prepared selection/copy surfaces.

## Benchmark App

The example app is intentionally split by page so each path can be measured independently.

- `Home`: combines the latest results from both benchmark pages
- `screens/benchmark/BenchmarkIndexScreen`: benchmark landing page
- `screens/benchmark/BaseTextBenchmarkScreen`: plain React Native `<Text>` compatibility baseline for parity comparison
- `screens/benchmark/PreparedParagraphViewBenchmarkScreen`: prepared-state relayout plus batched native paragraph rendering
- `screens/examples/ExampleIndexScreen`: examples landing page
- `screens/examples/PreparedViewExampleScreen`: native paragraph surface example
- `screens/examples/PreparedLinesExampleScreen`: explicit line-range renderer example
- `screens/examples/PreparedTextExampleScreen`: prepared-state-backed `<Text>` example
- `screens/examples/InlineSegmentsExampleScreen`: styled inline run example with a caller-supplied atomic box
- `screens/examples/LineCursorExampleScreen`: request-based relayout and cursor streaming example
- `screens/examples/slites/AccordionSliteScreen`: predict accordion height before opening
- `screens/examples/slites/BubblesSliteScreen`: search the smallest bubble width that preserves the same wrapped lines
- `screens/examples/slites/DynamicLayoutSliteScreen`: shape-aware relayout around an obstacle
- `screens/examples/slites/RichNoteSliteScreen`: prepared inline runs with non-breakable spans vs plain RN `<Text>`

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

1. Run `BaseText` first to capture the RN `<Text>` compatibility baseline.
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
- both wrappers: run the flows under `example/maestro/`, store debug artifacts under `example/.maestro-artifacts/<platform>-suite/`, parse the latest benchmark `JsConsole` events from `maestro.log`, and write a human-readable summary to `example/.maestro-artifacts/<platform>-suite/latest-summary.txt`
- the same run also writes `example/.maestro-artifacts/<platform>-suite/latest-gate.txt` and exits non-zero when the configured benchmark quality gate fails

Environment overrides:

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial> yarn benchmark:android
BENCHMARK_GATE_PROFILE=ci-debug yarn benchmark:ios
```

Current gate coverage:

- performance regression thresholds compare prepared view against the RN `<Text>` compatibility baseline with ratio-based limits plus absolute limits for prepare, measure, and layout-only hot path time
- parity coverage now checks both line counts and sampled rendered line text, not just line-count totals
- parity-contract coverage checks reported layout engine, renderer kind, parity role, Android `includeFontPadding`, and height metric source separately from timing thresholds
- CI runs the iOS benchmark suite and fails the workflow if the benchmark gate fails

If Maestro reports `iOS driver not ready in time`, restart the simulator and rerun the command. The benchmark flows themselves are machine-readable and were validated successfully on the release app; the flaky part is the local XCTest runner bootstrap.

## Latest Local Benchmark Snapshot

Latest validated iOS suite snapshot on `2026-04-24`, from [latest-summary.txt](example/.maestro-artifacts/ios-suite/latest-summary.txt).

The automated suite measures the current canonical paths:

- BaseText baseline: RN `<Text>` compatibility oracle, `rendererKind: "rn_text"`.
- Prepared compute: native line layout only, `rendererKind: "prepared_compute"`.
- Prepared render: batched native surface, `rendererKind: "prepared_native_batch"`.

Measured improvement against the existing RN `<Text>` baseline:

| API / path                                                            | Baseline                         | Current                    |        Delta |                             Improvement |
| --------------------------------------------------------------------- | -------------------------------- | -------------------------- | -----------: | --------------------------------------: |
| `PreparedParagraphsView` median interaction                           | BaseText `231.35 ms`             | Prepared batch `67.08 ms`  | `-164.27 ms` |                          `71.0% faster` |
| `PreparedParagraphsView` p95 interaction                              | BaseText `364.52 ms`             | Prepared batch `103.79 ms` | `-260.73 ms` |                          `71.5% faster` |
| `layoutParagraph*WithRequest()` hot relayout                          | RN internal layout               | `0.18 ms` layout-only      |          `—` |                isolated native hot path |
| `createParagraphLineCursor()` / `nextParagraphLine()`                 | RN internal line materialization | same prepared line records |          `—` | streams the `0.18 ms` hot-layout result |
| `prepareParagraphsWithStats()` / `prepareInlineParagraphsWithStats()` | no RN equivalent                 | `48.10 ms` once            |          `—` |  setup amortized after about 1 relayout |
| `measureBatch()` share of prepare                                     | no RN equivalent                 | `48.01 ms`                 |          `—` |                 `99.8%` of prepare time |

Prepared path improvement versus the earlier `2026-04-13` pre-batch/pre-cache prepared-view run:

| API / metric                    | Earlier prepared view | Current prepared batch |    Improvement |
| ------------------------------- | --------------------: | ---------------------: | -------------: |
| Prepared render median          |           `145.96 ms` |             `67.08 ms` | `54.0% faster` |
| Prepared render p95             |           `211.44 ms` |            `103.79 ms` | `50.9% faster` |
| Prepared layout-only median     |            `14.11 ms` |              `0.18 ms` | `98.7% faster` |
| `prepare*WithStats()` total     |            `55.92 ms` |             `48.10 ms` | `14.0% faster` |
| `measureBatch()` inside prepare |            `55.77 ms` |             `48.01 ms` | `13.9% faster` |

Current reading of the numbers:

- the primary performance win is the batched native renderer consuming prepared state directly
- hot relayout is no longer the bottleneck; it is `0.3%` of the prepared render interaction in the latest suite
- cold prepare remains measurement-bound, with native measurement taking `99.8%` of prepare time
- `PreparedParagraphText` and `PreparedParagraphLinesView` are compatibility/custom-renderer helpers; the latest automated suite does not claim separate speedups for those surfaces
- Android benchmark numbers are not included in this snapshot because no Android device was connected during the latest local verification

Do not treat these numbers as universal. Compare on the same device, same build type, same font, and same corpus.

Practical examples:

- split view, bottom sheet, or resizable card rails: the same paragraph set can relayout across a few widths without paying RN `<Text>` line layout each time
- chat bubbles: prepared metadata can search the tightest width that preserves the same wrapped lines before rendering the final bubble
- obstacle-aware editorial layouts: `shapeSlices` can narrow only the affected line bands instead of shrinking the entire paragraph
- inline note / mention UI: prepared inline segments can keep styled spans and `breakBehavior: "never"` handles stable across width changes

Scenario walkthrough:

- [iOS walkthrough video](example/.maestro-artifacts/videos/slites-ios-demo.mov)
- [Gesture telemetry](example/.maestro-artifacts/videos/slites-ios-demo.gesture-telemetry.json)

## Relationship to Pretext

This project is currently similar to `pretext` in the following areas:

- `prepare once + layout many`
- expose line layout output from prepared state
- expose multiple renderer paths over the same prepared paragraph contract
- allow styled inline text runs and simple non-breakable inline segments
- expose a cursor-style line streaming path for custom renderers
- support simple shape-aware relayout and line-break policy overrides
- amortize cold preparation over repeated relayouts

The key difference is the target architecture. The current implementation is explicitly renderer-oriented:

- mount 전에 paragraph geometry 를 얻고
- 같은 prepared paragraph state 를 여러 width / shape 에 대해 다시 흘리고
- `PreparedParagraphView`, shape-aware custom native paragraph views, and future renderer paths that can consume precomputed line ranges directly

It is not yet equivalent to `pretext` as a full feature set. The current implementation now carries mixed inline font runs through native shaping on iOS and Android, but it is still closer to a React Native native paragraph engine prototype than a full `pretext` clone. The clearest win still appears when prepared state is consumed directly by a native renderer instead of being rematerialized back into plain RN `<Text>`, and the remaining gap is in parity-perfect line breaking, richer inline objects, and deeper shaping coverage.

## Development

```sh
yarn typecheck
yarn lint
yarn fmt:check
yarn test --runInBand
yarn build
```

Useful example-specific commands:

```sh
yarn workspace react-native-nitro-pretext-example build:android
yarn workspace react-native-nitro-pretext-example build:ios
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

# react-native-nitro-pretext

Text height before render for React Native.

`react-native-nitro-pretext` is a layout-only native text engine. It lets a
screen ask for paragraph height, line count, line ranges, diagnostics, and rich
inline box frames before mounting the visible UI. It does not render text for
you, and it does not use hidden `<Text onLayout>` measurement views.

## Why It Exists

Many React Native layouts need text geometry before they can place visible
content:

- masonry cards
- chat bubbles that choose a tight width
- bottom sheets and split views
- dashboard annotations beside charts
- editorial layouts with shape constraints
- localized copy where emoji, fallback fonts, CJK, RTL, or complex scripts can
  change height

With plain RN `<Text>`, the common path is:

1. render a hidden measurement tree
2. wait for `onLayout` or `onTextLayout`
3. calculate the real layout
4. render the visible UI

Pretext moves step 1 and 2 into native text engines so height is available
before the visible surface mounts. That removes the hidden measurement
component, the `onLayout` callback fan-in, the second render pass, and the
layout shift that usually follows when measured height is applied after mount.

## Core API

```ts
import {
  Pretext,
  prepare,
  layout,
  usePretextLayout,
} from "react-native-nitro-pretext";
```

Manual lifecycle:

```ts
const prepared = prepare("Text that affects layout", {
  fontSize: 16,
  includeFontPadding: true,
});

const metrics = layout(prepared, 280);
const height = metrics.height;

prepared.release();
```

React lifecycle:

```tsx
const result = usePretextLayout({
  text: "Text that affects layout",
  width: 280,
  style: {
    fontSize: 16,
  },
  output: "metrics",
});
```

Namespace style is also supported:

```ts
const prepared = Pretext.prepare(text, style);
const metrics = Pretext.layout(prepared, width);
const height = metrics.height;
```

Use the object form when layout needs positioning rules:

```ts
const lines = layout(prepared, {
  width: 280,
  left: 12,
  output: "lines",
  shapeSlices: [{ top: 0, height: 96, left: 24, width: 256 }],
});
```

Rich inline boxes are prepared with inline segment paragraphs and caller-owned
box metrics, then read with `output: "rich"`. See the
[API Reference](docs/api.md) for the segment shape.

## What It Does Not Do

- No public renderer component.
- No native drawing surface.
- No hidden RN measurement view.
- No `fontSize * lineCount` height heuristic.
- No browser canvas pixel-parity target.

Your visible UI stays normal React Native `View` and `Text`. Pretext only
returns the layout data you need before render.

## Native Engines

Height is native text-engine output. It is affected by font metrics,
`lineHeight`, fallback fonts, emoji, locale, Android `includeFontPadding`, text
direction, and the platform line breaking strategy.

| Platform                 | Layout path                  | Status                                                         |
| ------------------------ | ---------------------------- | -------------------------------------------------------------- |
| Android API 24+          | RN-compatible `StaticLayout` | Canonical for normal-wrap requests without shape slices.       |
| iOS                      | TextKit normal-wrap layout   | Current benchmark gate path for normal text.                   |
| RN `<Text onTextLayout>` | strict parity oracle         | Dedicated Maestro contract for raw line count, text, geometry. |
| Visible RN `<Text>`      | final renderer               | Match styles carefully because Pretext does not draw pixels.   |

Android `includeFontPadding` defaults to `true` to match RN `<Text>` defaults.
If you turn it off in Pretext but leave RN `<Text>` at its default, height can
drift.
When `lineHeight` is omitted, Pretext uses platform font metrics instead of a
`fontSize` heuristic.
Diagnostics may report `android_static_layout_compat` on Android normal-wrap
paths, `android_legacy_fallback` on Android fallback paths, `ios_text_kit` on
iOS normal-wrap benchmark paths, `ios_core_text` on alternate iOS native line
layout paths, and `ios_manual_token_fallback` on degraded iOS fallback paths.

The native implementation is split by responsibility across preparation,
tokenization, line layout, diagnostics, constants, and native model files on
both Android and iOS.

## Compatibility

| Dependency                   | Package range | Example target                                       |
| ---------------------------- | ------------- | ---------------------------------------------------- |
| React                        | `*`           | Example app uses React `19.2.3`.                     |
| React Native                 | `>=0.81.0`    | Example app uses React Native `0.85.0`.              |
| `react-native-nitro-modules` | `*`           | Required runtime peer dependency.                    |
| Android                      | API 24+       | Normal-wrap requests use RN-compatible StaticLayout. |
| iOS                          | RN default    | Example app currently targets iOS 15.1.              |

Pretext keeps its React and `react-native-nitro-modules` peer ranges open as
`*` and documents/enforces its own React Native peer floor as `>=0.81.0`.
The bundled example app is on React `19.2.3` and React Native `0.85.0`.

## Performance Snapshot

Benchmarks are platform-specific. The current normal-wrap gate expects iOS
TextKit and Android RN-compatible StaticLayout metadata, so their numbers should
be reported separately and never averaged together.

The most important comparison is the path an app would otherwise build with RN
only:

| Path                            | What happens before visible UI is stable                                            |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Hidden RN `<Text>` + `onLayout` | Mount hidden measurement tree, wait for callbacks, apply height, render visible UI. |
| `prepare()` + `layout()`        | Measure in the native text engine first, then render visible UI with known height.  |

Latest Maestro timing snapshot:

| Platform       | Target                               | RN `<Text>` median | Pretext visible surface median | Delta vs RN | Pretext hot layout median | Prepare once |
| -------------- | ------------------------------------ | -----------------: | -----------------------------: | ----------: | ------------------------: | -----------: |
| iOS            | iPhone 16 simulator, iOS 18.5, debug |        `234.94 ms` |                    `228.76 ms` |  `-6.18 ms` |                 `0.19 ms` |   `55.62 ms` |
| Android API 36 | Pixel_9_Pro AVD, API 36, debug       |         `70.65 ms` |                     `86.33 ms` | `+15.68 ms` |                 `0.10 ms` |  `155.28 ms` |

Negative delta means the Pretext visible surface was faster in that run;
positive delta means it was slower. The visible-surface number includes the
final RN `<Text>` render. The hot-layout number is the layout-only relayout
cost after paragraph state has already been prepared.

Hot relayout compute improvement:

| Platform       | Hot layout compute vs RN `<Text>` median | Relative compute speedup |
| -------------- | ---------------------------------------: | -----------------------: |
| iOS            |                                  `99.9%` |                `1236.5x` |
| Android API 36 |                                  `99.9%` |                 `706.5x` |

The measured-layout case study is the render optimization claim: Pretext
removes the hidden measurement `<Text>` surface, so the screen does not need a
measurement render followed by a corrected visible render. The Maestro timing
suite is a different contract: it includes the final visible RN `<Text>`
surface. On the Android API 36 run above, the hot layout path was `0.10 ms`, but
the full visible-surface median was slower than RN by `15.68 ms`; that visible
surface number is reported as context, not as the layout-only gate.

Strict raw RN `<Text onTextLayout>` parity contract:

| Platform       | Contract source                     | Cases | Line count | Line text | Geometry | Status |
| -------------- | ----------------------------------- | ----: | ---------: | --------: | -------: | ------ |
| iOS            | 259 strict raw Maestro parity cases |   259 |      0/259 |     0/259 |    0/259 | Passed |
| Android API 36 | 259 strict raw Maestro parity cases |   259 |      0/259 |     0/259 |    0/259 | Passed |

The parity contract is no longer derived from repeated timing samples. It is a
dedicated Maestro flow that executes 259 unique cases once per platform and
requires line-count, exact raw line-text, and line-geometry parity to be
`0/259`. The line-text comparison does not trim, normalize, or collapse newline,
trailing whitespace, tab, or NBSP characters; display output may JSON-escape
raw values, but comparison uses the unmodified RN payload.

Current benchmark details and gate thresholds are in the
[Benchmark Report](docs/benchmark-improvement-report.md).

## Install

```sh
npm install react-native-nitro-pretext react-native-nitro-modules
```

`react-native-nitro-modules` is required because Pretext is exposed as a Nitro
Module.

React and React Native are peer dependencies supplied by your app. Pretext
declares React Native `>=0.81.0` as its peer minimum. The bundled example app
is currently on React `19.2.3` and React Native `0.85.0`.

## Example App

The example app is split into learning examples and benchmark routes:

- `examples/use-case`: API-matched Pretext examples for `prepare`, `layout`
  outputs, `usePretextLayout`, and the `Pretext` namespace.
- `examples/non-use-case`: matching RN-only workarounds that show the hidden
  `<Text>`, `onLayout`, `onTextLayout`, callback fan-in, and render-pass state
  you would otherwise manage yourself.
- `benchmark/measured-layout`: case study for hidden RN measurement versus
  `Pretext.layout()` before render.
- `benchmark/parity`: RN `<Text>` parity contract using 259 unique Maestro
  cases.
- `benchmark/base-text` and `benchmark/pretext-layout`: benchmark screens for
  compatibility, timing, and parity diagnostics.

Run it locally:

```sh
yarn example:ios
yarn example:android
```

If local Watchman is broken, the example Metro config already falls back to the
Node filesystem watcher.

## Documentation

- [API Reference](docs/api.md)
- [Benchmark Report](docs/benchmark-improvement-report.md)
- [Contributing](CONTRIBUTING.md)

## Development

```sh
yarn nitrogen
yarn typecheck
yarn lint
yarn fmt:check
yarn test
yarn verify:api-examples
yarn verify:native-source-size
yarn build
yarn verify:package-exports
yarn verify:package-contents
```

CI runs the static, unit, package, and native build checks above. Maestro device
flows are manual only because they depend on installed apps, simulators/devices,
Metro, and API/example routes that may intentionally change.

Manual Maestro runs:

```sh
yarn examples:ios
yarn examples:android
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:android
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:parity:android
```

Benchmark scripts write the latest summary and quality-gate report under
`example/.maestro-artifacts/<platform>-<flow>/latest-summary.txt` and
`example/.maestro-artifacts/<platform>-<flow>/latest-gate.txt`.
`BENCHMARK_SKIP_GATE=1` writes a skipped gate report for artifact capture only;
do not report that as a benchmark result. `.maestro-artifacts` is ignored by git,
so any `latest-gate.txt` there is generated output, not a tracked result. Parity
runs also write:

- `example/.maestro-artifacts/ios-parity/latest-parity-summary.txt`
- `example/.maestro-artifacts/ios-parity/latest-parity-mismatches.json`
- `example/.maestro-artifacts/ios-parity/latest-parity-contracts.json`
- `example/.maestro-artifacts/android-parity/latest-parity-summary.txt`
- `example/.maestro-artifacts/android-parity/latest-parity-mismatches.json`
- `example/.maestro-artifacts/android-parity/latest-parity-contracts.json`

Example native builds:

```sh
yarn workspace react-native-nitro-pretext-example build:android
yarn workspace react-native-nitro-pretext-example build:ios
```

## License

MIT

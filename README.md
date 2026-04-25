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

| Platform          | Layout path                       | Status                                                              |
| ----------------- | --------------------------------- | ------------------------------------------------------------------- |
| Android API 29+   | `MeasuredText + LineBreaker`      | Canonical for normal-wrap requests without shape slices.            |
| Android API 24-28 | `StaticLayout` compat/fallback    | Supported, but not the canonical parity path.                       |
| iOS               | Core Text `CTTypesetter + CTLine` | Canonical iOS path.                                                 |
| RN `<Text>`       | final visible renderer            | Not the correctness source. Match styles carefully to reduce drift. |

Android `includeFontPadding` defaults to `true` to match RN `<Text>` defaults.
If you turn it off in Pretext but leave RN `<Text>` at its default, height can
drift.
When `lineHeight` is omitted, Pretext uses platform font metrics instead of a
`fontSize` heuristic.
Diagnostics may report `android_static_layout_compat` or
`android_legacy_fallback` on Android fallback paths, and
`ios_manual_token_fallback` on degraded iOS fallback paths. Android API 24-28
StaticLayout diagnostics include `fallbackReason: "static_layout_compat"`.

The native implementation is split by responsibility across preparation,
tokenization, line layout, diagnostics, constants, and native model files on
both Android and iOS.

## Compatibility

| Dependency                   | Package range | Current validation                                      |
| ---------------------------- | ------------- | ------------------------------------------------------- |
| React                        | `*`           | Example app and local checks use React `19.2.3`.        |
| React Native                 | `>=0.81.0`    | Example app and local checks use React Native `0.85.0`. |
| `react-native-nitro-modules` | `*`           | Required runtime peer dependency.                       |
| Android                      | API 24+       | API 29+ normal-wrap requests are the canonical target.  |
| iOS                          | RN default    | Example app currently targets iOS 15.1.                 |

Pretext keeps its React and `react-native-nitro-modules` peer ranges open as
`*` and documents/enforces its own React Native peer floor as `>=0.81.0`.
Current local validation is on React `19.2.3` and React Native `0.85.0`.

## Performance Snapshot

Benchmarks are platform-specific. iOS uses Core Text and Android API 29+ uses
`MeasuredText + LineBreaker`, so their numbers should be reported separately and
never averaged together.

The most important comparison is the path an app would otherwise build with RN
only:

| Path                            | What happens before visible UI is stable                                            |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Hidden RN `<Text>` + `onLayout` | Mount hidden measurement tree, wait for callbacks, apply height, render visible UI. |
| `prepare()` + `layout()`        | Measure in the native text engine first, then render visible UI with known height.  |

Latest local measured-layout case study:

| Platform       | Target                                    | RN hidden measure time | Pretext layout time | Render passes | Layout shifts | Status           |
| -------------- | ----------------------------------------- | ---------------------: | ------------------: | ------------: | ------------: | ---------------- |
| iOS            | iPhone 16 simulator, debug, April 24 2026 |            `129.16 ms` |           `1.55 ms` |      `2 -> 1` |      `1 -> 0` | Verified locally |
| Android API 36 | Pixel_9_Pro AVD, debug, April 25 2026     |            `174.95 ms` |           `8.59 ms` |      `2 -> 1` |      `1 -> 0` | Verified locally |

Improvement headline:

| Platform       | Stable-height path improved by | Time removed before visible UI is stable | Relative speedup |
| -------------- | -----------------------------: | ---------------------------------------: | ---------------: |
| iOS            |                        `98.8%` |                              `127.61 ms` |          `83.3x` |
| Android API 36 |                        `95.1%` |                              `166.36 ms` |          `20.4x` |

`Stable-height path improved by` is calculated as
`(RN hidden measure time - Pretext layout time) / RN hidden measure time`.

Latest local Maestro timing snapshot:

| Platform       | RN `<Text>` median | Pretext visible surface median | Pretext hot layout median | Prepare once | Status                                |
| -------------- | -----------------: | -----------------------------: | ------------------------: | -----------: | ------------------------------------- |
| iOS            |        `247.11 ms` |                    `230.95 ms` |                 `0.23 ms` |   `47.40 ms` | Debug simulator suite passed          |
| Android API 36 |         `54.55 ms` |                     `85.01 ms` |                 `0.06 ms` |  `140.01 ms` | Debug AVD suite and local gate passed |

Hot relayout compute improvement:

| Platform       | Hot layout compute vs RN `<Text>` median | Relative compute speedup |
| -------------- | ---------------------------------------: | -----------------------: |
| iOS            |                                  `99.9%` |                `1074.4x` |
| Android API 36 |                                  `99.9%` |                 `909.2x` |

The measured-layout case study is the render optimization claim: Pretext
removes the hidden measurement `<Text>` surface, so the screen does not need a
measurement render followed by a corrected visible render. The Maestro timing
suite is a different contract: it includes the final visible RN `<Text>`
surface. On the Android debug AVD run, the hot layout path was `0.06 ms`, but
the full visible-surface median was slower than RN by `30.46 ms`; that visible
surface number is reported as context, not as the layout-only gate.

Current benchmark details and validation limits are in the
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
- `benchmark/base-text` and `benchmark/pretext-layout`: validation screens for
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

Manual Maestro validation:

```sh
yarn examples:ios
yarn examples:android
```

Example native builds:

```sh
yarn workspace react-native-nitro-pretext-example build:android
yarn workspace react-native-nitro-pretext-example build:ios
```

## License

MIT

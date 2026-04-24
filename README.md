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
before the visible surface mounts.

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
| Android API 29+   | `MeasuredText + LineBreaker`      | Canonical Android path for performance and accuracy claims.         |
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

## Compatibility

| Dependency                   | Supported range | Current validation                                      |
| ---------------------------- | --------------- | ------------------------------------------------------- |
| React Native                 | `0.81+`         | Example app and local CI use React Native `0.85.0`.     |
| `react-native-nitro-modules` | `^0.35.5`       | Required runtime peer dependency.                       |
| `nitrogen`                   | `^0.35.5`       | Required for generated Nitro bridge files in this repo. |
| Android                      | API 24+         | API 29+ is the canonical Android performance target.    |
| iOS                          | RN default      | Example app currently targets iOS 15.1.                 |

The Nitro Modules package currently publishes broad React Native peer metadata,
so Pretext documents and enforces its own package support floor as React Native
`0.81+`.

## Performance Snapshot

Latest local iOS example validation: April 24, 2026, iPhone 16 simulator,
debug build.

| Path                             |        Time | Notes                                             |
| -------------------------------- | ----------: | ------------------------------------------------- |
| Hidden RN `<Text>` + `onLayout`  | `129.16 ms` | Two render passes, one layout shift.              |
| `Pretext.layout()` before render |   `1.55 ms` | One visible render pass, no layout shift.         |
| Example improvement              |     `98.8%` | Demonstration screen, not release-device CI.      |
| RN `<Text>` benchmark median     | `247.11 ms` | iOS debug simulator suite.                        |
| Pretext surface median           | `230.95 ms` | Layout before the final RN surface.               |
| Maestro hot layout median        |   `0.23 ms` | iOS debug simulator suite, Core Text layout only. |

Current benchmark details and validation limits are in the
[Benchmark Report](docs/benchmark-improvement-report.md). Android
release-device numbers are not published yet. The latest local Android attempt
had no connected `adb` target and the available AVD failed to boot, so Android
speedup claims should wait for a successful API 29+ target-device run.

## Install

```sh
npm install react-native-nitro-pretext react-native-nitro-modules
```

`react-native-nitro-modules` is required because Pretext is exposed as a Nitro
Module.

Pretext supports React Native `0.81+`. The bundled example app is currently on
React Native `0.85.0`.

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
yarn build
yarn verify:package-exports
```

Example Maestro validation:

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

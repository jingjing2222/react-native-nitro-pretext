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

PreText moves step 1 and 2 into native text engines so height is available
before the visible surface mounts.

## Core API

```ts
import {
  PreText,
  prepare,
  layout,
  usePreTextLayout,
} from "react-native-nitro-pretext";
```

Manual lifecycle:

```ts
const prepared = prepare("Text that affects layout", {
  fontFamily: "System",
  fontSize: 16,
  lineHeight: 24,
  includeFontPadding: true,
});

const result = layout(prepared, { width: 280 });
const height = result.paragraphs[0]?.height ?? 0;

prepared.release();
```

React lifecycle:

```tsx
const result = usePreTextLayout({
  text: "Text that affects layout",
  width: 280,
  style: {
    fontFamily: "System",
    fontSize: 16,
    lineHeight: 24,
  },
  output: "metrics",
});
```

Namespace style is also supported:

```ts
const prepared = PreText.prepare(text, style);
const metrics = PreText.layout(prepared, { width });
```

## What It Does Not Do

- No public renderer component.
- No native drawing surface.
- No hidden RN measurement view.
- No `fontSize * lineCount` height heuristic.
- No browser canvas pixel-parity target.

Your visible UI stays normal React Native `View` and `Text`. PreText only
returns the layout data you need before render.

## Native Engines

Height is native text-engine output. It is affected by font metrics,
`lineHeight`, fallback fonts, emoji, locale, Android `includeFontPadding`, text
direction, and the platform line breaking strategy.

| Platform          | Layout path                       | Status                                                              |
| ----------------- | --------------------------------- | ------------------------------------------------------------------- |
| Android API 29+   | `MeasuredText + LineBreaker`      | Canonical Android path for performance and accuracy claims.         |
| Android API 24-28 | named legacy fallback             | Supported, but not the canonical parity path.                       |
| iOS               | Core Text `CTTypesetter + CTLine` | Canonical iOS path.                                                 |
| RN `<Text>`       | final visible renderer            | Not the correctness source. Match styles carefully to reduce drift. |

Android `includeFontPadding` defaults to `true` to match RN `<Text>` defaults.
If you turn it off in PreText but leave RN `<Text>` at its default, height can
drift.

## Performance Snapshot

Latest local iOS example validation: April 24, 2026, iPhone 16 simulator,
debug build.

| Path                             |        Time | Notes                                        |
| -------------------------------- | ----------: | -------------------------------------------- |
| Hidden RN `<Text>` + `onLayout`  | `129.16 ms` | Two render passes, one layout shift.         |
| `PreText.layout()` before render |   `1.55 ms` | One visible render pass, no layout shift.    |
| Example improvement              |     `98.8%` | Demonstration screen, not release-device CI. |

Historical iOS release-style benchmark data and validation limits are in the
[Benchmark Report](docs/benchmark-improvement-report.md). Android
release-device numbers are not published yet, so Android speedup claims should
wait for a target-device run. Android correctness and performance expectations
are API 29+ unless stated otherwise.

## Install

```sh
npm install react-native-nitro-pretext react-native-nitro-modules
```

`react-native-nitro-modules` is required because PreText is exposed as a Nitro
Module.

## Example App

The example app focuses on the layout-only problem:

- `examples/measured-layout`: hidden RN `<Text onLayout>` measurement versus
  `PreText.layout()` before render
- `benchmark/*`: compatibility and benchmark screens used during validation

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
yarn typecheck
yarn lint
yarn fmt:check
yarn test
yarn build
```

Example native builds:

```sh
yarn workspace react-native-nitro-pretext-example build:android
yarn workspace react-native-nitro-pretext-example build:ios
```

## License

MIT

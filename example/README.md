# Pretext Example App

This workspace demonstrates the layout-only Pretext API inside a real React
Native app. API examples are separate from benchmark screens so users can learn
the public API without timing and parity noise.

The package peer floor is React Native `>=0.81.0`, and
`react-native-nitro-modules` is accepted as `*`. This example workspace uses
React Native `0.85.0`.

## Setup

Run from the repository root:

```sh
yarn
yarn nitrogen
```

Start Metro in one terminal:

```sh
yarn workspace react-native-nitro-pretext-example start
```

Run the app in another terminal:

```sh
yarn example:ios
yarn example:android
```

Native code changes require rebuilding the example app. TypeScript-only library
changes usually update through Metro.

Run the optional Maestro flows manually after the app is installed and Metro is
running. These flows are intentionally not part of CI because they depend on
device/simulator state and route-level example contracts:

```sh
yarn examples:ios
yarn examples:android
```

## Screens

Learning routes:

- `examples`: examples catalog.
- `examples/use-case`: Pretext API examples matched to `docs/api.md`.
- `examples/use-case/prepare`: `prepare(text, style)` lifecycle.
- `examples/use-case/layout-metrics`: `layout(..., output: "metrics")`.
- `examples/use-case/layout-options`: width shorthand, object requests, and
  rule options.
- `examples/use-case/layout-lines`: line ranges and geometry.
- `examples/use-case/layout-diagnostics`: engine, request, drift, and boundary
  diagnostics.
- `examples/use-case/layout-rich`: inline box segments and returned box frames.
- `examples/use-case/use-pretext-layout`: React hook lifecycle.
- `examples/use-case/namespace-and-types`: `Pretext.*` namespace and exported
  types.

RN-only contrast routes:

- `examples/non-use-case`: plain RN workaround catalog.
- `examples/non-use-case/prepare`: hidden measurement cache instead of
  `prepare()`.
- `examples/non-use-case/layout-metrics`: hidden `<Text onLayout>` height
  measurement.
- `examples/non-use-case/layout-options`: caller-managed rule state.
- `examples/non-use-case/layout-lines`: `onTextLayout` line data gaps.
- `examples/non-use-case/layout-diagnostics`: missing engine and drift data.
- `examples/non-use-case/layout-rich`: nested `<Text>` without stable box
  frames.
- `examples/non-use-case/use-pretext-layout`: custom hook around hidden
  measurement lifecycle.

Benchmark routes:

- `benchmark`: benchmark catalog.
- `benchmark/base-text`: RN `<Text>` compatibility baseline.
- `benchmark/pretext-layout`: Pretext layout benchmark screen.
- `benchmark/parity`: 240 unique-case RN `<Text>` parity contract.
- `benchmark/measured-layout`: case study for hidden RN measurement versus
  `Pretext.layout()` before render.

## Native Builds

Use these commands when you need a build without launching the CLI run command:

```sh
yarn workspace react-native-nitro-pretext-example build:ios
yarn workspace react-native-nitro-pretext-example build:android
```

For iOS device signing, see the scripts in `example/package.json`. Simulator
runs default to `iPhone 16`; set `IOS_SIMULATOR` when you need another target.

## Benchmarks

The benchmark scripts are Maestro drivers. They expect the example app to
already be installed and, for debug builds, Metro to already be running.

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:android
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:parity:android
```

Android canonical benchmark claims require API 29+ because the canonical
Android engine is `MeasuredText + LineBreaker`. API 24-28 runs use
`StaticLayout` compat or legacy fallback paths only.

Latest local benchmark status:

- iOS `benchmark` suite: passed on April 24, 2026 with an iPhone 16 simulator.
- Android `benchmark` suite: completed on April 25, 2026 with a Pixel_9_Pro AVD
  on API 36. The canonical engine metadata and local layout-only gate passed.
- Android `benchmark/measured-layout`: verified on the same API 36 AVD. Hidden
  RN `<Text>` + `onLayout` reached first stable height in `174.95 ms`;
  `Pretext.layout()` returned the needed layout data in `8.59 ms`.
- RN `<Text>` parity suite: passed on April 25, 2026 on iOS and Android with
  240 unique Maestro cases and `0/240` line-count, line-text, and geometry
  mismatches.

## Example Verification

The API example map is verified from the repository root:

```sh
yarn verify:api-examples
```

That gate checks `docs/api.md`, `apiExampleManifest`, navigation types, linking
config, registered stack screens, example index cards, and automation report
fields. Device-level example coverage is in:

```sh
yarn examples:ios
yarn examples:android
```

## Useful Commands

```sh
yarn typecheck
yarn lint
yarn fmt:check
yarn test
yarn verify:api-examples
```

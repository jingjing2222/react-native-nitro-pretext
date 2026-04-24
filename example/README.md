# PreText Example App

This workspace demonstrates the layout-only PreText API inside a real React
Native app. The main example compares hidden RN `<Text onLayout>` measurement
with `PreText.layout()` height calculation before render.

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

## Screens

- `examples/measured-layout`: hidden RN `<Text onLayout>` measurement versus
  `PreText.layout()` before render.
- `benchmark/base-text`: RN `<Text>` compatibility baseline.
- `benchmark/pretext`: PreText layout benchmark screens.
- `benchmark/results`: benchmark summary and parity diagnostics.

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
```

Android canonical benchmark claims require API 29+ because the canonical
Android engine is `MeasuredText + LineBreaker`. API 24-28 runs use the legacy
fallback path only.

## Useful Commands

```sh
yarn typecheck
yarn lint
yarn fmt:check
yarn test
```

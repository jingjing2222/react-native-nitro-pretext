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
- `benchmark/parity`: 260-case strict parity contract covering raw RN
  `<Text>` line output plus a `shapeSlices` narrow-slot, blocked-row, and
  multi-slot structural case.
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

For release Maestro snapshots, install a release app before running the flows:

```sh
xcodebuild -workspace example/ios/PretextExample.xcworkspace \
  -scheme PretextExample \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=<simulator-udid>' \
  -derivedDataPath example/ios/build \
  build
xcrun simctl install <simulator-udid> \
  example/ios/build/Build/Products/Release-iphonesimulator/PretextExample.app

(cd example/android && ./gradlew assembleRelease --no-daemon --console=plain \
  -PreactNativeArchitectures=arm64-v8a)
adb -s <adb-serial> install -r \
  example/android/app/build/outputs/apk/release/app-release.apk
```

## Benchmarks

The benchmark scripts are Maestro drivers. They expect the example app to
already be installed and, for debug builds, Metro to already be running.
Release builds do not use Metro.

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:android
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:parity:android
```

Android normal-wrap benchmark claims currently use the RN-compatible
`StaticLayout` path on the API 36 AVD. Android API 24+ is supported,
but rerun the target device/API before making device-specific performance or
parity claims.

Benchmark scripts write the latest summary and quality-gate report under
`example/.maestro-artifacts/<platform>-<flow>/latest-summary.txt` and
`example/.maestro-artifacts/<platform>-<flow>/latest-gate.txt`.
`BENCHMARK_SKIP_GATE=1` writes a skipped gate report for artifact capture only;
do not report that as a benchmark result. `.maestro-artifacts` is ignored by git,
so generated `latest-gate.txt` files must be regenerated before making a parity
claim.
Parity runs also write `latest-parity-summary.txt`,
`latest-parity-mismatches.json`, and `latest-parity-contracts.json` in the
matching `ios-parity` or `android-parity` artifact directory. The parity
comparator uses raw RN `onTextLayout` line text exactly; escaped values in the
artifact files are for display only.

Latest benchmark runs:

- iOS `benchmark` suite: April 26, 2026 on iPhone 16 simulator, iOS 18.5,
  Release app. RN median `188.11 ms`, Pretext visible median `197.40 ms`,
  layout-only median `0.02 ms`.
- Android `benchmark` suite: April 26, 2026 on Pixel_9_Pro AVD, API 36,
  release APK. RN median `23.80 ms`, Pretext visible median `22.43 ms`,
  layout-only median `0.03 ms`.
- RN `<Text>`/`shapeSlices` parity suite: April 26, 2026 on the same Release
  iOS app and Android release APK with 260 Maestro cases and `0/260`
  line-count, line-text, and geometry mismatches.

## Example Verification

The API example map is verified from the repository root:

```sh
yarn verify:api-examples
```

The draggable `examples/pretext-react-native-example` page also has a Maestro
flow that performs 20 circle moves across a 3x3 preview grid and asserts the
exported geometry report keeps both the final state and every sampled motion
state outside the obstacle (`intrudingLineCount: 0`,
`motionMaxIntrudingLineCount: 0`) while visiting all cells `1` through `9`:

```sh
maestro --platform ios test example/maestro/flows/examples/pretext-react-native-example.yaml
maestro --platform android test example/maestro/flows/examples/pretext-react-native-example.yaml
```

Latest Release run on April 26, 2026 passed on iOS and Android:

| Platform | Moves | Visited grid cells  | Final intrusions | Motion max intrusions | Motion min clearance |
| -------- | ----: | ------------------- | ---------------: | --------------------: | -------------------: |
| iOS      |    20 | `1,2,3,4,5,6,7,8,9` |                0 |                     0 |                 `20` |
| Android  |    20 | `1,2,3,4,5,6,7,8,9` |                0 |                     0 |              `19.99` |

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

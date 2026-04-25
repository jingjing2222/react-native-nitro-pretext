# Benchmark Report

This document records benchmark and parity-contract status for the layout-only
Pretext API. Raw Maestro outputs are not linked here because generated artifacts
are not part of the package.

## Current Benchmark Status

| Platform                    | Status                                          | Notes                                                                     |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| iOS                         | release benchmark suite and parity run recorded | Current suite gate expects `ios_text_kit`.                                |
| Android API 36              | release benchmark suite and parity run recorded | Current Android suite uses the RN-compatible StaticLayout path.           |
| Android API 24+ support     | normal-wrap StaticLayout path supported         | Rerun the target device/API before making device-specific claims.         |
| RN `<Text>` / `shapeSlices` | dedicated parity contract                       | `benchmark:parity:*` requires 260 completed cases and `0/260` mismatches. |

Do not extrapolate Android performance from iOS numbers. The numbers below are
local release simulator/AVD snapshots, not physical-device speedup claims.

## Layout-Only Example Snapshot

Measured-layout iOS screen snapshot:

- Date: April 24, 2026
- Device target: iPhone 16 simulator
- Build mode: debug
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Screen: `benchmark/measured-layout`

| Path                            |        Time | Render passes | Layout shifts |
| ------------------------------- | ----------: | ------------: | ------------: |
| Hidden RN `<Text>` + `onLayout` | `129.16 ms` |             2 |             1 |
| `Pretext.layout()`              |   `1.55 ms` |             1 |             0 |
| Improvement                     |     `98.8%` |           n/a |           n/a |

Measured-layout Android screen snapshot:

- Date: April 25, 2026
- Device target: Pixel_9_Pro AVD, Android API 36
- Build mode: debug app with Metro
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Screen: `benchmark/measured-layout`

| Path                            |        Time | Render passes | Layout shifts |
| ------------------------------- | ----------: | ------------: | ------------: |
| Hidden RN `<Text>` + `onLayout` | `174.95 ms` |             2 |             1 |
| `Pretext.layout()`              |   `8.59 ms` |             1 |             0 |
| Improvement                     |     `95.1%` |           n/a |           n/a |

This screen is a product-shaped demonstration, not a release-device benchmark.
It shows the core value of the public API: text height is available before the
visible RN surface mounts. It is not part of the timed Maestro benchmark suite
or benchmark gate.

API learning examples are intentionally separate from this case study. They live
under `examples/use-case/*`, with matching plain RN workarounds under
`examples/non-use-case/*`.

## Current Maestro Parity Contract

RN `<Text>` parity is a dedicated strict raw Maestro contract, not a count
inflated by repeated timing benchmark samples. The contract source is 260
cases: 259 raw RN `<Text onTextLayout>` cases plus one structural
`shapeSlices` case that verifies narrow-slot skips, blocked rows, same-row
multi-slot output, and gap containment. Each case has a stable `caseId`, text,
width, style, and category, and is executed once per platform. The source of
truth for raw RN text cases is RN's `onTextLayout` line payload; line text is
compared without trimming, normalization, newline folding, trailing whitespace
removal, tab conversion, or NBSP conversion.

Latest parity run:

- Date: April 26, 2026
- iOS target: iPhone 16 simulator, iOS 18.5
- Android target: Pixel_9_Pro AVD, Android API 36
- Build mode: iOS Release simulator app and Android release APK, Metro not running
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Gate: pass on iOS and Android

| Platform | Cases | Mismatches | Line count | Line text | Geometry | Contract candidates |
| -------- | ----: | ---------: | ---------: | --------: | -------: | ------------------: |
| iOS      |   260 |          0 |      0/260 |     0/260 |    0/260 |                   0 |
| Android  |   260 |          0 |      0/260 |     0/260 |    0/260 |                   0 |

Manual parity commands:

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:parity:android
```

Parity artifacts:

- `example/.maestro-artifacts/ios-parity/latest-parity-summary.txt`
- `example/.maestro-artifacts/ios-parity/latest-parity-mismatches.json`
- `example/.maestro-artifacts/ios-parity/latest-parity-contracts.json`
- `example/.maestro-artifacts/android-parity/latest-parity-summary.txt`
- `example/.maestro-artifacts/android-parity/latest-parity-mismatches.json`
- `example/.maestro-artifacts/android-parity/latest-parity-contracts.json`

Each benchmark run also writes `latest-summary.txt` and `latest-gate.txt` under
`example/.maestro-artifacts/<platform>-<flow>/`. If `BENCHMARK_SKIP_GATE=1` is
set, `latest-gate.txt` records `status skipped` for artifact capture only and
must not be reported as a benchmark result. The artifact directory is ignored by
git, so files there are caches from the most recent run. Raw Maestro logs remain under that same directory at
`.maestro/tests/<timestamp>/maestro.log`.

## iOS Maestro Timing Snapshot

Latest iOS benchmark suite:

- Date: April 26, 2026
- Device target: iPhone 16 simulator, iOS 18.5
- Build mode: Release simulator app, Metro not running
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Flow: `benchmark` suite
- Maestro gate profile: default timing thresholds
- Gate: pass

| Metric                 | RN baseline | Pretext layout + RN surface |      Delta |
| ---------------------- | ----------: | --------------------------: | ---------: |
| Interaction median     | `188.11 ms` |                 `197.40 ms` | `+9.29 ms` |
| Interaction p95        | `350.58 ms` |                 `357.65 ms` | `+7.07 ms` |
| Layout-only median     | RN internal |                   `0.02 ms` |        n/a |
| Prepare once           |         n/a |                  `44.72 ms` |        n/a |
| Measure inside prepare |         n/a |                  `44.39 ms` |        n/a |

Reported paths:

| Path           | Engine           | Role                         |
| -------------- | ---------------- | ---------------------------- |
| RN baseline    | `rn_text_compat` | `rn_text_compat_oracle`      |
| Pretext layout | `ios_text_kit`   | `canonical_prepared_compute` |

Dedicated parity contract:

| Bucket               | Mismatches |
| -------------------- | ---------: |
| Line-count parity    |    `0/260` |
| Line-text parity     |    `0/260` |
| Line-geometry parity |    `0/260` |

This is measured by the dedicated `benchmark:parity:ios` flow. The timing suite
still reports visible RN surface timings for context, but it is not the source
of the RN Text parity contract. Escaped strings in mismatch artifacts are for
display only; the comparator stores and compares raw RN/Pretext line text.

The visible RN surface is reported for context only. The layout-only API gates
the hot native layout median, prepare cost, engine metadata, parity report
presence, and diagnostic contracts; it does not require the final RN render
pass to beat RN `<Text>` in every local run.

## Android Maestro Suite Snapshot

Latest Android benchmark suite:

- Date: April 26, 2026
- Device target: Pixel_9_Pro AVD, Android API 36
- Build mode: release APK, Metro not running
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Flow: `benchmark` suite
- Maestro gate profile: default timing thresholds
- Gate: pass

| Metric                 | RN baseline | Pretext layout + RN surface |      Delta |
| ---------------------- | ----------: | --------------------------: | ---------: |
| Interaction median     |  `23.80 ms` |                  `22.43 ms` | `-1.37 ms` |
| Interaction p95        |  `26.39 ms` |                  `24.36 ms` | `-2.03 ms` |
| Layout-only median     | RN internal |                   `0.03 ms` |        n/a |
| Prepare once           |         n/a |                  `50.46 ms` |        n/a |
| Measure inside prepare |         n/a |                  `48.22 ms` |        n/a |

Canonical paths in this run:

| Path           | Engine                         | Role                         |
| -------------- | ------------------------------ | ---------------------------- |
| RN baseline    | `rn_text_compat`               | `rn_text_compat_oracle`      |
| Pretext layout | `android_static_layout_compat` | `canonical_prepared_compute` |

Android `includeFontPadding` was reported as `true` for the RN baseline,
canonical compute path, and visible RN surface path. The height metric source
was `platform_text_engine_metrics`, not a font-size-only heuristic.

Dedicated RN Text parity contract:

| Bucket               | Mismatches |
| -------------------- | ---------: |
| Line-count parity    |    `0/260` |
| Line-text parity     |    `0/260` |
| Line-geometry parity |    `0/260` |

The Android release AVD run reports the current RN-compatible StaticLayout
normal-wrap path, and it shows why platform-specific reporting matters.
The layout-only hot path was `0.03 ms`; the full visible-surface median was
faster than RN by `1.37 ms` in this run, while still including the final RN
surface render. The dedicated `benchmark:parity:android` flow is the blocking RN
Text parity contract and currently passes at `0/260` under strict raw line-text
comparison, including the `shapeSlices` blocked-row structural case.

## Draggable Shape Example Contract

The `examples/pretext-react-native-example` Maestro flow verifies the
user-facing draggable shape demo against the same release-installed apps. It
uses stable 3x3 grid target ids and performs 20 circle moves across all grid
cells. The exported report must show no final or sampled text intrusion into the
circle obstacle.

Latest release run:

- Date: April 26, 2026
- iOS target: iPhone 16 simulator, iOS 18.5, Release simulator app
- Android target: Pixel_9_Pro AVD, Android API 36, release APK
- Gate: pass on iOS and Android

| Platform | Moves | Visited grid cells  | Final intrusions | Motion max intrusions | Motion min clearance | Shape slices |
| -------- | ----: | ------------------- | ---------------: | --------------------: | -------------------: | -----------: |
| iOS      |    20 | `1,2,3,4,5,6,7,8,9` |                0 |                     0 |                 `20` |           10 |
| Android  |    20 | `1,2,3,4,5,6,7,8,9` |                0 |                     0 |              `19.99` |           10 |

## Resolved RN Text Parity History

Earlier timing-suite reports recorded sampled parity drift before the dedicated
unique-case Maestro contract and native platform alignment work were complete.
Those counts are retained here only as resolved history:

| Platform | Earlier report bucket    | Historical mismatch count | Current contract status |
| -------- | ------------------------ | ------------------------: | ----------------------- |
| iOS      | Sampled line-text parity |                  `35/240` | `0/260` resolved        |
| Android  | Line-count parity        |                  `80/240` | `0/260` resolved        |

The current source of truth is the 260-case Maestro parity suite above.
If a new mismatch appears, it should be promoted into a deterministic Maestro
contract case or native fixture, fixed in the relevant platform bucket, and
then rerun back to `0/260`. The gate must not be weakened by trimming,
normalizing, deduping observed mismatches, or treating a skipped-gate run as a
pass.

## API-Level Performance Meaning

| API                                                      | Performance expectation                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `prepare(text, style)`                                   | Cold step. Native measurement dominates and should be amortized across layouts. |
| `layout(prepared, width)` or `layout(prepared, options)` | Hot step. Use `output: "metrics"` when height is all the UI needs.              |
| `usePretextLayout()`                                     | Same native work as `prepare()` plus `layout()`, with automatic release.        |
| `Pretext.*`                                              | Namespace wrapper over the same functions. No additional cost.                  |

`output: "lines"`, `output: "diagnostics"`, and `output: "rich"` return more
data than `metrics`; use them only when that data is needed.

## Reproducing

Benchmarks are intentionally manual and are not part of CI because simulator
startup, Metro, Maestro, installed app state, and route-level API changes make
them too expensive and too brittle for every pull request. Use release builds on
the same device class when comparing numbers.

The benchmark scripts drive an already installed example app. They do not
build, install, or boot Metro for you. Before running debug builds, generate the
Nitro bridge, start Metro, and install the app on the target device:

```sh
yarn nitrogen
yarn workspace react-native-nitro-pretext-example start
yarn example:ios
yarn example:android
```

For release snapshots like the current report, install a release app instead of
starting Metro:

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

Then run the target benchmark with an explicit device id:

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:android
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:parity:android
BENCHMARK_GATE_PROFILE=manual-debug yarn benchmark:ios
```

Run the draggable shape example contract against the installed app when changing
`shapeSlices` or the example screen:

```sh
maestro --platform ios --device <simulator-udid> test \
  example/maestro/flows/examples/pretext-react-native-example.yaml
maestro --platform android --device <adb-serial> test \
  example/maestro/flows/examples/pretext-react-native-example.yaml
```

`BENCHMARK_GATE_PROFILE=manual-debug` relaxes timing thresholds for noisy debug
runs where configured; the dedicated parity gate remains strict.
`BENCHMARK_SKIP_GATE=1` is only for exploratory artifact capture and should not
be reported as a benchmark result. A parity claim requires a non-skipped
`benchmark:parity:*` run that completes all 260 cases and reports zero failed
cases plus zero line-count, line-text, and line-geometry mismatches.

Android normal-wrap benchmark claims currently use the RN-compatible
`android_static_layout_compat` path. Android rule-layer requests that require
token fallback may report `android_legacy_fallback`; rerun the target device/API
before making device-specific claims beyond the API 36 snapshot above. Current
iOS normal-wrap suite gates expect `ios_text_kit`; alternate native line-layout
paths may report `ios_core_text`, and degraded fallback diagnostics may report
`ios_manual_token_fallback`.

The timing-suite gate checks layout-only timing, prepare/measure bounds,
minimum diagnostic sample counts, layout engine, renderer kind, parity role,
Android `includeFontPadding`, and height metric source. The dedicated parity
gate separately requires 260 completed cases and `0/260` line-count, line-text,
and line-geometry mismatches against the final RN `<Text>` renderer plus the
`shapeSlices` structural oracle for narrow slots, blocked rows, same-row slots,
and gap containment.

Static API example coverage is CI-safe:

```sh
yarn verify:api-examples
```

Optional device-level example coverage is manual only:

```sh
yarn examples:ios
yarn examples:android
```

## Practical Meaning

Good candidates:

- complex card or masonry layouts that otherwise need hidden `<Text onLayout>`
- chat bubbles that search for a tight width before render
- split views and bottom sheets that need stable target heights
- dashboard annotations that affect chart placement
- obstacle-aware editorial layouts using `shapeSlices`
- localized text where fallback fonts, emoji, CJK, or RTL can change height

Poor candidates:

- one-off static text that never needs geometry before render
- editable text inputs
- use cases that require browser canvas pixel parity
- rule-layer fallback paths that require exact RN parity without a dedicated
  contract case

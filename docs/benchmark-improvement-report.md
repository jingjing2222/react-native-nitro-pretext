# Benchmark And Validation Report

This document records the current validation status for the layout-only Pretext
API. Raw Maestro and local debug outputs are not linked here because they are
machine-local artifacts and are not part of the package.

## Current Validation Status

| Platform          | Status                                               | Notes                                                        |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| iOS               | layout example, benchmark suite, and parity verified | Benchmark suite: April 24, 2026. Parity: April 25, 2026.     |
| Android API 29+   | layout example, benchmark suite, and parity verified | Latest local validation: April 25, 2026 on API 36 debug AVD. |
| Android API 24-28 | StaticLayout compat/fallback only                    | Supported, but not a canonical performance or parity target. |

Do not extrapolate Android performance from iOS numbers. The Android numbers
below are a debug AVD snapshot, not a release-device speedup claim.

## Layout-Only Example Snapshot

Latest local iOS example validation:

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

Latest local Android example validation:

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

## Current RN Text Maestro Parity Contract

RN `<Text>` parity is a dedicated Maestro contract, not a count inflated by
repeated timing benchmark samples. The contract source is 240 unique cases. Each
case has a stable `caseId`, text, width, style, and category, and is executed
once per platform.

Latest local parity validation:

- Date: April 25, 2026
- iOS target: iPhone 16 simulator, iOS 18.5
- Android target: Pixel_9_Pro AVD, Android API 36
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Gate result: pass on both platforms

| Platform | Cases | Mismatches | Line count | Line text | Geometry | Contract candidates |
| -------- | ----: | ---------: | ---------: | --------: | -------: | ------------------: |
| iOS      |   240 |          0 |      0/240 |     0/240 |    0/240 |                   0 |
| Android  |   240 |          0 |      0/240 |     0/240 |    0/240 |                   0 |

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

## Current Manual iOS Maestro Suite Snapshot

Latest local iOS benchmark suite:

- Date: April 24, 2026
- Device target: iPhone 16 simulator
- Build mode: debug app with Metro
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Flow: `benchmark` suite
- Maestro gate profile: `local`
- Gate result: pass

| Metric                 | RN baseline | Pretext layout + RN surface |       Delta |
| ---------------------- | ----------: | --------------------------: | ----------: |
| Interaction median     | `247.11 ms` |                 `230.95 ms` | `-16.16 ms` |
| Interaction p95        | `388.88 ms` |                 `365.26 ms` | `-23.62 ms` |
| Layout-only median     | RN internal |                   `0.23 ms` |         n/a |
| Prepare once           |         n/a |                  `47.40 ms` |         n/a |
| Measure inside prepare |         n/a |                  `47.26 ms` |         n/a |

Canonical paths in this run:

| Path           | Engine           | Role                         |
| -------------- | ---------------- | ---------------------------- |
| RN baseline    | `rn_text_compat` | `rn_text_compat_oracle`      |
| Pretext layout | `ios_core_text`  | `canonical_prepared_compute` |

Dedicated RN Text parity contract:

| Bucket               | Mismatches |
| -------------------- | ---------: |
| Line-count parity    |    `0/240` |
| Line-text parity     |    `0/240` |
| Line-geometry parity |    `0/240` |

This is measured by the dedicated `benchmark:parity:ios` flow. The timing suite
still reports visible RN surface timings for context, but it is not the source
of the RN Text parity contract.

The visible RN surface is reported for context only. The layout-only API gates
the hot native layout median, prepare cost, engine metadata, parity report
presence, and diagnostic contracts; it does not require the final RN render
pass to beat RN `<Text>` in every debug run.

## Current Manual Android Maestro Suite Snapshot

Latest local Android benchmark suite:

- Date: April 25, 2026
- Device target: Pixel_9_Pro AVD, Android API 36
- Build mode: debug app with Metro
- React Native: `0.85.0`
- Nitro Modules: `0.35.5`
- Flow: `benchmark` suite
- Maestro gate profile: `local`
- Gate result: pass

| Metric                 | RN baseline | Pretext layout + RN surface |       Delta |
| ---------------------- | ----------: | --------------------------: | ----------: |
| Interaction median     |  `54.55 ms` |                  `85.01 ms` | `+30.46 ms` |
| Interaction p95        |  `72.11 ms` |                  `92.35 ms` | `+20.24 ms` |
| Layout-only median     | RN internal |                   `0.06 ms` |         n/a |
| Prepare once           |         n/a |                 `140.01 ms` |         n/a |
| Measure inside prepare |         n/a |                 `138.06 ms` |         n/a |

Canonical paths in this run:

| Path           | Engine                               | Role                         |
| -------------- | ------------------------------------ | ---------------------------- |
| RN baseline    | `rn_text_compat`                     | `rn_text_compat_oracle`      |
| Pretext layout | `android_measured_text_line_breaker` | `canonical_prepared_compute` |

Android `includeFontPadding` was reported as `true` for the RN baseline,
canonical compute path, and visible RN surface path. The height metric source
was `platform_text_engine_metrics`, not a font-size-only heuristic.

Dedicated RN Text parity contract:

| Bucket               | Mismatches |
| -------------------- | ---------: |
| Line-count parity    |    `0/240` |
| Line-text parity     |    `0/240` |
| Line-geometry parity |    `0/240` |

The Android debug AVD run validates that the canonical API 29+ engine path is
used, but it also shows why platform-specific reporting matters. The
layout-only hot path was `0.06 ms`; the full visible-surface median was slower
than RN by `30.46 ms` because the final RN surface still dominates the render
cost. The dedicated `benchmark:parity:android` flow is the blocking RN Text
parity contract and currently passes at `0/240`.

## Resolved RN Text Parity History

Earlier timing-suite reports recorded sampled parity drift before the dedicated
240-case Maestro contract and native platform alignment work were complete.
Those counts are retained here only as resolved history:

| Platform | Earlier report bucket    | Historical mismatch count | Current contract status |
| -------- | ------------------------ | ------------------------: | ----------------------- |
| iOS      | Sampled line-text parity |                  `35/240` | `0/240` resolved        |
| Android  | Line-count parity        |                  `80/240` | `0/240` resolved        |

The current source of truth is the 240 unique-case Maestro parity suite above.
If a new mismatch appears, it should be promoted into a deterministic Maestro
contract case or native fixture, fixed in the relevant platform bucket, and
then verified back to `0/240`.

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
build, install, or boot Metro for you. Before running them, generate the Nitro
bridge, start Metro for debug builds, and install the app on the target device:

```sh
yarn nitrogen
yarn workspace react-native-nitro-pretext-example start
yarn example:ios
yarn example:android
```

Then run the target benchmark with an explicit device id:

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:android
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:parity:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial-api-29-or-newer> yarn benchmark:parity:android
BENCHMARK_GATE_PROFILE=manual-debug yarn benchmark:ios
```

Android canonical benchmark claims require API 29+ normal-wrap requests because
the canonical Android engine is `MeasuredText + LineBreaker`. API 24-28 runs and
Android rule-layer requests that require token fallback exercise
`android_static_layout_compat` or `android_legacy_fallback` paths. iOS canonical
runs report `ios_core_text`; degraded fallback diagnostics may report
`ios_manual_token_fallback`. StaticLayout compat diagnostics include
`fallbackReason: "static_layout_compat"`.

The timing-suite gate checks layout-only timing, prepare/measure bounds,
minimum diagnostic sample counts, layout engine, renderer kind, parity role,
Android `includeFontPadding`, and height metric source. The dedicated parity
gate separately requires 240 completed cases and `0/240` line-count, line-text,
and line-geometry mismatches against the final RN `<Text>` renderer.

Static API example coverage is CI-safe:

```sh
yarn verify:api-examples
```

Optional device-level example coverage is manual only:

```sh
maestro test example/maestro/flows/examples/suite.yaml
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
- Android API 24-28 flows that require canonical parity with API 29+

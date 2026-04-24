# Benchmark Report

This report summarizes the latest validated iOS benchmark snapshot and the current Android benchmark gap.

The source summaries were produced by local Maestro runs under `example/maestro/`. Raw Maestro debug output is intentionally not linked from this document because those files are local-only and are not part of the package or PR artifact set.

## Current Validation Status

| Platform          | Status                             | Notes                                                                                                                            |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| iOS               | measured                           | Latest validated suite snapshot: April 24, 2026.                                                                                 |
| Android API 29+   | not yet measured on release device | Canonical engine is implemented as `MeasuredText + LineBreaker`, but no Android release-device benchmark is currently published. |
| Android API 24-28 | fallback only                      | Supported through named legacy fallback paths; not a canonical performance or parity target.                                     |

Do not extrapolate Android performance from the iOS numbers. Android adoption confidence needs a release-device run on the target device class.

## iOS Snapshot

| Metric                 |    BaseText | Prepared native batch |        Delta |                           Result |
| ---------------------- | ----------: | --------------------: | -----------: | -------------------------------: |
| Interaction median     | `231.35 ms` |            `67.08 ms` | `-164.27 ms` |                   `71.0% faster` |
| Interaction p95        | `364.52 ms` |           `103.79 ms` | `-260.73 ms` |                   `71.5% faster` |
| Layout-only median     | RN internal |             `0.18 ms` |          n/a |         isolated native hot path |
| Prepare once           |         n/a |            `48.10 ms` |          n/a | amortized after about 1 relayout |
| Measure inside prepare |         n/a |            `48.01 ms` |          n/a |          `99.8%` of prepare time |

Canonical paths in this run:

| Path             | Engine           | Renderer                | Role                               |
| ---------------- | ---------------- | ----------------------- | ---------------------------------- |
| BaseText         | `rn_text_compat` | `rn_text`               | `rn_text_compat_oracle`            |
| Prepared compute | `ios_core_text`  | `prepared_compute`      | `canonical_prepared_compute`       |
| Prepared render  | `ios_core_text`  | `prepared_native_batch` | `canonical_prepared_native_render` |

## Earlier Prepared Path Delta

Compared with the earlier April 13, 2026 prepared-view run before the current batch/cache path:

| Metric                          | Earlier prepared view | Current prepared batch |    Improvement |
| ------------------------------- | --------------------: | ---------------------: | -------------: |
| Prepared render median          |           `145.96 ms` |             `67.08 ms` | `54.0% faster` |
| Prepared render p95             |           `211.44 ms` |            `103.79 ms` | `50.9% faster` |
| Prepared layout-only median     |            `14.11 ms` |              `0.18 ms` | `98.7% faster` |
| `prepare*WithStats()` total     |            `55.92 ms` |             `48.10 ms` | `14.0% faster` |
| `measureBatch()` inside prepare |            `55.77 ms` |             `48.01 ms` | `13.9% faster` |

## Interpretation

- The clearest current win is rendering a prepared corpus through one batched native surface.
- Hot relayout is no longer the bottleneck in the iOS suite; it is about `0.3%` of the prepared render interaction.
- Cold prepare remains measurement-bound. Native measurement accounts for `99.8%` of prepare time in the latest run.
- `PreparedParagraphText` and `PreparedParagraphLinesView` are compatibility/custom-renderer helpers. The latest automated suite does not claim separate speedups for those surfaces.
- Android release-device numbers are still required before making Android performance claims.

## Reproducing

Use release builds on the same device class when comparing numbers.

```sh
yarn benchmark:ios
yarn benchmark:android
```

Environment overrides:

```sh
MAESTRO_IOS_DEVICE_ID=<simulator-udid> yarn benchmark:ios
MAESTRO_ANDROID_DEVICE_ID=<adb-serial> yarn benchmark:android
BENCHMARK_GATE_PROFILE=ci-debug yarn benchmark:ios
```

The benchmark flow:

1. Run the BaseText screen to capture the RN `<Text>` compatibility baseline.
2. Run the Prepared View screen to capture prepared compute and prepared native batch render.
3. Compare the exported machine-readable reports.

The gate checks timing, line-count parity, sampled line-text parity, layout engine, renderer kind, parity role, Android `includeFontPadding`, and height metric source.

## Practical Meaning

Good candidates:

- resizable card rails
- split views and bottom sheets
- chat bubbles that search for a tight width before render
- dashboard annotations that affect chart placement
- obstacle-aware editorial layouts using `shapeSlices`
- complex card/masonry layouts that otherwise need hidden `<Text onLayout>` measurement passes

Poor candidates:

- one-off static text that never needs geometry before render
- editable text inputs
- use cases that require browser canvas pixel parity
- Android API 24-28 flows that require canonical parity with API 29+

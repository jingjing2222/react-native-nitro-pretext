# Benchmark And Validation Report

This document records the current validation status for the layout-only PreText
API. Raw Maestro and local debug outputs are not linked here because they are
machine-local artifacts and are not part of the package.

## Current Validation Status

| Platform          | Status                                | Notes                                                        |
| ----------------- | ------------------------------------- | ------------------------------------------------------------ |
| iOS               | layout example and benchmark verified | Latest local validation: April 24, 2026.                     |
| Android API 29+   | no release-device numbers published   | Canonical engine is `MeasuredText + LineBreaker`.            |
| Android API 24-28 | fallback only                         | Supported, but not a canonical performance or parity target. |

Do not extrapolate Android performance from iOS numbers. Android adoption
confidence needs a release-device run on the target device class.

## Layout-Only Example Snapshot

Latest local iOS example validation:

- Date: April 24, 2026
- Device target: iPhone 16 simulator
- Build mode: debug
- Screen: `examples/measured-layout`

| Path                            |        Time | Render passes | Layout shifts |
| ------------------------------- | ----------: | ------------: | ------------: |
| Hidden RN `<Text>` + `onLayout` | `129.16 ms` |             2 |             1 |
| `PreText.layout()`              |   `1.55 ms` |             1 |             0 |
| Improvement                     |     `98.8%` |           n/a |           n/a |

This screen is a product-shaped demonstration, not a release-device benchmark.
It shows the core value of the public API: text height is available before the
visible RN surface mounts.

## Current iOS Maestro Suite Snapshot

Latest local iOS benchmark suite:

- Date: April 24, 2026
- Device target: iPhone 16 simulator
- Build mode: debug app with Metro
- Flow: `benchmark` suite

| Metric                 | RN baseline | PreText layout + RN surface |       Delta |
| ---------------------- | ----------: | --------------------------: | ----------: |
| Interaction median     | `229.98 ms` |                 `232.66 ms` |  `+2.68 ms` |
| Interaction p95        | `398.94 ms` |                 `378.43 ms` | `-20.51 ms` |
| Layout-only median     | RN internal |                   `0.22 ms` |         n/a |
| Prepare once           |         n/a |                  `46.50 ms` |         n/a |
| Measure inside prepare |         n/a |                  `46.37 ms` |         n/a |

Canonical paths in this run:

| Path           | Engine           | Role                         |
| -------------- | ---------------- | ---------------------------- |
| RN baseline    | `rn_text_compat` | `rn_text_compat_oracle`      |
| PreText layout | `ios_core_text`  | `canonical_prepared_compute` |

Observed parity drift:

| Bucket                   | Mismatches |
| ------------------------ | ---------: |
| Line-count parity        |    `5/240` |
| Sampled line-text parity |   `35/240` |

The drift is classified as native algorithm rule and line-break strategy drift.
It is expected until RN `<Text>` style, fallback font, locale, and line-break
policy are fully aligned with the native layout request.

The visible RN surface is reported for context only. The layout-only API gates
the hot native layout median, prepare cost, engine metadata, and parity
contracts; it does not require the final RN render pass to beat RN `<Text>` in
every debug run.

## API-Level Performance Meaning

| API                    | Performance expectation                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `prepare(text, style)` | Cold step. Native measurement dominates and should be amortized across layouts. |
| `layout(prepared)`     | Hot step. Use `output: "metrics"` when height is all the UI needs.              |
| `usePreTextLayout()`   | Same native work as `prepare()` plus `layout()`, with automatic release.        |
| `PreText.*`            | Namespace wrapper over the same functions. No additional cost.                  |

`output: "lines"`, `output: "diagnostics"`, and `output: "rich"` return more
data than `metrics`; use them only when that data is needed.

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

The gate checks timing, line-count parity, sampled line-text parity, layout
engine, renderer kind, parity role, Android `includeFontPadding`, and height
metric source.

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

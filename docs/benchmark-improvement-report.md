# Benchmark Improvement Report

This report compares the prepared-render path before and after the native
request-level relayout cache landed in the renderer path.

Source artifacts:

- Before: [ios-prepared-view/latest-summary.txt](/Users/kimhyeongjeong/Desktop/code/react-native-pretext/example/.maestro-artifacts/ios-prepared-view/latest-summary.txt:1)
- After: [ios-suite/latest-summary.txt](/Users/kimhyeongjeong/Desktop/code/react-native-pretext/example/.maestro-artifacts/ios-suite/latest-summary.txt:1)

## iOS prepared path delta

| Metric                      |    Before |     After |     Delta |         Gain |
| --------------------------- | --------: | --------: | --------: | -----------: |
| Prepared render median      | 145.96 ms |  95.40 ms | -50.56 ms | 34.6% faster |
| Prepared render p95         | 211.44 ms | 155.14 ms | -56.30 ms | 26.6% faster |
| Prepared layout-only median |  14.11 ms |   0.15 ms | -13.96 ms | 98.9% faster |
| Prepare once                |  55.92 ms |  47.73 ms |  -8.19 ms | 14.6% faster |
| Measure only                |  55.77 ms |  47.04 ms |  -8.73 ms | 15.7% faster |

## End-to-end benchmark read

| Scenario                           | Result                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| BaseText median interaction        | 232.58 ms                                                             |
| Prepared render median interaction | 95.40 ms                                                              |
| Median delta                       | 137.18 ms faster                                                      |
| Prepared p95 interaction           | 155.14 ms                                                             |
| Prepare amortization               | about 1 relayout                                                      |
| Remaining bottleneck               | renderer/materialization still costs about 95.25 ms beyond hot layout |

## Current prepared path vs BaseText

| Metric               |    BaseText | Prepared render |            Delta |                       Gain |
| -------------------- | ----------: | --------------: | ---------------: | -------------------------: |
| Interaction median   |   232.58 ms |        95.40 ms |       -137.18 ms |               59.0% faster |
| Interaction p95      |   366.54 ms |       155.14 ms |       -211.40 ms |               57.7% faster |
| Hot relayout only    | RN internal |         0.15 ms |              n/a | prepared hot path isolated |
| Prepare amortization |         n/a |   47.73 ms once | about 1 relayout |    setup recovered quickly |

## Practical meaning

### Split view, bottom sheet, or width-changing card lists

If the same paragraphs are repeatedly relaid out across a small set of widths,
the prepared renderer path now finishes about **50.56 ms sooner per interaction**
on median than the earlier implementation. In product terms, resizing a card
rail, opening a side pane, or switching a feed cell between compact and roomy
widths lands materially faster.

### Repeated relayout on the same prepared corpus

The hot relayout stage dropped from **14.11 ms to 0.15 ms** on median. That is a
**98.9% reduction** in the line-layout step itself. When the app is revisiting
the same width requests, line breaking is no longer the dominant cost.

### Cold prepare still matters

`prepare once` improved from **55.92 ms to 47.73 ms**, but `measure` still takes
**47.04 ms**, which is **98.6%** of prepare time in the latest run. That means
initial corpus setup is still measurement-bound. The next performance win should
come from shared measurement cache strategy, not more hot-path line-break math.

### Renderer work is now the clear bottleneck

The current benchmark still spends **95.25 ms** beyond hot layout on the render
path. In practice, that means the next structural gain should come from using
fewer native paragraph surfaces or a larger batched renderer surface, not from
trying to shave more time off the current cached relayout math.

## Scenario pages and walkthrough

- Scenario routes live under `example/src/screens/examples/slites/*`.
- iOS walkthrough video: [slites-ios-demo.mov](/Users/kimhyeongjeong/Desktop/code/react-native-pretext/example/.maestro-artifacts/videos/slites-ios-demo.mov)
- Gesture telemetry sidecar: [slites-ios-demo.gesture-telemetry.json](/Users/kimhyeongjeong/Desktop/code/react-native-pretext/example/.maestro-artifacts/videos/slites-ios-demo.gesture-telemetry.json)

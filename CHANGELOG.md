# react-native-nitro-pretext

## 1.0.0

### Major Changes

- 400e33e: Release the layout-only Pretext API for computing React Native text geometry before visible render.

  This is a major release because the public surface was intentionally narrowed
  around pre-render layout data instead of rendering or raw native measurement.

  Breaking changes:

  - Removed the previous `measure()`, `measureBatch()`, `TextMeasure`, renderer
    components, native prepared renderer APIs, and raw prepared paragraph APIs
    from the package export surface.
  - Removed public native drawing/view-manager paths. Pretext no longer exposes a
    renderer component; apps render with ordinary React Native UI after reading
    layout metrics.

  New public API:

  - Added the public `Pretext` namespace plus named `prepare()`, `layout()`, and
    `usePretextLayout()` exports.
  - `prepare()` creates opaque native prepared state without exposing raw native
    ids, and `prepared.release()` is the only manual lifecycle API.
  - `layout()` returns native text-engine metrics by default and can optionally
    return line geometry, diagnostics, or rich inline box frames.
  - `usePretextLayout()` prepares, layouts, and releases native state from React
    components.

  Native layout contract:

  - Android API 24+ normal-wrap requests use the RN-compatible `StaticLayout`
    path.
  - Android rule-layer requests that require token layout may report named
    fallback paths such as `android_legacy_fallback`.
  - iOS normal-wrap requests use TextKit; alternate native line-layout paths may
    report Core Text diagnostics.
  - Android `includeFontPadding` defaults to `true` to align with RN `<Text>`.
  - RN `<Text>` parity is gated by the 240 unique-case Maestro parity suite.
  - React and `react-native-nitro-modules` keep open peer ranges as `*`.
  - React Native `>=0.81.0` is the package peer floor. The example app and
    latest local validation use React `19.2.3` and React Native `0.85.0`.
  - The package now exposes a React Native condition that points Metro at the
    source entry so platform resolution can select the native Nitro bridge.

  Documentation and examples were rebuilt around the layout-only contract:

  - README and API docs now describe `Pretext`, `prepare`, `layout`, and
    `usePretextLayout` only.
  - API-matched examples live under `examples/use-case/*`; matching RN-only
    workaround examples live under `examples/non-use-case/*`.
  - Benchmark docs now separate API examples from benchmark case studies, report
    iOS and Android numbers separately, and show the measured-layout improvement
    percentage for the hidden RN `<Text onLayout>` path versus `Pretext.layout()`.
  - The latest local Android API 36 Maestro suite passes the layout-only benchmark
    gate, and the dedicated iOS/Android RN `<Text>` parity suite passes at
    `0/240`.
  - Added `ts-prune` as a development dead-export check and removed stale
    TypeScript/example exports found during the audit.

## 0.0.1

### Patch Changes

- d25645e: Replace the placeholder Nitro API with native text measurement methods and add batch measurement support on iOS and Android.

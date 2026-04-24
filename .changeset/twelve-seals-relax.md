---
"react-native-nitro-pretext": major
---

Release the layout-only Pretext API for computing React Native text geometry before visible render.

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

- Android API 29+ is the canonical `MeasuredText + LineBreaker` path.
- Android API 24-28 remains supported through StaticLayout/legacy fallback
  paths and is not the canonical parity or performance target.
- iOS uses Core Text `CTTypesetter + CTLine`.
- Android `includeFontPadding` defaults to `true` to align with RN `<Text>`.
- `react-native-nitro-modules` and `nitrogen` were updated to the latest
  `0.35.5` line.

Documentation and examples were rebuilt around the layout-only contract:

- README and API docs now describe `Pretext`, `prepare`, `layout`, and
  `usePretextLayout` only.
- API-matched examples live under `examples/use-case/*`; matching RN-only
  workaround examples live under `examples/non-use-case/*`.
- Benchmark docs now separate API examples from benchmark case studies and
  record the latest local iOS Maestro suite result.

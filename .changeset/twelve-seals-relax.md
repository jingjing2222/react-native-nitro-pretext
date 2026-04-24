---
"react-native-nitro-pretext": major
---

Add the layout-only Pretext API for computing React Native text geometry before visible render.

- Added the public `Pretext` namespace plus named `prepare()`, `layout()`, and `usePretextLayout()` exports.
- `prepare()` creates opaque native prepared state without exposing raw native ids, and `prepared.release()` is the only manual lifecycle API.
- `layout()` returns native text-engine metrics by default and can optionally return line geometry, diagnostics, or rich inline box frames.
- `usePretextLayout()` prepares, layouts, and releases native state from React components.
- Removed the previous `measure()`, `measureBatch()`, `TextMeasure`, renderer components, and raw prepared paragraph APIs from the package export surface.
- Documented Android API 29+ as the canonical `MeasuredText + LineBreaker` path, Android API 24-28 as legacy fallback, and iOS as Core Text.

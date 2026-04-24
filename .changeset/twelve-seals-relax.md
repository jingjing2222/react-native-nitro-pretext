---
"react-native-nitro-pretext": patch
---

Add the layout-only PreText API for computing React Native text geometry before visible render.

- Added the public `PreText` namespace plus named `prepare()`, `layout()`, and `usePreTextLayout()` exports.
- `prepare()` creates opaque native prepared state without exposing raw native ids, and `prepared.release()` is the only manual lifecycle API.
- `layout()` returns native text-engine metrics by default and can optionally return line geometry, diagnostics, or rich inline box frames.
- `usePreTextLayout()` prepares, layouts, and releases native state from React components.
- Removed public renderer components and raw prepared paragraph APIs from the package export surface.
- Documented Android API 29+ as the canonical `MeasuredText + LineBreaker` path, Android API 24-28 as legacy fallback, and iOS as Core Text.

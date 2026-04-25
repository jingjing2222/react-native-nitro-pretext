# Pretext Layout-Only Migration Plan

## Current Direction

- This package is a layout engine, not a renderer.
- Public runtime API is limited to `Pretext`, `prepare`, `layout`, and
  `usePretextLayout`.
- Visible rendering remains normal React Native UI.
- The library does not render through native text views, hidden measurement
  views, or public renderer components.
- Text height comes from native text engines, not from `fontSize` heuristics.

## Platform Contract

- Android API 24+ normal-wrap layout uses RN-compatible `StaticLayout`.
- Android rule-layer requests may use named fallback paths when token layout is
  required.
- iOS normal-wrap layout uses TextKit; alternate native line-layout paths may
  report Core Text diagnostics.
- RN `<Text>` is the expected visible renderer, but not the correctness source.
- RN `<Text>` parity is gated by the 240 unique-case Maestro parity suite.
- Android `includeFontPadding` defaults to `true` to match RN `<Text>`.
- Height must account for font metrics, explicit `lineHeight`, fallback fonts,
  emoji, locale, `includeFontPadding`, text direction, and line-break strategy.

## Session Rules

Each session is completed independently:

1. Implement only the active session scope.
2. Run the required local verification.
3. Run `agent-device` verification when the session affects visible behavior.
4. Fix failures before moving on.
5. Commit the session changes before starting the next session.

## Sessions

### Session 1: Layout-Only Public API

- [x] Added `Pretext`, `prepare`, `layout`, and `usePretextLayout`.
- [x] Kept native prepared ids hidden behind an opaque JS object.
- [x] Exposed manual release only as `prepared.release()`.
- [x] Left existing APIs in place for later removal.
- [x] Verified with `yarn typecheck` and `yarn test`.
- [x] Committed as `31d934e feat: add layout-only Pretext public API`.

### Session 2: JS Renderer Removal

- [x] Removed public prepared renderer component exports.
- [x] Removed old public raw API exports from root.
- [x] Updated JS tests around the layout-only public surface.
- [x] Kept example compatibility temporary shims internal to the example app.
- [x] Verified with `yarn typecheck`, `yarn test`, and `yarn lint`.
- [x] Committed as `e7930af refactor: remove public prepared renderers`.

### Session 3: Native View / Renderer Removal

- [x] Removed Android prepared paragraph view managers and renderer classes from source.
- [x] Removed iOS prepared paragraph view managers and drawing renderer classes from source.
- [x] Changed the Android package view manager list to empty.
- [x] Verified with `yarn typecheck`, Android build, and iOS build.
- [x] Committed as `b5a5f94 refactor: remove native prepared text renderers`.

### Session 4: Nitro Bridge Narrowing

- [x] Kept only preparation, request layout, diagnostics, rich layout, and release bridge methods.
- [x] Removed raw measurement, width-only aliases, materialized broken-text layout, cursor, hit testing, selection, copy, and renderer bridge methods.
- [x] Regenerated Nitro artifacts.
- [x] Verified with `yarn nitrogen`, `yarn typecheck`, `yarn test`, Android build, and iOS build.
- [x] Committed as `83dc023 refactor: narrow native layout bridge`.

### Session 5: Layout-Only Example

- [x] Rebuilt the main example around hidden RN `<Text onLayout>` measurement versus `Pretext.layout()` before render.
- [x] Kept the Pretext path layout-only; visible output is ordinary RN `View` and `Text`.
- [x] Added on-screen render pass, first stable height, layout shift, onLayout time, and Pretext layout time metrics.
- [x] Removed old example route links and focused the example index on measured layout.
- [x] Verified with `yarn typecheck`, `yarn test`, iOS build/install, and `agent-device` iOS screen inspection.
- [x] Committed as `6b91813 docs: show layout-only Pretext example`.

### Session 6: README / Docs

- [x] Rewrote README as a simple public-facing layout-only introduction.
- [x] Rewrote `docs/api.md` around `Pretext`, `prepare`, `layout`, and `usePretextLayout`.
- [x] Updated the benchmark report without local artifact links.
- [x] Made Android validation scope explicit.
- [x] Verified with `yarn fmt:check`, `yarn typecheck`, and `git diff --check`.
- [x] Committed as `3735606 docs: simplify Pretext API documentation`.

### Session 7: Final CI / PR Cleanup

- [x] Run full local CI:
  - `yarn typecheck`
  - `yarn lint`
  - `yarn fmt:check`
  - `yarn test`
- [x] Run available native builds:
  - `yarn workspace react-native-nitro-pretext-example build:android`
  - `yarn workspace react-native-nitro-pretext-example build:ios`
- [x] Ran the manual iOS Maestro suite on iPhone 16 simulator.
- [x] Confirmed Android benchmark could not run because no Android device was
      visible to `agent-device`.
- [x] Replaced the stale prepared-view Maestro route with
      `benchmark/pretext-layout`.
- [x] Removed the remaining example-only legacy renderer shim and dead prepared
      renderer example screens.
- [x] Updated PR #4 description to describe the layout-only API.
- [x] Confirmed public docs and package changes do not expose old renderer APIs,
      native drawing views, or local artifact links.
- [x] Commit final cleanup as `chore: finalize Pretext layout-only migration`.

## Remaining Limits

- Android release-device benchmark numbers are still required before publishing
  Android speedup claims.
- Android device/API-specific benchmark and parity claims still require target
  reruns; the latest local Android validation is API 36.
- RN `<Text>` pixel parity depends on matching style, font fallback, locale,
  line-height, text direction, and Android `includeFontPadding` policy.
- Browser canvas pixel parity is explicitly out of scope.

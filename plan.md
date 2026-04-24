# Native Engine Canonicalization Plan

## Execution Rule

- Execute exactly one plan at a time, in order from Plan 01 through Plan 08.
- Do not start Plan N+1 until Plan N has implementation, `agent-device` verification, and local CI results recorded.
- Keep each implementation session scoped to the active plan only.
- RN `<Text>` and Android `StaticLayout` are compatibility or fallback references only. They are never the canonical correctness source.
- Android API 29+ canonical layout uses `MeasuredText + LineBreaker`.
- iOS canonical layout and rendering use Core Text: `CTTypesetter + CTLine + CTLineDraw`.
- Android `includeFontPadding` is explicit, defaults to `true` for RN compatibility, and is reported in Android parity output.
- Height is never derived from `fontSize` alone. Line and paragraph height must come from platform text-engine metrics after shaping and line breaking.
- Height calculation must account for font metrics, explicit `lineHeight`, fallback fonts, emoji glyph fallback, locale, `includeFontPadding`, text direction, and the selected line-break strategy.

## Height Metric Contract

- Android API 29+ canonical metrics come from the `MeasuredText + LineBreaker` line records, with the same `TextPaint`, locale, typeface, letter spacing, text direction, break strategy, and `includeFontPadding` policy used by rendering.
- Android `StaticLayout` is required for RN `<Text>` compatibility height checks and Android legacy/fallback paths. When used, it must be reported as `android_static_layout_compat` or `android_legacy_fallback`, not as canonical.
- Android canonical code must not replace line height with JS/manual `fontSize`, token height, or a fixed `lineHeight` shortcut. Explicit `lineHeight` is applied as a policy over native ascender/descender metrics, not as the only source of truth.
- iOS canonical metrics come from Core Text line creation and typographic bounds: `CTTypesetterCreateLine`, `CTLineGetTypographicBounds`, and related run metrics.
- iOS TextKit may be used only as an RN compatibility baseline if needed, and must be labeled separately from the Core Text canonical path.
- Emoji, fallback fonts, CJK locale shaping, RTL text, and combining clusters must be included in height fixtures because they can change ascent, descent, leading, and line boxes.
- Diagnostics must expose the metric source so a report can distinguish `font_metrics`, `explicit_line_height`, `fallback_font`, `emoji_fallback`, `locale`, `include_font_padding`, and `line_break_strategy` effects.

## Required Gate For Every Plan

- Implementation is limited to the active plan checklist.
- `agent-device` verification is run for affected platforms.
- Before each `agent-device` run, load its bootstrap and exploration references, confirm the app/device/session, then inspect before interacting.
- Verification output is recorded with benchmark or fixture artifacts.
- Local CI is run before moving to the next plan:
  - `yarn typecheck`
  - `yarn lint`
  - `yarn fmt:check`
  - `yarn test`
- If native code changed, also run platform builds where available:
  - `yarn workspace react-native-nitro-pretext-example build:android`
  - `yarn workspace react-native-nitro-pretext-example build:ios`
- If benchmark behavior changed, run the relevant benchmark flow after the app is installed:
  - `yarn benchmark:android`
  - `yarn benchmark:ios`
- A plan is complete only when its acceptance criteria and all required gates pass or a blocker is recorded.

## Plan 01: Parity Diagnostics And Gates

- [x] Add required report fields: `layoutEngine`, `rendererKind`, `includeFontPadding`, `parityRole`, `heightMetricSource`.
- [x] Split parity buckets:
  - canonical prepared compute
  - canonical prepared native render
  - RN Text compat oracle
  - fallback/legacy
- [x] Fail gates when Android parity output omits `includeFontPadding`.
- [x] Fail gates when canonical Android output is not `android_measured_text_line_breaker`.
- [x] Fail gates when canonical iOS output is not `ios_core_text`.
- [x] Fail gates when any canonical height report is sourced from `fontSize` alone.
- [x] Add height drift buckets for font metrics, explicit lineHeight, fallback font, emoji fallback, locale, includeFontPadding, and line-break strategy.
- [x] Rename BaseText docs to RN Text compat baseline, not canonical oracle.
- [x] Separate timing gates from parity-contract gates.

Acceptance:

- Benchmark output tells whether mismatch is engine, renderer, padding, height-metric source, or compat drift.
- `agent-device` benchmark verification records the new metadata fields.
- Local CI passes before Plan 02 begins.

Result:

- Implemented in the benchmark summary schema, automation reports, UI summary cards, Maestro summary formatter, and quality gate script.
- Added JS coverage for diagnostics schema and gate failure cases.
- Local CI passed: `yarn typecheck`, `yarn lint`, `yarn fmt:check`, `yarn test --runInBand`.
- `agent-device` iOS verification passed on iPhone 16 simulator with `pretext.example`; base-text and prepared-view reports exposed `layoutEngine`, `rendererKind`, `parityRole`, `heightMetricSource`, drift fields, and height drift buckets.
- `yarn benchmark:ios` passed. Artifacts: `example/.maestro-artifacts/ios-suite/latest-summary.txt`, `example/.maestro-artifacts/ios-suite/latest-gate.txt`, `example/.maestro-artifacts/plan01/prepared-view-diagnostics.png`.
- Android device verification was attempted, but no Android device was connected. Android contract behavior is covered by JS gate tests until an Android device is available.

## Plan 02: Canonical Engine Alignment

- [ ] Keep Android minSdk 24, but mark API 24-28 as `android_legacy_fallback`.
- [ ] On Android API 29+, route normal prepared layout to `MeasuredText + LineBreaker` before any `StaticLayout` branch.
- [ ] Keep `StaticLayout` only as named compat/fallback path.
- [ ] Keep a `StaticLayout` RN Text compatibility height path with matching `TextPaint`, `includePad`, break strategy, hyphenation, locale, and text direction.
- [ ] Add `includeFontPadding?: boolean` to `ParagraphStyle`.
- [ ] Default Android `includeFontPadding` to `true`.
- [ ] Apply padding policy to Android line metrics and diagnostics, using native ascent/descent/top/bottom metrics instead of `fontSize`.
- [ ] Add `textDirection?: "auto" | "ltr" | "rtl"` to `ParagraphStyle`.
- [ ] Keep iOS layout on `CTTypesetterCreateLine` + `CTLineGetTypographicBounds`.
- [ ] Ensure iOS line height uses Core Text typographic bounds and fallback glyph metrics, with explicit `lineHeight` applied over those metrics.
- [ ] Mark manual token layout as degraded fallback with `fallbackReason`.
- [ ] Mark any manual/token height estimate as degraded with `fallbackReason: "manual_height_estimate"`.

Acceptance:

- API 29+ normal Android canonical layout never enters `StaticLayout`.
- iOS line metrics come from `CTLine`.
- No canonical line or paragraph height is computed from `fontSize` alone.
- `agent-device` fixture or benchmark verification confirms canonical engine metadata on affected platforms.
- Local CI passes before Plan 03 begins.

## Plan 03: Canonical Native Rendering

- [ ] iOS `PreparedParagraphView` primary path uses `CTLineDraw`.
- [ ] iOS stops using `NSString.draw` / `NSAttributedString.draw` for canonical rendering.
- [ ] Android primary rendering stops using per-line `StaticLayout`.
- [ ] Android primary rendering uses MeasuredText/LineBreaker line records and direct native drawing.
- [ ] `PreparedParagraphLinesView` removes hardcoded `includeFontPadding: false`; make it explicit compat prop.
- [ ] Cache one platform line record for geometry, drawing, hit testing, height metrics, and later selection.
- [ ] Render using the same line box top/baseline/descent data returned by the native metric engine.

Acceptance:

- Native render output uses the same engine artifacts and height metrics as layout.
- `agent-device` visual verification captures iOS and Android prepared native render output.
- Local CI passes before Plan 04 begins.

## Plan 04: Batched Native Renderer

- [ ] Add `PreparedParagraphsView` as primary batched native renderer.
- [ ] It consumes canonical Android/iOS layout records directly.
- [ ] It does not use RN `<Text>` internally.
- [ ] It reports `rendererKind: "prepared_native_batch"`.
- [ ] It carries height metric provenance per paragraph and per line.
- [ ] Existing `PreparedParagraphText` and `PreparedParagraphLinesView` remain compat exports.

Acceptance:

- Prepared benchmark can render a corpus through one native surface without RN Text dependency.
- `agent-device` benchmark verification records `rendererKind: "prepared_native_batch"`.
- Local CI passes before Plan 05 begins.

## Plan 05: Pretext-Compatible Rules Over Native Engines

- [ ] Do not target browser canvas pixel parity.
- [ ] Implement pretext-style rules as a rule layer over MeasuredText/LineBreaker and Core Text.
- [ ] Add diagnostics: `engine_drift`, `renderer_drift`, `padding_drift`, `algorithm_rule_drift`.
- [ ] Add diagnostics: `height_metric_drift`, `fallback_font_drift`, `emoji_metric_drift`, `locale_metric_drift`, `line_break_strategy_drift`.
- [ ] Normalize request model: width, left, shapeSlices, whitespace, wordBreak, source UTF-16 offsets.
- [ ] Add legal break tables for hard breaks, native soft breaks, grapheme boundaries, and atomic spans.
- [ ] Keep public `textStart/textEnd` as source UTF-16 offsets.
- [ ] Define pretext-compatible height rules as a policy layer over native line metrics, never as a font-size shortcut.

Acceptance:

- Rule fixtures compare native diagnostic traces, including height metric sources, not browser canvas output.
- `agent-device` benchmark verification shows drift categories in emitted reports.
- Local CI passes before Plan 06 begins.

## Plan 06: Rich Inline Boxes

- [ ] Extend `InlineSegment` into text and box segments.
- [ ] Box metrics are caller-supplied: `boxId`, `width`, `height`, `baseline`, `breakBehavior`.
- [ ] Android boxes use object replacement with MeasuredText replacement runs.
- [ ] iOS boxes use object replacement with `CTRunDelegate`.
- [ ] Return `InlineBoxFrame[]` from rich layout.
- [ ] Optional RN overlays may render boxes, but never participate in text layout.
- [ ] Merge box metrics with native text ascent/descent/fallback metrics to compute final line height.

Acceptance:

- Boxes wrap atomically and line height expands from native box metrics.
- `agent-device` visual verification captures inline box layout on iOS and Android.
- Local CI passes before Plan 07 begins.

## Plan 07: Selection And Accessibility

- [ ] Build hit testing from canonical native line records.
- [ ] Preserve height metric provenance on line records used by hit testing and selection rects.
- [ ] Android offset/rects derive from LineBreaker lines + MeasuredText advances.
- [ ] iOS offset/rects derive from `CTLineGetStringIndexForPosition` and `CTLineGetOffsetForStringIndex`.
- [ ] Add `selectable`, controlled `selection`, `onSelectionChange`, copy/select-all.
- [ ] Add per-box accessibility metadata.
- [ ] Keep paste/editing out of scope.

Acceptance:

- Selection/copy/accessibility works on native prepared renderer without RN Text.
- `agent-device` interaction verification covers tap/drag/select/copy flows on affected platforms.
- Local CI passes before Plan 08 begins.

## Plan 08: Bidi, Grapheme, Complex Shaping

- [ ] Add `textDirection?: "auto" | "ltr" | "rtl"`.
- [ ] Android removes hardcoded `FIRSTSTRONG_LTR`.
- [ ] Add shared boundary map for UTF-16 offsets, grapheme clusters, run boundaries, break opportunities.
- [ ] Never split surrogate pairs, ZWJ emoji, flags, combining sequences, Indic clusters.
- [ ] Add line diagnostics for direction, cluster violations, fallback reason.
- [ ] Add height fixtures for RTL, emoji ZWJ sequences, flags, combining marks, CJK locale fallback, and Indic clusters.
- [ ] Document visual order belongs to native renderer, not JS slicing.

Acceptance:

- Bidi/emoji/complex-script fixtures are tracked by dedicated counters.
- `agent-device` visual verification captures RTL, emoji, and complex-script fixtures.
- Local CI passes before final docs and migration notes begin.

## Final Docs And Reports

- [ ] Update docs with the canonical engine model and migration notes.
- [ ] Publish benchmark report with engine, renderer, padding, and drift metadata.
- [ ] Document that height is measured by platform text engines and is not derived from `fontSize`.
- [ ] Document remaining limits and any platform-specific fallback behavior.

## Agent Plan Audit After Height Correction

- Plan 01 needed revision: diagnostics must report `heightMetricSource` and fail canonical `fontSize`-only height.
- Plan 02 needed revision: engine alignment must explicitly preserve native font metrics, fallback glyph metrics, locale, line-break strategy, and `includeFontPadding`.
- Plan 03 needed revision: renderer alignment must reuse the same native line boxes and baselines used for measurement.
- Plan 04 remains directionally correct, but batched rendering must carry metric-source metadata per paragraph.
- Plan 05 needed revision: pretext-compatible rules must sit over native height metrics as well as native break decisions.
- Plan 06 needed revision: inline box metrics must merge with native text metrics rather than replacing them.
- Plan 07 remains directionally correct, because hit testing already depends on canonical line records; those records must now include height metric provenance.
- Plan 08 needed revision: complex shaping fixtures must include height-sensitive glyph fallback and cluster cases, not only break-offset correctness.

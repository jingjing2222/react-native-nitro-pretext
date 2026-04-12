---
"react-native-nitro-pretext": patch
---

Document the new prepared paragraph API surface and renderer components added in this release.

- Added prepared paragraph engine exports for relayout workflows: `ParagraphEngine`, `prepareParagraphs()`, `prepareParagraphsWithStats()`, `prepareInlineParagraphs()`, `prepareInlineParagraphsWithStats()`, `layoutParagraphs()`, `layoutParagraphsMetadata()`, `layoutParagraphLines()`, `layoutParagraphsWithRequest()`, `layoutParagraphsMetadataWithRequest()`, `layoutParagraphLinesWithRequest()`, `createParagraphLayoutRequest()`, `createParagraphLineCursor()`, `nextParagraphLine()`, `releaseParagraphLineCursor()`, and `releaseParagraphs()`.
- Added exported paragraph types: `ParagraphStyle`, `PreparedParagraphState`, `PreparedParagraphResult`, `PrepareParagraphStats`, `InlineSegment`, `ParagraphLayoutRequest`, `ParagraphShapeSlice`, `ParagraphLineRange`, `ParagraphLineCursorState`, `ParagraphLineCursorStep`, `LaidOutParagraph`, `LaidOutParagraphMetrics`, and `LaidOutParagraphLines`.
- Added `PreparedParagraphView`, a native paragraph surface component that renders prepared paragraph state directly from `prepared`, `paragraphIndex`, `layoutWidth`, `paragraphHeight`, and `paragraphStyle`.
- Added `PreparedParagraphText`, a React Native `<Text>` compatibility component that rematerializes prepared paragraph breaks from `prepared`, `paragraphIndex`, `layoutWidth`, and optional `layoutRequest`.
- Added benchmark compatibility helpers `prepareBenchmarkCorpus()`, `layoutPreparedBenchmarkCorpus()`, and `releasePreparedBenchmarkCorpus()` so existing benchmark flows can adopt the prepared paragraph API incrementally.

package com.margelo.nitro.pretext

import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Pretext : HybridPretextSpec() {
  override fun measure(text: String, fontFamily: String, fontSize: Double): Double {
    return PretextShared.measure(text, fontFamily, fontSize)
  }

  override fun measureBatch(texts: Array<String>, fontFamily: String, fontSize: Double): DoubleArray {
    return PretextShared.measureBatch(texts, fontFamily, fontSize)
  }

  override fun prepareParagraphs(
    texts: Array<String>,
    style: ParagraphStyle,
  ): PreparedParagraphState {
    return prepareParagraphsWithStats(texts, style).prepared
  }

  override fun prepareInlineParagraphSegments(
    segments: Array<InlineSegment>,
    paragraphSegmentOffsets: DoubleArray,
    style: ParagraphStyle,
  ): PreparedParagraphState {
    return prepareInlineParagraphSegmentsWithStats(
      segments,
      paragraphSegmentOffsets,
      style,
    ).prepared
  }

  override fun prepareParagraphsWithStats(
    texts: Array<String>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    return PretextShared.prepareParagraphsWithStats(texts, style)
  }

  override fun prepareInlineParagraphSegmentsWithStats(
    segments: Array<InlineSegment>,
    paragraphSegmentOffsets: DoubleArray,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    return PretextShared.prepareInlineParagraphsWithStats(
      materializeInlineParagraphs(segments, paragraphSegmentOffsets),
      style,
    )
  }

  override fun layoutParagraphs(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraph> {
    return PretextShared.layoutParagraphs(preparedId, width)
  }

  override fun layoutParagraphsMetadata(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraphMetrics> {
    return PretextShared.layoutParagraphsMetadata(preparedId, width)
  }

  override fun layoutParagraphLines(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraphLines> {
    return PretextShared.layoutParagraphLines(preparedId, width)
  }

  override fun layoutParagraphsWithRequest(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraph> {
    return PretextShared.layoutParagraphsWithRequest(preparedId, request)
  }

  override fun layoutParagraphsMetadataWithRequest(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraphMetrics> {
    return PretextShared.layoutParagraphsMetadataWithRequest(preparedId, request)
  }

  override fun layoutParagraphLinesWithRequest(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraphLines> {
    return PretextShared.layoutParagraphLinesWithRequest(preparedId, request)
  }

  override fun createParagraphLineCursor(
    preparedId: Double,
    paragraphIndex: Double,
    request: ParagraphLayoutRequest,
  ): ParagraphLineCursorState {
    return PretextShared.createParagraphLineCursor(preparedId, paragraphIndex, request)
  }

  override fun nextParagraphLine(cursorId: Double): ParagraphLineCursorStep {
    return PretextShared.nextParagraphLine(cursorId)
  }

  override fun releaseParagraphLineCursor(cursorId: Double) {
    PretextShared.releaseParagraphLineCursor(cursorId)
  }

  override fun releaseParagraphs(preparedId: Double) {
    PretextShared.releaseParagraphs(preparedId)
  }

  private fun materializeInlineParagraphs(
    segments: Array<InlineSegment>,
    paragraphSegmentOffsets: DoubleArray,
  ): Array<Array<InlineSegment>> {
    if (paragraphSegmentOffsets.isEmpty()) {
      return emptyArray()
    }

    val normalizedOffsets = paragraphSegmentOffsets.map { it.toInt() }
    val paragraphs = ArrayList<Array<InlineSegment>>(normalizedOffsets.size - 1)

    for (index in 0 until normalizedOffsets.lastIndex) {
      val start = normalizedOffsets[index].coerceIn(0, segments.size)
      val end = normalizedOffsets[index + 1].coerceIn(start, segments.size)
      paragraphs.add(segments.copyOfRange(start, end))
    }

    return paragraphs.toTypedArray()
  }
}

package com.margelo.nitro.pretext

import com.facebook.proguard.annotations.DoNotStrip
import org.json.JSONArray

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
    paragraphsPayload: String,
    style: ParagraphStyle,
  ): PreparedParagraphState {
    return prepareInlineParagraphSegmentsWithStats(
      paragraphsPayload,
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
    paragraphsPayload: String,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    return PretextShared.prepareInlineParagraphsWithStats(
      materializeInlineParagraphs(paragraphsPayload),
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

  override fun layoutParagraphLinesWithDiagnostics(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraphLinesWithDiagnostics> {
    return PretextShared.layoutParagraphLinesWithDiagnostics(preparedId, request)
  }

  override fun layoutRichParagraphLines(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutRichParagraphLines> {
    return PretextShared.layoutRichParagraphLines(preparedId, request)
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
    paragraphsPayload: String,
  ): Array<Array<InlineSegment>> {
    if (paragraphsPayload.isBlank()) {
      return emptyArray()
    }

    val root = JSONArray(paragraphsPayload)
    val paragraphs = ArrayList<Array<InlineSegment>>(root.length())

    for (paragraphIndex in 0 until root.length()) {
      val paragraphJson = root.getJSONArray(paragraphIndex)
      val paragraph = ArrayList<InlineSegment>(paragraphJson.length())

      for (segmentIndex in 0 until paragraphJson.length()) {
        val segmentJson = paragraphJson.getJSONObject(segmentIndex)
        paragraph.add(
          InlineSegment(
            kind = segmentJson.optString("kind").takeIf { it.isNotEmpty() },
            text = segmentJson.optString("text"),
            breakBehavior = segmentJson.optString("breakBehavior"),
            boxId = segmentJson.optString("boxId").takeIf { it.isNotEmpty() },
            width = segmentJson.optDoubleOrNull("width"),
            height = segmentJson.optDoubleOrNull("height"),
            baseline = segmentJson.optDoubleOrNull("baseline"),
            fontFamily = segmentJson.optString("fontFamily").takeIf { it.isNotEmpty() },
            fontSize = segmentJson.optDoubleOrNull("fontSize"),
            lineHeight = segmentJson.optDoubleOrNull("lineHeight"),
            letterSpacing = segmentJson.optDoubleOrNull("letterSpacing"),
            locale = segmentJson.optString("locale").takeIf { it.isNotEmpty() },
            fontWeight = segmentJson.optString("fontWeight").takeIf { it.isNotEmpty() },
            fontStyle = segmentJson.optString("fontStyle").takeIf { it.isNotEmpty() },
          ),
        )
      }

      paragraphs.add(paragraph.toTypedArray())
    }

    return paragraphs.toTypedArray()
  }

  private fun org.json.JSONObject.optDoubleOrNull(key: String): Double? {
    return if (has(key) && !isNull(key)) getDouble(key) else null
  }
}

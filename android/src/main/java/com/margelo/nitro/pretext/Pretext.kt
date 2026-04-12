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

  override fun prepareParagraphsWithStats(
    texts: Array<String>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    return PretextShared.prepareParagraphsWithStats(texts, style)
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

  override fun releaseParagraphs(preparedId: Double) {
    PretextShared.releaseParagraphs(preparedId)
  }
}

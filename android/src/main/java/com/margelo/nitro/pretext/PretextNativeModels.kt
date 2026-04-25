package com.margelo.nitro.pretext

import android.text.TextPaint

internal data class NativePreparedParagraphSeed(
  val text: String,
  val tokens: List<NativeTokenDescriptor>,
  val breakUnits: List<NativeTokenDescriptor>,
  val runs: List<NativeTextRun>,
  val atomicSpans: List<NativeAtomicSpan>,
  val inlineBoxes: List<NativeInlineBox>,
  val textUnits: Int,
  val forceTokenLayout: Boolean,
)

internal data class NativeTokenDescriptor(
  val text: String,
  val start: Int,
  val end: Int,
  val style: NativeTextStyle,
  val inlineBox: NativeInlineBox? = null,
)

internal data class NativePreparedToken(
  val text: String,
  val start: Int,
  val end: Int,
  val width: Double,
  val lineHeight: Double,
  val ascent: Double,
  val descent: Double,
)

internal data class NativePreparedParagraph(
  val text: String,
  val styledText: CharSequence,
  val measuredText: Any?,
  val tokens: List<NativePreparedToken>,
  val breakUnits: List<NativePreparedToken>,
  val runs: List<NativeTextRun>,
  val atomicSpans: List<NativeAtomicSpan>,
  val inlineBoxes: List<NativeInlineBox>,
  val forceTokenLayout: Boolean,
)

internal data class NativeAtomicSpan(
  val start: Int,
  val end: Int,
  val source: String,
)

internal data class NativeInlineBox(
  val boxId: String,
  val start: Int,
  val end: Int,
  val width: Double,
  val height: Double,
  val baseline: Double,
  val breakBehavior: String,
  val accessibilityLabel: String?,
  val accessibilityHint: String?,
  val accessibilityRole: String?,
)

internal class NativePreparedCorpus(
  val paragraphs: List<NativePreparedParagraph>,
  val baseStyle: NativeTextStyle,
  val lineHeight: Double,
  val textPaint: TextPaint,
  val includeFontPadding: Boolean,
  val textDirection: ParagraphTextDirection,
  val lineBreaker: Any?,
) {
  private val layoutCacheLock = Any()
  private val layoutCache =
    LinkedHashMap<NativeLayoutRequest, List<List<NativeLineLayout>>>(16, 0.75f, true)

  fun resolveLineLayouts(
    request: NativeLayoutRequest,
    builder: () -> List<List<NativeLineLayout>>,
  ): List<List<NativeLineLayout>> {
    synchronized(layoutCacheLock) {
      layoutCache[request]?.let { return it }
    }

    val computed = builder()

    synchronized(layoutCacheLock) {
      layoutCache[request]?.let { return it }
      layoutCache[request] = computed
      while (layoutCache.size > LAYOUT_CACHE_LIMIT) {
        val iterator = layoutCache.entries.iterator()
        if (!iterator.hasNext()) {
          break
        }
        iterator.next()
        iterator.remove()
      }
    }

    return computed
  }

  private companion object {
    private const val LAYOUT_CACHE_LIMIT = 12
  }
}

internal data class NativeLineLayout(
  val textStart: Int,
  val textEnd: Int,
  val width: Double,
  val left: Double,
  val top: Double,
  val height: Double,
  val ascent: Double,
  val descent: Double,
  val layoutEngine: String = LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK,
  val fallbackReason: String? = FALLBACK_REASON_MANUAL_HEIGHT_ESTIMATE,
)

internal data class NativeLineFontPadding(
  val top: Double,
  val bottom: Double,
)

internal data class NativeLayoutRequest(
  val width: Double,
  val left: Double,
  val whiteSpace: String,
  val wordBreak: String,
  val shapeSlices: List<NativeShapeSlice>,
)

internal data class NativeShapeSlice(
  val top: Double,
  val height: Double,
  val left: Double,
  val width: Double,
)

internal data class NativeLineConstraint(
  val left: Double,
  val width: Double,
  val height: Double,
)

internal enum class TokenMode {
  WHITESPACE,
  TEXT,
}

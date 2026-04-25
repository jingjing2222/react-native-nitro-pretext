package com.margelo.nitro.pretext

import android.content.res.Resources
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.Canvas
import android.os.Build
import android.text.SpannableString
import android.text.Spanned
import android.text.TextDirectionHeuristic
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.text.style.LineHeightSpan
import android.text.style.MetricAffectingSpan
import android.text.style.ReplacementSpan
import android.text.TextUtils
import android.view.View
import java.text.Bidi
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.floor

internal const val FONT_STYLE_NORMAL = "normal"
internal const val FONT_STYLE_ITALIC = "italic"
internal const val OBJECT_REPLACEMENT_CHARACTER = "\uFFFC"

internal data class NativeTextStyle(
  val fontFamily: String,
  val fontSize: Double,
  val lineHeight: Double,
  val letterSpacing: Double,
  val locale: String,
  val fontWeight: String,
  val fontStyle: String,
  val includeFontPadding: Boolean,
  val textDirection: ParagraphTextDirection,
)

internal data class NativeTextRun(
  val start: Int,
  val end: Int,
  val style: NativeTextStyle,
)

internal data class NativeTokenMetrics(
  val width: Double,
  val lineHeight: Double,
  val ascent: Double,
  val descent: Double,
)

internal object AndroidTextUnits {
  private val density: Double
    get() = Resources.getSystem().displayMetrics.density.toDouble()
      .takeIf { it > 0.0 }
      ?: 1.0

  fun toPx(value: Double): Double {
    return value * density
  }

  fun fromPx(value: Double): Double {
    return value / density
  }
}

private data class ParagraphBidiRun(
  val start: Int,
  val end: Int,
  val isRtl: Boolean,
)

internal fun defaultTextStyle(style: ParagraphStyle): NativeTextStyle {
  return NativeTextStyle(
    fontFamily = style.fontFamily,
    fontSize = style.fontSize,
    lineHeight = style.lineHeight,
    letterSpacing = style.letterSpacing,
    locale = style.locale,
    fontWeight = style.fontWeight ?: "",
    fontStyle = style.fontStyle ?: FONT_STYLE_NORMAL,
    includeFontPadding = style.includeFontPadding ?: true,
    textDirection = style.textDirection ?: ParagraphTextDirection.AUTO,
  )
}

internal fun resolveTextStyle(segment: InlineSegment, baseStyle: NativeTextStyle): NativeTextStyle {
  return NativeTextStyle(
    fontFamily = segment.fontFamily ?: baseStyle.fontFamily,
    fontSize = segment.fontSize ?: baseStyle.fontSize,
    lineHeight = segment.lineHeight ?: baseStyle.lineHeight,
    letterSpacing = segment.letterSpacing ?: baseStyle.letterSpacing,
    locale = segment.locale ?: baseStyle.locale,
    fontWeight = segment.fontWeight ?: baseStyle.fontWeight,
    fontStyle = segment.fontStyle ?: baseStyle.fontStyle,
    includeFontPadding = baseStyle.includeFontPadding,
    textDirection = baseStyle.textDirection,
  )
}

internal fun createTextPaint(style: NativeTextStyle): TextPaint {
  return TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
    textSize = resolveFontSizePx(style)
    typeface = resolveTypeface(style)
    isSubpixelText = true
    val fontSizePx = resolveFontSizePx(style)
    if (fontSizePx > 0f && style.letterSpacing != 0.0) {
      letterSpacing = (AndroidTextUnits.toPx(style.letterSpacing) / fontSizePx).toFloat()
    }
    textLocale = resolveTextLocale(style.locale)
  }
}

internal fun measureToken(token: String, style: NativeTextStyle): NativeTokenMetrics {
  val paint = createTextPaint(style)
  val metrics = paint.fontMetrics
  val ascent = metrics.ascent.toDouble()
  val descent = kotlin.math.max(0.0, metrics.descent.toDouble())
  val actualHeight = kotlin.math.max(0.0, descent - ascent)
  return NativeTokenMetrics(
    width = paint.measureText(token).toDouble(),
    lineHeight = kotlin.math.max(resolveLineHeightValue(style.lineHeight, paint), actualHeight),
    ascent = ascent,
    descent = descent,
  )
}

internal fun buildStyledText(
  text: String,
  runs: List<NativeTextRun>,
  inlineBoxes: List<NativeInlineBox> = emptyList(),
): CharSequence {
  if ((runs.isEmpty() && inlineBoxes.isEmpty()) || text.isEmpty()) {
    return text
  }

  val spannable = SpannableString(text)
  runs.forEach { run ->
    if (run.end <= run.start) {
      return@forEach
    }
    spannable.setSpan(
      InlineMetricSpan(run.style),
      run.start,
      run.end,
      Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
    )
    if (run.style.lineHeight > 0.0) {
      spannable.setSpan(
        InlineLineHeightSpan(run.style.lineHeight),
        run.start,
        run.end,
        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
      )
    }
  }
  inlineBoxes.forEach { box ->
    if (box.end <= box.start) {
      return@forEach
    }
    spannable.setSpan(
      InlineBoxSpan(box),
      box.start,
      box.end,
      Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
    )
  }
  return spannable
}

@androidx.annotation.RequiresApi(Build.VERSION_CODES.Q)
internal fun buildMeasuredText(
  text: String,
  runs: List<NativeTextRun>,
  inlineBoxes: List<NativeInlineBox>,
  defaultStyle: NativeTextStyle,
): Any {
  val builder = android.graphics.text.MeasuredText.Builder(text.toCharArray())
    .setComputeLayout(true)

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    builder.setComputeHyphenation(android.graphics.text.MeasuredText.Builder.HYPHENATION_MODE_NONE)
  } else {
    @Suppress("DEPRECATION")
    builder.setComputeHyphenation(false)
  }

  val sortedRuns = runs.sortedBy { it.start }
  val sortedBoxes = inlineBoxes.sortedBy { it.start }
  val bidiRuns = buildParagraphBidiRuns(text, defaultStyle)
  var cursor = 0
  var boxIndex = 0

  while (cursor < text.length) {
    while (boxIndex < sortedBoxes.size && sortedBoxes[boxIndex].end <= cursor) {
      boxIndex += 1
    }
    val box = sortedBoxes.getOrNull(boxIndex)
    if (box != null && box.start == cursor) {
      builder.appendReplacementRun(
        createTextPaint(defaultStyle),
        box.end - box.start,
        box.width.toFloat(),
      )
      cursor = box.end
      continue
    }

    val run = sortedRuns.firstOrNull { it.start <= cursor && it.end > cursor }
    val style = run?.style ?: defaultStyle
    val nextBoxStart = box?.start ?: text.length
    val runEnd = run?.end ?: text.length
    val end = minOf(text.length, nextBoxStart, runEnd)
    val paint = createTextPaint(style)
    appendParagraphBidiStyleRuns(builder, cursor, end, paint, bidiRuns)
    cursor = end
  }

  return builder.build()
}

private fun buildParagraphBidiRuns(
  text: String,
  style: NativeTextStyle,
): List<ParagraphBidiRun> {
  if (text.isEmpty()) {
    return emptyList()
  }

  val bidi = Bidi(text, resolveBidiBaseDirection(style))
  if (!bidi.isMixed) {
    return listOf(
      ParagraphBidiRun(
        start = 0,
        end = text.length,
        isRtl = !bidi.baseIsLeftToRight(),
      ),
    )
  }

  return (0 until bidi.runCount)
    .mapNotNull { runIndex ->
      val runStart = bidi.getRunStart(runIndex)
      val runLimit = bidi.getRunLimit(runIndex)
      if (runLimit <= runStart) {
        null
      } else {
        ParagraphBidiRun(
          start = runStart,
          end = runLimit,
          isRtl = bidi.getRunLevel(runIndex).toInt() % 2 == 1,
        )
      }
    }
}

@androidx.annotation.RequiresApi(Build.VERSION_CODES.Q)
private fun appendParagraphBidiStyleRuns(
  builder: android.graphics.text.MeasuredText.Builder,
  start: Int,
  end: Int,
  paint: TextPaint,
  bidiRuns: List<ParagraphBidiRun>,
) {
  if (end <= start) {
    return
  }

  if (bidiRuns.isEmpty()) {
    builder.appendStyleRun(paint, end - start, false)
    return
  }

  var cursor = start
  bidiRuns.forEach { bidiRun ->
    if (bidiRun.end <= cursor || bidiRun.start >= end) {
      return@forEach
    }

    val runStart = maxOf(cursor, bidiRun.start)
    val runEnd = minOf(end, bidiRun.end)
    if (runEnd <= runStart) {
      return@forEach
    }
    if (runStart > cursor) {
      builder.appendStyleRun(paint, runStart - cursor, false)
    }
    builder.appendStyleRun(paint, runEnd - runStart, bidiRun.isRtl)
    cursor = runEnd
  }

  if (cursor < end) {
    builder.appendStyleRun(paint, end - cursor, false)
  }
}

internal fun isRtlLocale(localeTag: String): Boolean {
  return TextUtils.getLayoutDirectionFromLocale(resolveTextLocale(localeTag)) == View.LAYOUT_DIRECTION_RTL
}

private fun resolveBidiBaseDirection(style: NativeTextStyle): Int {
  return when (style.textDirection) {
    ParagraphTextDirection.LTR -> Bidi.DIRECTION_LEFT_TO_RIGHT
    ParagraphTextDirection.RTL -> Bidi.DIRECTION_RIGHT_TO_LEFT
    ParagraphTextDirection.AUTO ->
      if (isRtlLocale(style.locale)) {
        Bidi.DIRECTION_DEFAULT_RIGHT_TO_LEFT
      } else {
        Bidi.DIRECTION_DEFAULT_LEFT_TO_RIGHT
      }
  }
}

internal fun resolveTextDirectionHeuristic(
  style: NativeTextStyle,
): TextDirectionHeuristic {
  return resolveTextDirectionHeuristic(style.textDirection, style.locale)
}

internal fun resolveTextDirectionHeuristic(
  textDirection: ParagraphTextDirection,
  locale: String,
): TextDirectionHeuristic {
  return when (textDirection) {
    ParagraphTextDirection.LTR -> TextDirectionHeuristics.LTR
    ParagraphTextDirection.RTL -> TextDirectionHeuristics.RTL
    ParagraphTextDirection.AUTO ->
      if (isRtlLocale(locale)) {
        TextDirectionHeuristics.FIRSTSTRONG_RTL
      } else {
        TextDirectionHeuristics.FIRSTSTRONG_LTR
      }
  }
}

internal fun resolveLineHeightValue(lineHeight: Double, paint: Paint): Double {
  return if (lineHeight > 0) AndroidTextUnits.toPx(lineHeight) else paint.fontSpacing.toDouble()
}

private fun resolveFontSizePx(style: NativeTextStyle): Float {
  return ceil(AndroidTextUnits.toPx(style.fontSize)).toFloat()
}

internal fun resolveTypeface(style: NativeTextStyle): Typeface {
  val fontStyle = resolveTypefaceStyle(style.fontWeight, style.fontStyle)
  val baseTypeface =
    when (style.fontFamily.lowercase()) {
      "system", "default", "" -> Typeface.DEFAULT
      "serif" -> Typeface.SERIF
      "monospace" -> Typeface.MONOSPACE
      else ->
        try {
          Typeface.create(style.fontFamily, Typeface.NORMAL)
        } catch (_: Exception) {
          Typeface.DEFAULT
        }
    }
  return fontStyle.apply(baseTypeface)
}

private data class ResolvedTypefaceStyle(
  val weight: Int,
  val italic: Boolean,
) {
  private val nearestStyle: Int
    get() =
      when {
        weight >= 700 && italic -> Typeface.BOLD_ITALIC
        weight >= 700 -> Typeface.BOLD
        italic -> Typeface.ITALIC
        else -> Typeface.NORMAL
      }

  fun apply(baseTypeface: Typeface): Typeface {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      Typeface.create(baseTypeface, weight, italic)
    } else {
      Typeface.create(baseTypeface, nearestStyle)
    }
  }
}

private fun parseFontWeight(fontWeight: String): Int {
  return when (fontWeight.lowercase()) {
    "100" -> 100
    "200" -> 200
    "300" -> 300
    "400", "normal", "" -> 400
    "500" -> 500
    "600" -> 600
    "700", "bold" -> 700
    "800" -> 800
    "900", "heavy", "black" -> 900
    else ->
      fontWeight.toIntOrNull()?.takeIf { it in 1..1000 } ?: 400
  }
}

internal fun resolveTextLocale(localeTag: String): Locale {
  val normalizedLocaleTag = localeTag.trim().replace('_', '-')
  if (normalizedLocaleTag.isBlank()) {
    return Locale.getDefault()
  }

  val locale = Locale.forLanguageTag(normalizedLocaleTag)
  return if (locale.toLanguageTag().isBlank() || locale.toLanguageTag() == "und") {
    Locale.getDefault()
  } else {
    locale
  }
}

private fun resolveTypefaceStyle(fontWeight: String, fontStyle: String): ResolvedTypefaceStyle {
  return ResolvedTypefaceStyle(
    weight = parseFontWeight(fontWeight),
    italic = fontStyle.lowercase() == FONT_STYLE_ITALIC,
  )
}

private class InlineMetricSpan(
  private val style: NativeTextStyle,
) : MetricAffectingSpan() {
  override fun updateMeasureState(textPaint: TextPaint) {
    apply(textPaint)
  }

  override fun updateDrawState(textPaint: TextPaint) {
    apply(textPaint)
  }

  private fun apply(textPaint: TextPaint) {
    textPaint.textSize = resolveFontSizePx(style)
    textPaint.typeface = resolveTypeface(style)
    textPaint.isSubpixelText = true
    val fontSizePx = resolveFontSizePx(style)
    textPaint.letterSpacing = if (fontSizePx > 0f && style.letterSpacing != 0.0) {
      (AndroidTextUnits.toPx(style.letterSpacing) / fontSizePx).toFloat()
    } else {
      0.0f
    }
    textPaint.textLocale = resolveTextLocale(style.locale)
  }
}

private class InlineLineHeightSpan(lineHeight: Double) : LineHeightSpan {
  private val lineHeightPx = ceil(AndroidTextUnits.toPx(lineHeight)).toInt()

  override fun chooseHeight(
    text: CharSequence,
    start: Int,
    end: Int,
    spanstartv: Int,
    v: Int,
    fm: Paint.FontMetricsInt,
  ) {
    val leading = lineHeightPx - ((-fm.ascent) + fm.descent)
    fm.ascent -= ceil(leading / 2.0).toInt()
    fm.descent += floor(leading / 2.0).toInt()

    if (start == 0) {
      fm.top = fm.ascent
    }
    if (end == text.length) {
      fm.bottom = fm.descent
    }
  }
}

private class InlineBoxSpan(
  private val box: NativeInlineBox,
) : ReplacementSpan() {
  override fun getSize(
    paint: Paint,
    text: CharSequence?,
    start: Int,
    end: Int,
    fm: Paint.FontMetricsInt?,
  ): Int {
    fm?.let { metrics ->
      val ascent = -box.baseline
      val descent = box.height - box.baseline
      metrics.ascent = kotlin.math.floor(ascent).toInt()
      metrics.descent = kotlin.math.ceil(descent).toInt()
      metrics.top = metrics.ascent
      metrics.bottom = metrics.descent
    }
    return kotlin.math.ceil(box.width).toInt()
  }

  override fun draw(
    canvas: Canvas,
    text: CharSequence?,
    start: Int,
    end: Int,
    x: Float,
    top: Int,
    y: Int,
    bottom: Int,
    paint: Paint,
  ) {
    // Inline boxes participate in native layout only. React Native overlays can render them from frames.
  }
}

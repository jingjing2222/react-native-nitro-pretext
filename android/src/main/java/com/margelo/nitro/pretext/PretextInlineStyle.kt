package com.margelo.nitro.pretext

import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.Canvas
import android.os.Build
import android.text.SpannableString
import android.text.Spanned
import android.text.TextDirectionHeuristic
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.text.style.MetricAffectingSpan
import android.text.style.ReplacementSpan
import android.text.TextUtils
import android.view.View
import java.util.Locale

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
    textSize = style.fontSize.toFloat()
    typeface = resolveTypeface(style)
    if (style.fontSize > 0 && style.letterSpacing != 0.0) {
      letterSpacing = (style.letterSpacing / style.fontSize).toFloat()
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
    val isRtl = resolveTextDirectionHeuristic(style)
      .isRtl(text, cursor, end - cursor)
    builder.appendStyleRun(paint, end - cursor, isRtl)
    cursor = end
  }

  return builder.build()
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
      if (TextUtils.getLayoutDirectionFromLocale(resolveTextLocale(locale)) == View.LAYOUT_DIRECTION_RTL) {
        TextDirectionHeuristics.FIRSTSTRONG_RTL
      } else {
        TextDirectionHeuristics.FIRSTSTRONG_LTR
      }
  }
}

internal fun resolveLineHeightValue(lineHeight: Double, paint: Paint): Double {
  return if (lineHeight > 0) lineHeight else paint.fontSpacing.toDouble()
}

internal fun resolveTypeface(style: NativeTextStyle): Typeface {
  val fontStyle = resolveTypefaceStyle(style.fontWeight, style.fontStyle)
  return when (style.fontFamily.lowercase()) {
    "system", "default", "" -> Typeface.create(Typeface.DEFAULT, fontStyle)
    "serif" -> Typeface.create(Typeface.SERIF, fontStyle)
    "monospace" -> Typeface.create(Typeface.MONOSPACE, fontStyle)
    else ->
      try {
        Typeface.create(style.fontFamily, fontStyle)
      } catch (_: Exception) {
        Typeface.create(Typeface.DEFAULT, fontStyle)
      }
  }
}

internal fun resolveTextLocale(localeTag: String): Locale {
  if (localeTag.isBlank()) {
    return Locale.getDefault()
  }

  val locale = Locale.forLanguageTag(localeTag)
  return if (locale.toLanguageTag().isBlank() || locale.toLanguageTag() == "und") {
    Locale.getDefault()
  } else {
    locale
  }
}

private fun resolveTypefaceStyle(fontWeight: String, fontStyle: String): Int {
  val wantsBold = when (fontWeight.lowercase()) {
    "600", "700", "800", "900", "semibold", "bold", "heavy", "black" -> true
    else -> false
  }
  val wantsItalic = fontStyle.lowercase() == FONT_STYLE_ITALIC
  return when {
    wantsBold && wantsItalic -> Typeface.BOLD_ITALIC
    wantsBold -> Typeface.BOLD
    wantsItalic -> Typeface.ITALIC
    else -> Typeface.NORMAL
  }
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
    textPaint.textSize = style.fontSize.toFloat()
    textPaint.typeface = resolveTypeface(style)
    textPaint.letterSpacing = if (style.fontSize > 0 && style.letterSpacing != 0.0) {
      (style.letterSpacing / style.fontSize).toFloat()
    } else {
      0.0f
    }
    textPaint.textLocale = resolveTextLocale(style.locale)
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
      metrics.top = minOf(metrics.top, metrics.ascent)
      metrics.bottom = maxOf(metrics.bottom, metrics.descent)
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

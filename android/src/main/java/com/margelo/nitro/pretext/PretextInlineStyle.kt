package com.margelo.nitro.pretext

import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.text.SpannableString
import android.text.Spanned
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.text.style.MetricAffectingSpan
import java.util.Locale

internal const val FONT_STYLE_NORMAL = "normal"
internal const val FONT_STYLE_ITALIC = "italic"

internal data class NativeTextStyle(
  val fontFamily: String,
  val fontSize: Double,
  val lineHeight: Double,
  val letterSpacing: Double,
  val locale: String,
  val fontWeight: String,
  val fontStyle: String,
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
  val ascent = kotlin.math.abs(metrics.ascent.toDouble())
  val descent = kotlin.math.max(0.0, metrics.descent.toDouble())
  return NativeTokenMetrics(
    width = paint.measureText(token).toDouble(),
    lineHeight = resolveLineHeightValue(style.lineHeight, paint),
    ascent = ascent,
    descent = descent,
  )
}

internal fun buildStyledText(text: String, runs: List<NativeTextRun>): CharSequence {
  if (runs.isEmpty() || text.isEmpty()) {
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
  return spannable
}

internal fun buildMeasuredText(text: String, runs: List<NativeTextRun>): Any {
  val builder = android.graphics.text.MeasuredText.Builder(text.toCharArray())
    .setComputeLayout(false)

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    builder.setComputeHyphenation(android.graphics.text.MeasuredText.Builder.HYPHENATION_MODE_NONE)
  } else {
    @Suppress("DEPRECATION")
    builder.setComputeHyphenation(false)
  }

  for (run in runs) {
    if (run.end <= run.start) {
      continue
    }
    val paint = createTextPaint(run.style)
    val isRtl = TextDirectionHeuristics.FIRSTSTRONG_LTR.isRtl(text, run.start, run.end - run.start)
    builder.appendStyleRun(paint, run.end - run.start, isRtl)
  }

  return builder.build()
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

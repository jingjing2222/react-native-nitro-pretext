package com.margelo.nitro.pretext

import android.content.res.Resources
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Build
import android.text.BoringLayout
import android.text.Layout
import android.text.SpannableString
import android.text.Spanned
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.text.style.LineHeightSpan
import android.text.style.MetricAffectingSpan
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.Locale

@RunWith(AndroidJUnit4::class)
class AndroidStaticLayoutParityFixtureTest {
  @Test
  fun complexTextBucketsMatchRnCompatibleStaticLayout() {
    parityFixtures.forEach { fixture ->
      val prepared = PretextShared.prepareParagraphsWithStats(arrayOf(fixture.text), fixture.style)
      try {
        val actual =
          PretextShared.layoutParagraphLinesWithDiagnostics(
            prepared.prepared.id,
            ParagraphLayoutRequest(
              width = fixture.width,
              left = 0.0,
              whiteSpace = WHITE_SPACE_NORMAL,
              wordBreak = WORD_BREAK_NORMAL,
              shapeSlices = emptyArray(),
            ),
          ).single()
        val expected = buildStaticLayoutOracle(fixture)

        assertEquals("${fixture.id} engine", LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT, actual.diagnostics.layoutEngine)
        assertFalse("${fixture.id} engine drift", actual.diagnostics.driftKinds.contains(DRIFT_ENGINE))
        assertEquals("${fixture.id} line count", expected.size, actual.lines.size)

        expected.zip(actual.lines).forEachIndexed { index, (expectedLine, actualLine) ->
          assertEquals("${fixture.id} line $index textStart", expectedLine.start, actualLine.textStart.toInt())
          assertEquals("${fixture.id} line $index textEnd", expectedLine.end, actualLine.textEnd.toInt())
          assertClose("${fixture.id} line $index left", expectedLine.left, actualLine.left)
          assertClose("${fixture.id} line $index top", expectedLine.top, actualLine.top)
          assertClose("${fixture.id} line $index width", expectedLine.width, actualLine.width)
          assertClose("${fixture.id} line $index height", expectedLine.height, actualLine.height)
        }

        assertTrue("${fixture.id} produced at least one line", actual.lines.isNotEmpty())
      } finally {
        PretextShared.releaseParagraphs(prepared.prepared.id)
      }
    }
  }

  private fun buildStaticLayoutOracle(fixture: Fixture): List<OracleLine> {
    val text = buildOracleStyledText(fixture.text, fixture.style)
    val paint = createOracleTextPaint(fixture.style)
    val layoutWidth = max(1, floor(toPx(fixture.width)).toInt())
    val alignment = if (TextDirectionHeuristics.FIRSTSTRONG_LTR.isRtl(text, 0, text.length)) {
      Layout.Alignment.ALIGN_OPPOSITE
    } else {
      Layout.Alignment.ALIGN_NORMAL
    }
    val boring = resolveReactBoringMetrics(text, paint)
    val layout =
      if (boring != null && boring.width <= layoutWidth) {
        @Suppress("DEPRECATION")
        BoringLayout.make(
          text,
          paint,
          layoutWidth,
          alignment,
          1f,
          0f,
          boring,
          fixture.style.includeFontPadding ?: true,
        )
      } else {
        StaticLayout.Builder.obtain(text, 0, text.length, paint, layoutWidth)
          .setAlignment(alignment)
          .setLineSpacing(0f, 1f)
          .setIncludePad(fixture.style.includeFontPadding ?: true)
          .setTextDirection(TextDirectionHeuristics.FIRSTSTRONG_LTR)
          .setBreakStrategy(Layout.BREAK_STRATEGY_HIGH_QUALITY)
          .setHyphenationFrequency(Layout.HYPHENATION_FREQUENCY_NONE)
          .apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
              setUseLineSpacingFromFallbacks(true)
            }
          }
          .build()
      }

    val bounds = Rect()
    return (0 until layout.lineCount).map { index ->
      val end = layout.getLineEnd(index)
      val endsWithNewLine = text.isNotEmpty() && end > 0 && text[end - 1] == '\n'
      layout.getLineBounds(index, bounds)
      OracleLine(
        start = layout.getLineStart(index),
        end = end,
        left = fromPx(layout.getLineLeft(index).toDouble()),
        top = fromPx(bounds.top.toDouble()),
        width =
          fromPx(
            if (endsWithNewLine) {
              layout.getLineMax(index)
            } else {
              layout.getLineWidth(index)
            }.toDouble(),
          ),
        height = fromPx(bounds.height().toDouble()),
      )
    }
  }

  private fun buildOracleStyledText(text: String, style: ParagraphStyle): CharSequence {
    val spannable = SpannableString(text)
    spannable.setSpan(OracleMetricSpan(style), 0, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    if (style.lineHeight > 0.0) {
      spannable.setSpan(OracleLineHeightSpan(style.lineHeight), 0, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
    return spannable
  }

  private fun createOracleTextPaint(style: ParagraphStyle): TextPaint {
    return TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
      textSize = resolveFontSizePx(style)
      typeface = resolveOracleTypeface(style)
      isSubpixelText = true
      textLocale = resolveOracleLocale(style.locale)
      if (textSize > 0f && style.letterSpacing != 0.0) {
        letterSpacing = (toPx(style.letterSpacing) / textSize).toFloat()
      }
    }
  }

  private class OracleMetricSpan(
    private val style: ParagraphStyle,
  ) : MetricAffectingSpan() {
    override fun updateMeasureState(textPaint: TextPaint) {
      apply(textPaint)
    }

    override fun updateDrawState(textPaint: TextPaint) {
      apply(textPaint)
    }

    private fun apply(textPaint: TextPaint) {
      textPaint.textSize = resolveFontSizePx(style)
      textPaint.typeface = resolveOracleTypeface(style)
      textPaint.isSubpixelText = true
      textPaint.textLocale = resolveOracleLocale(style.locale)
      textPaint.letterSpacing =
        if (textPaint.textSize > 0f && style.letterSpacing != 0.0) {
          (toPx(style.letterSpacing) / textPaint.textSize).toFloat()
        } else {
          0f
        }
    }
  }

  private class OracleLineHeightSpan(lineHeight: Double) : LineHeightSpan {
    private val lineHeightPx = ceil(toPx(lineHeight)).toInt()

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

  private data class Fixture(
    val id: String,
    val text: String,
    val width: Double,
    val style: ParagraphStyle,
  )

  private data class OracleLine(
    val start: Int,
    val end: Int,
    val left: Double,
    val top: Double,
    val width: Double,
    val height: Double,
  )

  private companion object {
    private const val GEOMETRY_TOLERANCE = 0.02

    private val parityFixtures =
      listOf(
        Fixture(
          id = "android-rtl-arabic-left-alignment",
          text = "تحتاج البطاقة إلى قياس النص العربي قبل أن يظهر السطح النهائي.",
          width = 324.0,
          style = baseStyle(),
        ),
        Fixture(
          id = "android-explicit-rtl-ltr-width",
          text = "RTL style override should keep Arabic النص aligned correctly.",
          width = 228.0,
          style = baseStyle(textDirection = ParagraphTextDirection.RTL),
        ),
        Fixture(
          id = "android-cjk-weight-600-letter-spacing",
          text = "CJK style case uses 中文과 한국어 with wider font metrics.",
          width = 308.0,
          style = baseStyle(fontWeight = "600", letterSpacing = 0.2),
        ),
        Fixture(
          id = "android-emoji-zwj-fallback",
          text = "Status 👩🏽‍💻 ships with flags 🇰🇷🇺🇸 and family emoji 👨‍👩‍👧‍👦 in one card.",
          width = 260.0,
          style = baseStyle(locale = "en-US"),
        ),
        Fixture(
          id = "android-indic-complex-clusters",
          text = "हिन्दी में संयुक्त अक्षर और मात्रा wrap boundary के पास रहती है.",
          width = 244.0,
          style = baseStyle(locale = "hi-IN"),
        ),
        Fixture(
          id = "android-thai-no-space",
          text = "ภาษาไทยไม่มีช่องว่างยาวมากและควรตัดบรรทัดอย่างคงที่",
          width = 212.0,
          style = baseStyle(locale = "th-TH"),
        ),
        Fixture(
          id = "android-include-font-padding-off",
          text = "Padding off should still keep explicit line height stable with emoji ✨.",
          width = 292.0,
          style = baseStyle(includeFontPadding = false),
        ),
        Fixture(
          id = "android-boring-fallback-line-spacing",
          text = "Status ✅ ready",
          width = 220.0,
          style = baseStyle(lineHeight = 0.0, locale = "en-US"),
        ),
      )

    private fun baseStyle(
      fontWeight: String? = null,
      includeFontPadding: Boolean = true,
      lineHeight: Double = 28.0,
      letterSpacing: Double = 0.0,
      locale: String = "",
      textDirection: ParagraphTextDirection = ParagraphTextDirection.AUTO,
    ): ParagraphStyle {
      return ParagraphStyle(
        fontFamily = "System",
        fontSize = 18.0,
        lineHeight = lineHeight,
        letterSpacing = letterSpacing,
        locale = locale,
        fontWeight = fontWeight,
        fontStyle = null,
        includeFontPadding = includeFontPadding,
        textDirection = textDirection,
      )
    }

    private fun assertClose(label: String, expected: Double, actual: Double) {
      assertTrue("$label expected=$expected actual=$actual", abs(expected - actual) <= GEOMETRY_TOLERANCE)
    }

    private fun resolveFontSizePx(style: ParagraphStyle): Float {
      return ceil(toPx(style.fontSize)).toFloat()
    }

    private fun resolveOracleTypeface(style: ParagraphStyle): Typeface {
      val wantsBold =
        when (style.fontWeight?.lowercase()) {
          "700", "800", "900", "bold", "heavy", "black" -> true
          else -> false
        }
      val wantsItalic = style.fontStyle == FONT_STYLE_ITALIC
      val typefaceStyle =
        when {
          wantsBold && wantsItalic -> Typeface.BOLD_ITALIC
          wantsBold -> Typeface.BOLD
          wantsItalic -> Typeface.ITALIC
          else -> Typeface.NORMAL
        }
      return Typeface.create(Typeface.DEFAULT, typefaceStyle)
    }

    private fun resolveReactBoringMetrics(
      text: CharSequence,
      paint: TextPaint,
    ): BoringLayout.Metrics? {
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        BoringLayout.isBoring(
          text,
          paint,
          TextDirectionHeuristics.FIRSTSTRONG_LTR,
          true,
          null,
        )
      } else {
        BoringLayout.isBoring(text, paint)
      }
    }

    private fun resolveOracleLocale(localeTag: String): Locale {
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

    private fun toPx(value: Double): Double {
      return value * density
    }

    private fun fromPx(value: Double): Double {
      return value / density
    }

    private val density: Double
      get() = Resources.getSystem().displayMetrics.density.toDouble().takeIf { it > 0.0 } ?: 1.0
  }
}

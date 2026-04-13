package com.margelo.nitro.pretext

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.text.Layout
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.view.View
import kotlin.math.ceil

internal class PreparedParagraphView(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var preparedId: Double = 0.0
  private var paragraphIndex: Int = 0
  private var layoutWidth: Double = 0.0
  private var layoutRequest: NativeLayoutRequest? = null
  private var text: String = ""
  private var styledText: CharSequence = ""
  private var lines: List<NativePreparedLineRange> = emptyList()
  private var hasStyledRuns: Boolean = false
  private var fontFamily: String = "System"
  private var fontWeight: String = ""
  private var fontStyle: String = "normal"
  private var fontSize: Double = 14.0
  private var lineHeight: Double = 20.0
  private var letterSpacing: Double = 0.0
  private var textColor: Int = Color.BLACK
  private var contentInsetLeft: Double = 0.0
  private var contentInsetTop: Double = 0.0

  init {
    updatePaint()
  }

  fun setPreparedId(nextPreparedId: Double) {
    if (preparedId == nextPreparedId) {
      return
    }
    preparedId = nextPreparedId
    rebuildLayout()
  }

  fun setParagraphIndex(nextParagraphIndex: Int) {
    if (paragraphIndex == nextParagraphIndex) {
      return
    }
    paragraphIndex = nextParagraphIndex
    rebuildLayout()
  }

  fun setLayoutWidth(nextLayoutWidth: Double) {
    if (layoutWidth == nextLayoutWidth) {
      return
    }
    layoutWidth = nextLayoutWidth
    rebuildLayout()
  }

  fun setLayoutRequest(nextLayoutRequest: NativeLayoutRequest?) {
    if (layoutRequest == nextLayoutRequest) {
      return
    }
    layoutRequest = nextLayoutRequest
    rebuildLayout()
  }

  fun setFontFamily(nextFontFamily: String?) {
    val resolvedFontFamily = nextFontFamily ?: "System"
    if (fontFamily == resolvedFontFamily) {
      return
    }
    fontFamily = resolvedFontFamily
    updatePaint()
  }

  fun setFontWeight(nextFontWeight: String?) {
    val resolvedFontWeight = nextFontWeight ?: ""
    if (fontWeight == resolvedFontWeight) {
      return
    }
    fontWeight = resolvedFontWeight
    updatePaint()
  }

  fun setFontStyle(nextFontStyle: String?) {
    val resolvedFontStyle = nextFontStyle ?: "normal"
    if (fontStyle == resolvedFontStyle) {
      return
    }
    fontStyle = resolvedFontStyle
    updatePaint()
  }

  fun setFontSize(nextFontSize: Double) {
    if (fontSize == nextFontSize) {
      return
    }
    fontSize = nextFontSize
    updatePaint()
  }

  fun setLineHeight(nextLineHeight: Double) {
    if (lineHeight == nextLineHeight) {
      return
    }
    lineHeight = nextLineHeight
    invalidate()
  }

  fun setLetterSpacing(nextLetterSpacing: Double) {
    if (letterSpacing == nextLetterSpacing) {
      return
    }
    letterSpacing = nextLetterSpacing
    updatePaint()
  }

  fun setParagraphTextColor(nextTextColor: Int?) {
    val resolvedTextColor = nextTextColor ?: Color.BLACK
    if (textColor == resolvedTextColor) {
      return
    }
    textColor = resolvedTextColor
    updatePaint()
  }

  fun setContentInsetLeft(nextContentInsetLeft: Double) {
    if (contentInsetLeft == nextContentInsetLeft) {
      return
    }
    contentInsetLeft = nextContentInsetLeft
    invalidate()
  }

  fun setContentInsetTop(nextContentInsetTop: Double) {
    if (contentInsetTop == nextContentInsetTop) {
      return
    }
    contentInsetTop = nextContentInsetTop
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)

    lines.forEach { line ->
      if (line.textEnd <= line.textStart || line.textStart < 0 || line.textEnd > text.length) {
        return@forEach
      }

      val x = (contentInsetLeft + line.left).toFloat()
      val effectiveLineHeight = if (line.height > 0.0) line.height else lineHeight
      val actualHeight = maxOf(0.0, line.descent - line.ascent)
      val centeredTop = contentInsetTop + line.top + maxOf(0.0, (effectiveLineHeight - actualHeight) / 2.0)
      if (hasStyledRuns) {
        val lineText = styledText.subSequence(line.textStart, line.textEnd)
        val layout =
          StaticLayout.Builder.obtain(
            lineText,
            0,
            lineText.length,
            TextPaint(paint),
            maxOf(1, ceil(maxOf(line.width, layoutWidth) + 4.0).toInt()),
          )
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(0f, 1f)
            .setIncludePad(false)
            .setTextDirection(TextDirectionHeuristics.FIRSTSTRONG_LTR)
            .build()
        canvas.save()
        canvas.translate(x, centeredTop.toFloat())
        layout.draw(canvas)
        canvas.restore()
      } else {
        val baseline = (centeredTop - line.ascent).toFloat()
        canvas.drawText(text, line.textStart, line.textEnd, x, baseline, paint)
      }
    }
  }

  private fun updatePaint() {
    paint.textSize = fontSize.toFloat()
    paint.typeface =
      resolveTypeface(
        NativeTextStyle(
          fontFamily = fontFamily,
          fontSize = fontSize,
          lineHeight = lineHeight,
          letterSpacing = letterSpacing,
          locale = "",
          fontWeight = fontWeight,
          fontStyle = fontStyle,
        ),
      )
    paint.color = textColor
    paint.letterSpacing = if (fontSize > 0.0 && letterSpacing != 0.0) {
      (letterSpacing / fontSize).toFloat()
    } else {
      0.0f
    }
    invalidate()
  }

  private fun rebuildLayout() {
    val resolvedRequest = layoutRequest ?: defaultLayoutRequest(layoutWidth)

    if (preparedId <= 0.0 || resolvedRequest.width <= 0.0) {
      text = ""
      lines = emptyList()
      invalidate()
      return
    }

    val drawing = PretextShared.resolveParagraphDrawing(
      preparedId = preparedId,
      paragraphIndex = paragraphIndex,
      request = resolvedRequest,
    )
    text = drawing?.text.orEmpty()
    styledText = drawing?.styledText ?: ""
    lines = drawing?.lines ?: emptyList()
    hasStyledRuns = drawing?.hasStyledRuns == true
    invalidate()
  }

  private fun defaultLayoutRequest(width: Double): NativeLayoutRequest {
    return NativeLayoutRequest(
      width = maxOf(1.0, width),
      left = 0.0,
      whiteSpace = WHITE_SPACE_NORMAL,
      wordBreak = WORD_BREAK_NORMAL,
      shapeSlices = emptyList(),
    )
  }
}

package com.margelo.nitro.pretext

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.text.MeasuredText
import android.os.Build
import android.view.View

internal class PreparedParagraphView(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var preparedId: Double = 0.0
  private var paragraphIndex: Int = 0
  private var layoutWidth: Double = 0.0
  private var layoutRequest: NativeLayoutRequest? = null
  private var text: String = ""
  private var lines: List<NativePreparedLineRange> = emptyList()
  private var measuredText: Any? = null
  private var runs: List<NativeTextRun> = emptyList()
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
      val baseline = (centeredTop - line.ascent).toFloat()
      drawLine(canvas, line, x, baseline)
    }
  }

  private fun drawLine(
    canvas: Canvas,
    line: NativePreparedLineRange,
    x: Float,
    baseline: Float,
  ) {
    var drewRun = false
    runs.forEach { run ->
      val segmentStart = maxOf(line.textStart, run.start)
      val segmentEnd = minOf(line.textEnd, run.end)
      if (segmentEnd <= segmentStart) {
        return@forEach
      }

      val segmentPaint = createTextPaint(run.style).apply {
        color = textColor
      }
      val segmentX = x + resolveAdvance(line.textStart, segmentStart)
      val isRtl = resolveTextDirectionHeuristic(run.style.textDirection)
        .isRtl(text, segmentStart, segmentEnd - segmentStart)
      canvas.drawTextRun(
        text,
        segmentStart,
        segmentEnd,
        line.textStart,
        line.textEnd,
        segmentX,
        baseline,
        isRtl,
        segmentPaint,
      )
      drewRun = true
    }

    if (!drewRun) {
      canvas.drawTextRun(
        text,
        line.textStart,
        line.textEnd,
        line.textStart,
        line.textEnd,
        x,
        baseline,
        false,
        paint,
      )
    }
  }

  private fun resolveAdvance(start: Int, end: Int): Float {
    if (end <= start) {
      return 0f
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val measuredParagraph = measuredText as? MeasuredText
      if (measuredParagraph != null) {
        return measuredParagraph.getWidth(start, end)
      }
    }

    return measureRangeWithRuns(start, end).toFloat()
  }

  private fun measureRangeWithRuns(start: Int, end: Int): Double {
    var width = 0.0
    var cursor = start
    runs.forEach { run ->
      val segmentStart = maxOf(cursor, run.start)
      val segmentEnd = minOf(end, run.end)
      val gapEnd = minOf(end, segmentStart)
      if (gapEnd > cursor) {
        width += paint.measureText(text, cursor, gapEnd).toDouble()
        cursor = gapEnd
      }
      if (segmentEnd > segmentStart) {
        width += createTextPaint(run.style).measureText(text, segmentStart, segmentEnd).toDouble()
        cursor = segmentEnd
      }
    }
    if (cursor < end) {
      width += paint.measureText(text, cursor, end).toDouble()
    }
    return width
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
          includeFontPadding = true,
          textDirection = ParagraphTextDirection.AUTO,
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
    lines = drawing?.lines ?: emptyList()
    measuredText = drawing?.measuredText
    runs = drawing?.runs ?: emptyList()
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

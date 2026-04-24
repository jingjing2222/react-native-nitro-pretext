package com.margelo.nitro.pretext

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.text.MeasuredText
import android.os.Build

internal object PreparedParagraphCanvasRenderer {
  fun drawParagraph(
    canvas: Canvas,
    drawing: NativeParagraphDrawing,
    originX: Double,
    originY: Double,
    defaultLineHeight: Double,
    textColor: Int,
    fallbackPaint: Paint,
  ) {
    drawing.lines.forEach { line ->
      if (line.textEnd <= line.textStart || line.textStart < 0 || line.textEnd > drawing.text.length) {
        return@forEach
      }

      val x = (originX + line.left).toFloat()
      val effectiveLineHeight = if (line.height > 0.0) line.height else defaultLineHeight
      val actualHeight = maxOf(0.0, line.descent - line.ascent)
      val centeredTop = originY + line.top + maxOf(0.0, (effectiveLineHeight - actualHeight) / 2.0)
      val baseline = (centeredTop - line.ascent).toFloat()
      drawLine(
        canvas = canvas,
        drawing = drawing,
        line = line,
        x = x,
        baseline = baseline,
        textColor = textColor,
        fallbackPaint = fallbackPaint,
      )
    }
  }

  private fun drawLine(
    canvas: Canvas,
    drawing: NativeParagraphDrawing,
    line: NativePreparedLineRange,
    x: Float,
    baseline: Float,
    textColor: Int,
    fallbackPaint: Paint,
  ) {
    var drewRun = false
    drawing.runs.forEach { run ->
      val segmentStart = maxOf(line.textStart, run.start)
      val segmentEnd = minOf(line.textEnd, run.end)
      if (segmentEnd <= segmentStart) {
        return@forEach
      }

      val segmentPaint = createTextPaint(run.style).apply {
        color = textColor
      }
      val segmentX = x + resolveAdvance(drawing, line.textStart, segmentStart, fallbackPaint)
      val isRtl = resolveTextDirectionHeuristic(run.style)
        .isRtl(drawing.text, segmentStart, segmentEnd - segmentStart)
      canvas.drawTextRun(
        drawing.text,
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

    if (!drewRun && drawing.inlineBoxes.none { it.end > line.textStart && it.start < line.textEnd }) {
      fallbackPaint.color = textColor
      canvas.drawTextRun(
        drawing.text,
        line.textStart,
        line.textEnd,
        line.textStart,
        line.textEnd,
        x,
        baseline,
        false,
        fallbackPaint,
      )
    }
  }

  private fun resolveAdvance(
    drawing: NativeParagraphDrawing,
    start: Int,
    end: Int,
    fallbackPaint: Paint,
  ): Float {
    if (end <= start) {
      return 0f
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val measuredParagraph = drawing.measuredText as? MeasuredText
      if (measuredParagraph != null) {
        return measuredParagraph.getWidth(start, end)
      }
    }

    return measureRangeWithRuns(drawing, start, end, fallbackPaint).toFloat()
  }

  private fun measureRangeWithRuns(
    drawing: NativeParagraphDrawing,
    start: Int,
    end: Int,
    fallbackPaint: Paint,
  ): Double {
    var width = 0.0
    var cursor = start
    val sortedBoxes = drawing.inlineBoxes.sortedBy { it.start }
    drawing.runs.forEach { run ->
      while (cursor < end) {
        val box = sortedBoxes.firstOrNull { it.start == cursor }
        if (box == null) {
          break
        }
        width += box.width
        cursor = minOf(end, box.end)
      }
      val segmentStart = maxOf(cursor, run.start)
      val segmentEnd = minOf(end, run.end)
      val gapEnd = minOf(end, segmentStart)
      if (gapEnd > cursor) {
        width += fallbackPaint.measureText(drawing.text, cursor, gapEnd).toDouble()
        cursor = gapEnd
      }
      if (segmentEnd > segmentStart) {
        width += createTextPaint(run.style).measureText(drawing.text, segmentStart, segmentEnd).toDouble()
        cursor = segmentEnd
      }
    }
    while (cursor < end) {
      val box = sortedBoxes.firstOrNull { it.start == cursor }
      if (box == null) {
        break
      }
      width += box.width
      cursor = minOf(end, box.end)
    }
    if (cursor < end) {
      width += fallbackPaint.measureText(drawing.text, cursor, end).toDouble()
    }
    return width
  }
}

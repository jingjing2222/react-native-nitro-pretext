package com.margelo.nitro.pretext

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.view.View

internal class PreparedParagraphView(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var preparedId: Double = 0.0
  private var paragraphIndex: Int = 0
  private var layoutWidth: Double = 0.0
  private var text: String = ""
  private var lines: List<NativePreparedLineRange> = emptyList()
  private var fontFamily: String = "System"
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

  fun setFontFamily(nextFontFamily: String?) {
    val resolvedFontFamily = nextFontFamily ?: "System"
    if (fontFamily == resolvedFontFamily) {
      return
    }
    fontFamily = resolvedFontFamily
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
      canvas.drawText(text, line.textStart, line.textEnd, x, baseline, paint)
    }
  }

  private fun updatePaint() {
    paint.textSize = fontSize.toFloat()
    paint.typeface = resolveTypeface(fontFamily)
    paint.color = textColor
    paint.letterSpacing = if (fontSize > 0.0 && letterSpacing != 0.0) {
      (letterSpacing / fontSize).toFloat()
    } else {
      0.0f
    }
    invalidate()
  }

  private fun rebuildLayout() {
    if (preparedId <= 0.0 || layoutWidth <= 0.0) {
      text = ""
      lines = emptyList()
      invalidate()
      return
    }

    val drawing = PretextShared.resolveParagraphDrawing(
      preparedId = preparedId,
      paragraphIndex = paragraphIndex,
      width = layoutWidth,
    )
    text = drawing?.text.orEmpty()
    lines = drawing?.lines ?: emptyList()
    invalidate()
  }

  private fun resolveTypeface(resolvedFontFamily: String): Typeface {
    return when (resolvedFontFamily.lowercase()) {
      "system", "default", "" -> Typeface.DEFAULT
      "serif" -> Typeface.SERIF
      "monospace" -> Typeface.MONOSPACE
      else ->
        try {
          Typeface.create(resolvedFontFamily, Typeface.NORMAL)
        } catch (_: Exception) {
          Typeface.DEFAULT
        }
    }
  }
}

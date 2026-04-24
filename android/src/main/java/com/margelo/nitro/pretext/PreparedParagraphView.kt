package com.margelo.nitro.pretext

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View

internal class PreparedParagraphView(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var preparedId: Double = 0.0
  private var paragraphIndex: Int = 0
  private var layoutWidth: Double = 0.0
  private var layoutRequest: NativeLayoutRequest? = null
  private var drawing: NativeParagraphDrawing? = null
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

    drawing?.let { paragraphDrawing ->
      PreparedParagraphCanvasRenderer.drawParagraph(
        canvas = canvas,
        drawing = paragraphDrawing,
        originX = contentInsetLeft,
        originY = contentInsetTop,
        defaultLineHeight = lineHeight,
        textColor = textColor,
        fallbackPaint = paint,
      )
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
      drawing = null
      invalidate()
      return
    }

    drawing = PretextShared.resolveParagraphDrawing(
      preparedId = preparedId,
      paragraphIndex = paragraphIndex,
      request = resolvedRequest,
    )
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

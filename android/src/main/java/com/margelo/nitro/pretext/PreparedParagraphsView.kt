package com.margelo.nitro.pretext

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View

internal class PreparedParagraphsView(context: Context) : View(context) {
  private val fallbackPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var preparedId: Double = 0.0
  private var layoutWidth: Double = 0.0
  private var layoutRequest: NativeLayoutRequest? = null
  private var paragraphCount: Int = 0
  private var paragraphGap: Double = 0.0
  private var textColor: Int = Color.BLACK
  private var contentInsetLeft: Double = 0.0
  private var contentInsetTop: Double = 0.0
  private var drawings: List<NativeParagraphDrawing> = emptyList()

  init {
    PretextShared.setApplicationContext(context)
  }

  fun setPreparedId(nextPreparedId: Double) {
    if (preparedId == nextPreparedId) {
      return
    }
    preparedId = nextPreparedId
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

  fun setParagraphCount(nextParagraphCount: Int) {
    val resolvedCount = maxOf(0, nextParagraphCount)
    if (paragraphCount == resolvedCount) {
      return
    }
    paragraphCount = resolvedCount
    rebuildLayout()
  }

  fun setParagraphGap(nextParagraphGap: Double) {
    if (paragraphGap == nextParagraphGap) {
      return
    }
    paragraphGap = nextParagraphGap
    invalidate()
  }

  fun setParagraphTextColor(nextTextColor: Int?) {
    val resolvedTextColor = nextTextColor ?: Color.BLACK
    if (textColor == resolvedTextColor) {
      return
    }
    textColor = resolvedTextColor
    invalidate()
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

    var paragraphTop = 0.0
    drawings.forEachIndexed { index, drawing ->
      PreparedParagraphCanvasRenderer.drawParagraph(
        canvas = canvas,
        drawing = drawing,
        originX = contentInsetLeft,
        originY = paragraphTop + contentInsetTop,
        defaultLineHeight = 0.0,
        textColor = textColor,
        fallbackPaint = fallbackPaint,
      )
      paragraphTop += resolveParagraphHeight(drawing) + contentInsetTop * 2.0
      if (index < drawings.lastIndex) {
        paragraphTop += paragraphGap
      }
    }
  }

  private fun rebuildLayout() {
    val resolvedRequest = layoutRequest ?: defaultLayoutRequest(layoutWidth)

    if (preparedId <= 0.0 || resolvedRequest.width <= 0.0) {
      drawings = emptyList()
      invalidate()
      return
    }

    val resolvedDrawings =
      PretextShared.resolveParagraphsDrawing(
        preparedId = preparedId,
        request = resolvedRequest,
      ) ?: emptyList()
    drawings =
      if (paragraphCount > 0) {
        resolvedDrawings.take(paragraphCount)
      } else {
        resolvedDrawings
      }
    invalidate()
  }

  private fun resolveParagraphHeight(drawing: NativeParagraphDrawing): Double {
    return drawing.lines.lastOrNull()?.let { line -> line.top + line.height } ?: 0.0
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

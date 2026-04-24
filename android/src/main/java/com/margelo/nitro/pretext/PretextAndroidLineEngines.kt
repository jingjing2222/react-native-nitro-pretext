package com.margelo.nitro.pretext

import android.graphics.Paint
import android.graphics.text.LineBreaker
import android.graphics.text.MeasuredText
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

internal fun resolveAlignedLineLeft(
  constraintLeft: Double,
  constraintWidth: Double,
  lineWidth: Double,
  lineText: CharSequence,
  textDirection: ParagraphTextDirection,
  textLocale: String,
): Double {
  val isRtlLine =
    when (textDirection) {
      ParagraphTextDirection.LTR -> false
      ParagraphTextDirection.RTL -> true
      ParagraphTextDirection.AUTO ->
        if (lineText.isEmpty()) {
          isRtlLocale(textLocale)
        } else {
          resolveTextDirectionHeuristic(textDirection, textLocale).isRtl(lineText, 0, lineText.length)
        }
    }

  return if (isRtlLine) {
    constraintLeft + max(0.0, constraintWidth - max(0.0, lineWidth))
  } else {
    constraintLeft
  }
}

@androidx.annotation.RequiresApi(Build.VERSION_CODES.Q)
internal object Api29LineLayout {
  fun createLineBreaker(): Any {
    return LineBreaker.Builder()
      .setBreakStrategy(LineBreaker.BREAK_STRATEGY_HIGH_QUALITY)
      .setHyphenationFrequency(LineBreaker.HYPHENATION_FREQUENCY_NONE)
      .build()
  }

  private fun resolveLineFontPadding(
    textPaint: TextPaint,
    runs: List<NativeTextRun>,
    start: Int,
    end: Int,
  ): NativeLineFontPadding {
    var topPadding = 0.0
    var bottomPadding = 0.0

    fun absorbMetrics(metrics: Paint.FontMetricsInt) {
      topPadding = max(topPadding, (metrics.ascent - metrics.top).toDouble())
      bottomPadding = max(bottomPadding, (metrics.bottom - metrics.descent).toDouble())
    }

    absorbMetrics(textPaint.fontMetricsInt)
    runs.forEach { run ->
      if (run.end > start && run.start < end) {
        absorbMetrics(createTextPaint(run.style).fontMetricsInt)
      }
    }

    return NativeLineFontPadding(
      top = topPadding,
      bottom = bottomPadding,
    )
  }

  fun layoutLineLayouts(
    text: String,
    measuredText: Any,
    lineBreaker: Any,
    textPaint: TextPaint,
    defaultStyle: NativeTextStyle,
    runs: List<NativeTextRun>,
    inlineBoxes: List<NativeInlineBox>,
    width: Double,
    left: Double,
    defaultLineHeight: Double,
    includeFontPadding: Boolean,
  ): List<NativeLineLayout> {
    if (text.indexOf('\n') >= 0) {
      return layoutHardBreakLineLayouts(
        text = text,
        lineBreaker = lineBreaker,
        textPaint = textPaint,
        defaultStyle = defaultStyle,
        runs = runs,
        inlineBoxes = inlineBoxes,
        width = width,
        left = left,
        defaultLineHeight = defaultLineHeight,
        includeFontPadding = includeFontPadding,
      )
    }

    val measuredParagraph = measuredText as MeasuredText
    val breaker = lineBreaker as LineBreaker
    val constraints = LineBreaker.ParagraphConstraints().apply {
      setWidth(max(1f, width.toFloat()))
    }
    val result = breaker.computeLineBreaks(measuredParagraph, constraints, 0)
    if (result.lineCount == 0) {
      return listOf(
        NativeLineLayout(
          textStart = 0,
          textEnd = 0,
          width = 0.0,
          left =
            resolveAlignedLineLeft(
              constraintLeft = left,
              constraintWidth = width,
              lineWidth = 0.0,
              lineText = "",
              textDirection = defaultStyle.textDirection,
              textLocale = defaultStyle.locale,
            ),
          top = 0.0,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
          layoutEngine = LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER,
          fallbackReason = null,
        ),
      )
    }

    val lines = ArrayList<NativeLineLayout>(result.lineCount)
    var top = 0.0
    var start = 0
    for (lineIndex in 0 until result.lineCount) {
      val end = result.getLineBreakOffset(lineIndex)
      val includeTopPadding = includeFontPadding && lineIndex == 0
      val includeBottomPadding = includeFontPadding && lineIndex == result.lineCount - 1
      val linePadding = resolveLineFontPadding(
        textPaint = textPaint,
        runs = runs,
        start = start,
        end = end,
      )
      var ascent = result.getLineAscent(lineIndex).toDouble() -
        if (includeTopPadding) linePadding.top else 0.0
      var descent = result.getLineDescent(lineIndex).toDouble() +
        if (includeBottomPadding) linePadding.bottom else 0.0
      inlineBoxes.forEach { box ->
        if (box.end > start && box.start < end) {
          ascent = min(ascent, -box.baseline)
          descent = max(descent, box.height - box.baseline)
        }
      }
      val actualHeight = max(0.0, descent - ascent)
      val lineHeight =
        max(
          maxRequestedLineHeight(
            runs,
            defaultLineHeight,
            start,
            end,
            inlineBoxes,
          ),
          actualHeight,
        )
      val lineWidth = result.getLineWidth(lineIndex).toDouble()
      lines += NativeLineLayout(
        textStart = start,
        textEnd = end,
        width = lineWidth,
        left =
          resolveAlignedLineLeft(
            constraintLeft = left,
            constraintWidth = width,
            lineWidth = lineWidth,
            lineText = text.subSequence(start, end),
            textDirection = defaultStyle.textDirection,
            textLocale = defaultStyle.locale,
          ),
        top = top,
        height = lineHeight,
        ascent = ascent,
        descent = descent,
        layoutEngine = LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER,
        fallbackReason = null,
      )
      top += lineHeight
      start = end
    }

    return lines
  }

  private fun layoutHardBreakLineLayouts(
    text: String,
    lineBreaker: Any,
    textPaint: TextPaint,
    defaultStyle: NativeTextStyle,
    runs: List<NativeTextRun>,
    inlineBoxes: List<NativeInlineBox>,
    width: Double,
    left: Double,
    defaultLineHeight: Double,
    includeFontPadding: Boolean,
  ): List<NativeLineLayout> {
    val lines = ArrayList<NativeLineLayout>()
    var cursor = 0
    var top = 0.0

    while (cursor < text.length) {
      if (text[cursor] == '\n') {
        lines += emptyHardBreakLine(cursor, left, width, top, defaultLineHeight, defaultStyle)
        top += defaultLineHeight
        cursor += 1
        if (cursor == text.length) {
          lines += emptyHardBreakLine(cursor, left, width, top, defaultLineHeight, defaultStyle)
        }
        continue
      }

      val nextNewline = text.indexOf('\n', cursor).let { index ->
        if (index == -1) text.length else index
      }
      val paragraphLines = layoutSingleParagraphLineLayouts(
        text = text,
        start = cursor,
        end = nextNewline,
        lineBreaker = lineBreaker,
        defaultStyle = defaultStyle,
        runs = runs,
        inlineBoxes = inlineBoxes,
        width = width,
        left = left,
        top = top,
        defaultLineHeight = defaultLineHeight,
      )
      lines += paragraphLines
      top += paragraphLines.sumOf { it.height }
      cursor = nextNewline
      if (cursor < text.length && text[cursor] == '\n') {
        cursor += 1
        if (cursor == text.length) {
          lines += emptyHardBreakLine(cursor, left, width, top, defaultLineHeight, defaultStyle)
        }
      }
    }

    if (lines.isEmpty()) {
      return listOf(
        NativeLineLayout(
          textStart = 0,
          textEnd = 0,
          width = 0.0,
          left =
            resolveAlignedLineLeft(
              constraintLeft = left,
              constraintWidth = width,
              lineWidth = 0.0,
              lineText = "",
              textDirection = defaultStyle.textDirection,
              textLocale = defaultStyle.locale,
            ),
          top = 0.0,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
          layoutEngine = LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER,
          fallbackReason = null,
        ),
      )
    }

    if (includeFontPadding && lines.isNotEmpty()) {
      applyLineFontPadding(lines, textPaint, runs)
    }

    return lines
  }

  private fun emptyHardBreakLine(
    offset: Int,
    left: Double,
    width: Double,
    top: Double,
    defaultLineHeight: Double,
    defaultStyle: NativeTextStyle,
  ): NativeLineLayout {
    return NativeLineLayout(
      textStart = offset,
      textEnd = offset,
      width = 0.0,
      left =
        resolveAlignedLineLeft(
          constraintLeft = left,
          constraintWidth = width,
          lineWidth = 0.0,
          lineText = "",
          textDirection = defaultStyle.textDirection,
          textLocale = defaultStyle.locale,
        ),
      top = top,
      height = defaultLineHeight,
      ascent = 0.0,
      descent = defaultLineHeight,
      layoutEngine = LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER,
      fallbackReason = null,
    )
  }

  private fun layoutSingleParagraphLineLayouts(
    text: String,
    start: Int,
    end: Int,
    lineBreaker: Any,
    defaultStyle: NativeTextStyle,
    runs: List<NativeTextRun>,
    inlineBoxes: List<NativeInlineBox>,
    width: Double,
    left: Double,
    top: Double,
    defaultLineHeight: Double,
  ): List<NativeLineLayout> {
    if (end <= start) {
      return emptyList()
    }

    val segmentText = text.substring(start, end)
    val segmentRuns = offsetRuns(runs, start, end)
    val segmentBoxes = offsetInlineBoxes(inlineBoxes, start, end)
    val measuredParagraph =
      buildMeasuredText(segmentText, segmentRuns, segmentBoxes, defaultStyle) as MeasuredText
    val breaker = lineBreaker as LineBreaker
    val constraints = LineBreaker.ParagraphConstraints().apply {
      setWidth(max(1f, width.toFloat()))
    }
    val result = breaker.computeLineBreaks(measuredParagraph, constraints, 0)
    if (result.lineCount == 0) {
      return listOf(
        NativeLineLayout(
          textStart = start,
          textEnd = start,
          width = 0.0,
          left =
            resolveAlignedLineLeft(
              constraintLeft = left,
              constraintWidth = width,
              lineWidth = 0.0,
              lineText = "",
              textDirection = defaultStyle.textDirection,
              textLocale = defaultStyle.locale,
            ),
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
          layoutEngine = LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER,
          fallbackReason = null,
        ),
      )
    }

    val lines = ArrayList<NativeLineLayout>(result.lineCount)
    var relativeStart = 0
    var currentTop = top
    for (lineIndex in 0 until result.lineCount) {
      val relativeEnd = result.getLineBreakOffset(lineIndex)
      val absoluteStart = start + relativeStart
      val absoluteEnd = start + relativeEnd
      var ascent = result.getLineAscent(lineIndex).toDouble()
      var descent = result.getLineDescent(lineIndex).toDouble()
      inlineBoxes.forEach { box ->
        if (box.end > absoluteStart && box.start < absoluteEnd) {
          ascent = min(ascent, -box.baseline)
          descent = max(descent, box.height - box.baseline)
        }
      }
      val actualHeight = max(0.0, descent - ascent)
      val lineHeight =
        max(
          maxRequestedLineHeight(
            runs,
            defaultLineHeight,
            absoluteStart,
            absoluteEnd,
            inlineBoxes,
          ),
          actualHeight,
        )
      val lineWidth = result.getLineWidth(lineIndex).toDouble()
      lines += NativeLineLayout(
        textStart = absoluteStart,
        textEnd = absoluteEnd,
        width = lineWidth,
        left =
          resolveAlignedLineLeft(
            constraintLeft = left,
            constraintWidth = width,
            lineWidth = lineWidth,
            lineText = segmentText.subSequence(relativeStart, relativeEnd),
            textDirection = defaultStyle.textDirection,
            textLocale = defaultStyle.locale,
          ),
        top = currentTop,
        height = lineHeight,
        ascent = ascent,
        descent = descent,
        layoutEngine = LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER,
        fallbackReason = null,
      )
      currentTop += lineHeight
      relativeStart = relativeEnd
    }

    return lines
  }

  private fun applyLineFontPadding(
    lines: MutableList<NativeLineLayout>,
    textPaint: TextPaint,
    runs: List<NativeTextRun>,
  ) {
    applyLineFontPaddingAt(
      lines = lines,
      index = 0,
      topPadding = resolveLineFontPadding(
        textPaint = textPaint,
        runs = runs,
        start = lines.first().textStart,
        end = lines.first().textEnd,
      ).top,
      bottomPadding = 0.0,
    )
    applyLineFontPaddingAt(
      lines = lines,
      index = lines.lastIndex,
      topPadding = 0.0,
      bottomPadding = resolveLineFontPadding(
        textPaint = textPaint,
        runs = runs,
        start = lines.last().textStart,
        end = lines.last().textEnd,
      ).bottom,
    )
  }

  private fun applyLineFontPaddingAt(
    lines: MutableList<NativeLineLayout>,
    index: Int,
    topPadding: Double,
    bottomPadding: Double,
  ) {
    if (index !in lines.indices || topPadding == 0.0 && bottomPadding == 0.0) {
      return
    }

    val line = lines[index]
    val ascent = line.ascent - topPadding
    val descent = line.descent + bottomPadding
    val height = max(line.height, max(0.0, descent - ascent))
    val delta = height - line.height
    lines[index] = line.copy(
      height = height,
      ascent = ascent,
      descent = descent,
    )
    if (delta > 0.0) {
      for (lineIndex in index + 1 until lines.size) {
        lines[lineIndex] = lines[lineIndex].copy(top = lines[lineIndex].top + delta)
      }
    }
  }

  private fun offsetRuns(
    runs: List<NativeTextRun>,
    start: Int,
    end: Int,
  ): List<NativeTextRun> {
    return runs.mapNotNull { run ->
      val clippedStart = max(run.start, start)
      val clippedEnd = min(run.end, end)
      if (clippedEnd <= clippedStart) {
        null
      } else {
        NativeTextRun(
          start = clippedStart - start,
          end = clippedEnd - start,
          style = run.style,
        )
      }
    }
  }

  private fun offsetInlineBoxes(
    inlineBoxes: List<NativeInlineBox>,
    start: Int,
    end: Int,
  ): List<NativeInlineBox> {
    return inlineBoxes.mapNotNull { box ->
      val clippedStart = max(box.start, start)
      val clippedEnd = min(box.end, end)
      if (clippedEnd <= clippedStart) {
        null
      } else {
        box.copy(
          start = clippedStart - start,
          end = clippedEnd - start,
        )
      }
    }
  }
}

internal object StaticLayoutLineLayout {
  fun layoutLineLayouts(
    text: CharSequence,
    textPaint: TextPaint,
    runs: List<NativeTextRun>,
    inlineBoxes: List<NativeInlineBox>,
    width: Double,
    left: Double,
    defaultLineHeight: Double,
    includeFontPadding: Boolean,
    textDirection: ParagraphTextDirection,
    textLocale: String,
  ): List<NativeLineLayout> {
    val layout =
      StaticLayout.Builder.obtain(
        text,
        0,
        text.length,
        textPaint,
        max(1, ceil(width).toInt()),
      )
        .setAlignment(Layout.Alignment.ALIGN_NORMAL)
        .setLineSpacing(0f, 1f)
        .setIncludePad(includeFontPadding)
        .setTextDirection(resolveTextDirectionHeuristic(textDirection, textLocale))
        .setBreakStrategy(Layout.BREAK_STRATEGY_HIGH_QUALITY)
        .setHyphenationFrequency(Layout.HYPHENATION_FREQUENCY_NONE)
        .apply {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            setUseLineSpacingFromFallbacks(true)
          }
        }
        .build()

    if (layout.lineCount == 0) {
      return listOf(
        NativeLineLayout(
          textStart = 0,
          textEnd = 0,
          width = 0.0,
          left = left,
          top = 0.0,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
          layoutEngine = LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT,
          fallbackReason = FALLBACK_REASON_STATIC_LAYOUT_COMPAT,
        ),
      )
    }

    val lines = ArrayList<NativeLineLayout>(layout.lineCount)
    var top = 0.0

    for (lineIndex in 0 until layout.lineCount) {
      val start = layout.getLineStart(lineIndex)
      var end = layout.getLineEnd(lineIndex)
      while (end > start && text[end - 1] == '\n') {
        end -= 1
      }
      val lineTop = layout.getLineTop(lineIndex).toDouble()
      val lineBottom = layout.getLineBottom(lineIndex).toDouble()
      val baseline = layout.getLineBaseline(lineIndex).toDouble()
      var ascent = lineTop - baseline
      var descent = lineBottom - baseline
      inlineBoxes.forEach { box ->
        if (box.end > start && box.start < end) {
          ascent = min(ascent, -box.baseline)
          descent = max(descent, box.height - box.baseline)
        }
      }
      val actualHeight = max(0.0, descent - ascent)
      val lineHeight =
        max(
          maxRequestedLineHeight(
            runs,
            defaultLineHeight,
            start,
            end,
            inlineBoxes,
          ),
          actualHeight,
        )
      lines += NativeLineLayout(
        textStart = start,
        textEnd = end,
        width = layout.getLineWidth(lineIndex).toDouble(),
        left = left + layout.getLineLeft(lineIndex).toDouble(),
        top = top,
        height = lineHeight,
        ascent = ascent,
        descent = descent,
        layoutEngine = LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT,
        fallbackReason = FALLBACK_REASON_STATIC_LAYOUT_COMPAT,
      )
      top += lineHeight
    }

    return lines
  }
}

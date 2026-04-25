package com.margelo.nitro.pretext

import kotlin.math.max
import kotlin.math.min

internal fun normalizeLayoutRequest(request: ParagraphLayoutRequest): NativeLayoutRequest {
  val shapeSlices = request.shapeSlices
    .map { slice ->
      NativeShapeSlice(
        top = finiteOrDefault(slice.top, 0.0),
        height = max(0.0, finiteOrDefault(slice.height, 0.0)),
        left = finiteOrDefault(slice.left, 0.0),
        width = max(1.0, finiteOrDefault(slice.width, 1.0)),
      )
    }
    .sortedBy { it.top }

  return NativeLayoutRequest(
    width = AndroidTextUnits.toPx(max(1.0, finiteOrDefault(request.width, 1.0))),
    left = AndroidTextUnits.toPx(finiteOrDefault(request.left, 0.0)),
    whiteSpace = request.whiteSpace.lowercase(),
    wordBreak = request.wordBreak.lowercase(),
    shapeSlices = shapeSlices.map { slice ->
      NativeShapeSlice(
        top = AndroidTextUnits.toPx(slice.top),
        height = AndroidTextUnits.toPx(slice.height),
        left = AndroidTextUnits.toPx(slice.left),
        width = AndroidTextUnits.toPx(slice.width),
      )
    },
  )
}

private fun finiteOrDefault(value: Double, fallback: Double): Double {
  return if (value.isFinite()) value else fallback
}

internal fun sumHeights(lineLayouts: List<NativeLineLayout>): Double {
  return lineLayouts.lastOrNull()?.let { it.top + it.height } ?: 0.0
}

internal fun layoutLineLayouts(
  prepared: NativePreparedParagraph,
  corpus: NativePreparedCorpus,
  request: NativeLayoutRequest,
): List<NativeLineLayout> {
  val canUseStaticLayout =
    request.shapeSlices.isEmpty() &&
      request.whiteSpace == WHITE_SPACE_NORMAL &&
      request.wordBreak == WORD_BREAK_NORMAL &&
      !prepared.forceTokenLayout

  if (canUseStaticLayout) {
    return StaticLayoutLineLayout.layoutLineLayouts(
      text = prepared.styledText,
      textPaint = corpus.textPaint,
      inlineBoxes = prepared.inlineBoxes,
      width = request.width,
      left = request.left,
      defaultLineHeight = corpus.lineHeight,
      includeFontPadding = corpus.includeFontPadding,
    )
  }

  return when (request.whiteSpace) {
    WHITE_SPACE_PRE ->
      layoutPreformattedLineLayouts(
        prepared.breakUnits,
        corpus.lineHeight,
        request,
        corpus.baseStyle.textDirection,
        corpus.baseStyle.locale,
      )
    else -> {
      val useBreakUnits = request.wordBreak == WORD_BREAK_BREAK_ALL
      val units = if (useBreakUnits) prepared.breakUnits else prepared.tokens
      layoutWrappedLineLayouts(
        units = units,
        defaultLineHeight = corpus.lineHeight,
        request = request,
        allowBreakAfterEveryUnit = useBreakUnits,
        textDirection = corpus.baseStyle.textDirection,
        textLocale = corpus.baseStyle.locale,
      )
    }
  }
}

private fun layoutPreformattedLineLayouts(
  units: List<NativePreparedToken>,
  defaultLineHeight: Double,
  request: NativeLayoutRequest,
  textDirection: ParagraphTextDirection,
  textLocale: String,
): List<NativeLineLayout> {
  if (units.isEmpty()) {
    val constraint = resolveLineConstraint(request, 0.0)
    return listOf(
      NativeLineLayout(
        textStart = 0,
        textEnd = 0,
        width = 0.0,
        left =
          resolveAlignedLineLeft(
            constraintLeft = constraint.left,
            constraintWidth = constraint.width,
            lineWidth = 0.0,
            lineText = "",
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = 0.0,
        height = defaultLineHeight,
        ascent = 0.0,
        descent = defaultLineHeight,
      ),
    )
  }

  val lines = ArrayList<NativeLineLayout>()
  var start = 0
  var top = 0.0

  while (start < units.size) {
    val constraint = resolveLineConstraint(request, top)
    var end = start
    while (end < units.size && units[end].text != NEWLINE_TOKEN) {
      end += 1
    }

    if (start == end) {
      val position = units[start].start
      val metrics = fallbackLineMetrics(units, start, end, defaultLineHeight)
      lines += NativeLineLayout(
        textStart = position,
        textEnd = position,
        width = 0.0,
        left =
          resolveAlignedLineLeft(
            constraintLeft = constraint.left,
            constraintWidth = constraint.width,
            lineWidth = 0.0,
            lineText = "",
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = top,
        height = metrics.lineHeight,
        ascent = metrics.ascent,
        descent = metrics.descent,
      )
    } else {
      val metrics = fallbackLineMetrics(units, start, end, defaultLineHeight)
      val lineWidth = sumWidths(units, start, end)
      lines += NativeLineLayout(
        textStart = units[start].start,
        textEnd = units[end - 1].end,
        width = lineWidth,
        left =
          resolveAlignedLineLeft(
            constraintLeft = constraint.left,
            constraintWidth = constraint.width,
            lineWidth = lineWidth,
            lineText = lineTextFromTokens(units, start, end),
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = top,
        height = metrics.lineHeight,
        ascent = metrics.ascent,
        descent = metrics.descent,
      )
    }

    top += lines.last().height
    if (end == units.size - 1 && units[end].text == NEWLINE_TOKEN) {
      val newline = units[end]
      val newlineHeight = max(defaultLineHeight, newline.lineHeight)
      val trailingConstraint = resolveLineConstraint(request, top)
      lines += NativeLineLayout(
        textStart = newline.end,
        textEnd = newline.end,
        width = 0.0,
        left =
          resolveAlignedLineLeft(
            constraintLeft = trailingConstraint.left,
            constraintWidth = trailingConstraint.width,
            lineWidth = 0.0,
            lineText = "",
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = top,
        height = newlineHeight,
        ascent = 0.0,
        descent = newlineHeight,
      )
      break
    }
    if (end >= units.size) {
      break
    }
    start = end + 1
  }

  return lines
}

private fun layoutWrappedLineLayouts(
  units: List<NativePreparedToken>,
  defaultLineHeight: Double,
  request: NativeLayoutRequest,
  allowBreakAfterEveryUnit: Boolean,
  textDirection: ParagraphTextDirection,
  textLocale: String,
): List<NativeLineLayout> {
  val lines = ArrayList<NativeLineLayout>()
  var cursor = 0
  var top = 0.0

  while (cursor < units.size) {
    if (units[cursor].text == NEWLINE_TOKEN) {
      val newline = units[cursor]
      val constraint = resolveLineConstraint(request, top)
      lines += NativeLineLayout(
        textStart = newline.start,
        textEnd = newline.start,
        width = 0.0,
        left =
          resolveAlignedLineLeft(
            constraintLeft = constraint.left,
            constraintWidth = constraint.width,
            lineWidth = 0.0,
            lineText = "",
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = top,
        height = max(defaultLineHeight, newline.lineHeight),
        ascent = newline.ascent,
        descent = max(newline.descent, max(defaultLineHeight, newline.lineHeight) - newline.ascent),
      )
      top += max(defaultLineHeight, newline.lineHeight)
      cursor += 1
      if (cursor == units.size) {
        val trailingHeight = max(defaultLineHeight, newline.lineHeight)
        val trailingConstraint = resolveLineConstraint(request, top)
        lines += NativeLineLayout(
          textStart = newline.end,
          textEnd = newline.end,
          width = 0.0,
          left =
            resolveAlignedLineLeft(
              constraintLeft = trailingConstraint.left,
              constraintWidth = trailingConstraint.width,
              lineWidth = 0.0,
              lineText = "",
              textDirection = textDirection,
              textLocale = textLocale,
            ),
          top = top,
          height = trailingHeight,
          ascent = 0.0,
          descent = trailingHeight,
        )
        top += trailingHeight
      }
      continue
    }

    while (cursor < units.size && isNonNewlineWhitespace(units[cursor].text)) {
      cursor += 1
    }

    if (cursor >= units.size) {
      break
    }

    val constraint = resolveLineConstraint(request, top)
    var end = cursor
    var currentWidth = 0.0
    var lastBreakAfter = -1
    var hitForcedBreak = false

    while (end < units.size) {
      val token = units[end]

      if (token.text == NEWLINE_TOKEN) {
        hitForcedBreak = true
        break
      }

      if (currentWidth + token.width <= constraint.width || end == cursor) {
        currentWidth += token.width
        end += 1
        if (allowBreakAfterEveryUnit || isNonNewlineWhitespace(token.text)) {
          lastBreakAfter = end
        }
        continue
      }

      if (lastBreakAfter > cursor) {
        end = lastBreakAfter
      }
      break
    }

    val trimmedEnd = trimTrailingWhitespaceEnd(units, cursor, end)
    if (trimmedEnd == cursor) {
      val fallback = units[cursor]
      val hasVisibleText = fallback.text.trim().isNotEmpty()
      val fallbackLineHeight =
        if (fallback.lineHeight > 0.0) {
          max(defaultLineHeight, max(fallback.lineHeight, fallback.descent - fallback.ascent))
        } else {
          defaultLineHeight
        }
      lines += NativeLineLayout(
        textStart = fallback.start,
        textEnd = if (hasVisibleText) fallback.end else fallback.start,
        width = fallback.width,
        left =
          resolveAlignedLineLeft(
            constraintLeft = constraint.left,
            constraintWidth = constraint.width,
            lineWidth = fallback.width,
            lineText = fallback.text,
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = top,
        height = fallbackLineHeight,
        ascent = fallback.ascent,
        descent = max(fallback.descent, fallbackLineHeight + fallback.ascent),
      )
      top += fallbackLineHeight
      cursor += 1
    } else {
      val metrics = fallbackLineMetrics(units, cursor, trimmedEnd, defaultLineHeight)
      val lineWidth = sumWidths(units, cursor, trimmedEnd)
      lines += NativeLineLayout(
        textStart = units[cursor].start,
        textEnd = units[trimmedEnd - 1].end,
        width = lineWidth,
        left =
          resolveAlignedLineLeft(
            constraintLeft = constraint.left,
            constraintWidth = constraint.width,
            lineWidth = lineWidth,
            lineText = lineTextFromTokens(units, cursor, trimmedEnd),
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = top,
        height = metrics.lineHeight,
        ascent = metrics.ascent,
        descent = metrics.descent,
      )
      top += metrics.lineHeight
      cursor = end
    }

    if (hitForcedBreak && cursor < units.size && units[cursor].text == NEWLINE_TOKEN) {
      val newline = units[cursor]
      cursor += 1
      if (cursor == units.size) {
        val trailingHeight = max(defaultLineHeight, newline.lineHeight)
        val trailingConstraint = resolveLineConstraint(request, top)
        lines += NativeLineLayout(
          textStart = newline.end,
          textEnd = newline.end,
          width = 0.0,
          left =
            resolveAlignedLineLeft(
              constraintLeft = trailingConstraint.left,
              constraintWidth = trailingConstraint.width,
              lineWidth = 0.0,
              lineText = "",
              textDirection = textDirection,
              textLocale = textLocale,
            ),
          top = top,
          height = trailingHeight,
          ascent = 0.0,
          descent = trailingHeight,
        )
        top += trailingHeight
      }
    }
  }

  if (lines.isEmpty()) {
    val constraint = resolveLineConstraint(request, 0.0)
    return listOf(
      NativeLineLayout(
        textStart = 0,
        textEnd = 0,
        width = 0.0,
        left =
          resolveAlignedLineLeft(
            constraintLeft = constraint.left,
            constraintWidth = constraint.width,
            lineWidth = 0.0,
            lineText = "",
            textDirection = textDirection,
            textLocale = textLocale,
          ),
        top = 0.0,
        height = defaultLineHeight,
        ascent = 0.0,
        descent = defaultLineHeight,
      ),
    )
  }

  return lines
}

private fun resolveLineConstraint(
  request: NativeLayoutRequest,
  top: Double,
): NativeLineConstraint {
  val slice = request.shapeSlices.firstOrNull { top >= it.top && top < it.top + it.height }
  return if (slice == null) {
    NativeLineConstraint(
      left = request.left,
      width = request.width,
    )
  } else {
    NativeLineConstraint(
      left = slice.left,
      width = slice.width,
    )
  }
}

private fun trimTrailingWhitespaceEnd(
  tokens: List<NativePreparedToken>,
  start: Int,
  end: Int,
): Int {
  var trimmedEnd = end

  while (trimmedEnd > start && isNonNewlineWhitespace(tokens[trimmedEnd - 1].text)) {
    trimmedEnd -= 1
  }

  return trimmedEnd
}

private fun sumWidths(tokens: List<NativePreparedToken>, start: Int, end: Int): Double {
  if (end <= start) {
    return 0.0
  }

  var sum = 0.0
  for (index in start until end) {
    sum += tokens[index].width
  }

  return sum
}

private fun lineTextFromTokens(tokens: List<NativePreparedToken>, start: Int, end: Int): String {
  if (end <= start) {
    return ""
  }

  return buildString {
    for (index in start until end) {
      append(tokens[index].text)
    }
  }
}

internal fun maxRequestedLineHeight(
  runs: List<NativeTextRun>,
  defaultLineHeight: Double,
  start: Int,
  end: Int,
  inlineBoxes: List<NativeInlineBox> = emptyList(),
): Double {
  var maxHeight = defaultLineHeight
  runs.forEach { run ->
    if (run.end > start && run.start < end) {
      val requested =
        if (run.style.lineHeight > 0.0) {
          AndroidTextUnits.toPx(run.style.lineHeight)
        } else {
          defaultLineHeight
        }
      maxHeight = max(maxHeight, requested)
    }
  }
  inlineBoxes.forEach { box ->
    if (box.end > start && box.start < end) {
      maxHeight = max(maxHeight, box.height)
    }
  }
  return maxHeight
}

private fun fallbackLineMetrics(
  tokens: List<NativePreparedToken>,
  start: Int,
  end: Int,
  defaultLineHeight: Double,
): NativeTokenMetrics {
  if (end <= start) {
    return NativeTokenMetrics(
      width = 0.0,
      lineHeight = defaultLineHeight,
      ascent = 0.0,
      descent = defaultLineHeight,
    )
  }

  var maxLineHeight = defaultLineHeight
  var minAscent = 0.0
  var maxDescent = 0.0
  for (index in start until end) {
    val token = tokens[index]
    maxLineHeight = max(maxLineHeight, token.lineHeight)
    minAscent = min(minAscent, token.ascent)
    maxDescent = max(maxDescent, token.descent)
  }

  maxLineHeight = max(maxLineHeight, maxDescent - minAscent)
  return NativeTokenMetrics(
    width = sumWidths(tokens, start, end),
    lineHeight = maxLineHeight,
    ascent = minAscent,
    descent = maxDescent,
  )
}

private fun isNonNewlineWhitespace(token: String): Boolean {
  return token.isNotEmpty() &&
    token != NEWLINE_TOKEN &&
    token.all { it.isWhitespace() && it != '\n' }
}

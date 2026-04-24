package com.margelo.nitro.pretext

import kotlin.math.max

internal fun prepareInlineParagraphSeed(
  paragraph: Array<InlineSegment>,
  baseStyle: NativeTextStyle,
): NativePreparedParagraphSeed {
  val textBuilder = StringBuilder()
  val tokens = ArrayList<NativeTokenDescriptor>()
  val breakUnits = ArrayList<NativeTokenDescriptor>()
  val runs = ArrayList<NativeTextRun>()
  val atomicSpans = ArrayList<NativeAtomicSpan>()
  val inlineBoxes = ArrayList<NativeInlineBox>()
  var forceTokenLayout = false

  paragraph.forEach { segment ->
    val start = textBuilder.length
    val breakBehavior = segment.breakBehavior.lowercase()
    if (segment.kind?.lowercase() == INLINE_SEGMENT_KIND_BOX || segment.boxId != null) {
      val box = buildInlineBox(segment, start)
      textBuilder.append(OBJECT_REPLACEMENT_CHARACTER)
      runs +=
        NativeTextRun(
          start = box.start,
          end = box.end,
          style = baseStyle,
        )
      inlineBoxes += box
      atomicSpans +=
        NativeAtomicSpan(
          start = box.start,
          end = box.end,
          source = "inline_box",
        )
      tokens += NativeTokenDescriptor(
        text = OBJECT_REPLACEMENT_CHARACTER,
        start = box.start,
        end = box.end,
        style = baseStyle,
        inlineBox = box,
      )
      breakUnits += NativeTokenDescriptor(
        text = OBJECT_REPLACEMENT_CHARACTER,
        start = box.start,
        end = box.end,
        style = baseStyle,
        inlineBox = box,
      )
      return@forEach
    }

    val resolvedStyle = resolveTextStyle(segment, baseStyle)
    textBuilder.append(segment.text)
    val end = textBuilder.length
    if (end > start) {
      runs +=
        NativeTextRun(
          start = start,
          end = end,
          style = resolvedStyle,
        )
      if (breakBehavior == BREAK_BEHAVIOR_NEVER) {
        atomicSpans +=
          NativeAtomicSpan(
            start = start,
            end = end,
            source = "inline_break_never",
          )
      }
    }
    forceTokenLayout =
      forceTokenLayout || breakBehavior == BREAK_BEHAVIOR_NEVER
    appendInlineSegmentTokens(
      segment = segment,
      resolvedStyle = resolvedStyle,
      baseOffset = start,
      tokens = tokens,
      breakUnits = breakUnits,
    )
  }

  return NativePreparedParagraphSeed(
    text = textBuilder.toString(),
    tokens = tokens,
    breakUnits = breakUnits,
    runs = mergeAdjacentRuns(runs),
    atomicSpans = atomicSpans,
    inlineBoxes = inlineBoxes,
    textUnits = textBuilder.length,
    forceTokenLayout = forceTokenLayout,
  )
}

private fun buildInlineBox(segment: InlineSegment, start: Int): NativeInlineBox {
  val width = AndroidTextUnits.toPx(max(0.0, segment.width ?: 0.0))
  val height = AndroidTextUnits.toPx(max(0.0, segment.height ?: 0.0))
  val baseline = AndroidTextUnits.toPx(segment.baseline ?: AndroidTextUnits.fromPx(height))
    .coerceIn(0.0, height)
  return NativeInlineBox(
    boxId = segment.boxId ?: "inline-box-$start",
    start = start,
    end = start + OBJECT_REPLACEMENT_CHARACTER.length,
    width = width,
    height = height,
    baseline = baseline,
    breakBehavior = segment.breakBehavior.lowercase(),
    accessibilityLabel = segment.accessibilityLabel,
    accessibilityHint = segment.accessibilityHint,
    accessibilityRole = segment.accessibilityRole,
  )
}

internal fun prepareMeasuredToken(
  token: NativeTokenDescriptor,
  cache: MutableMap<String, NativeTokenMetrics>,
): NativePreparedToken {
  token.inlineBox?.let { box ->
    return NativePreparedToken(
      text = token.text,
      start = token.start,
      end = token.end,
      width = box.width,
      lineHeight = box.height,
      ascent = -box.baseline,
      descent = box.height - box.baseline,
    )
  }

  if (token.text == NEWLINE_TOKEN) {
    return NativePreparedToken(
      text = token.text,
      start = token.start,
      end = token.end,
      width = 0.0,
      lineHeight = 0.0,
      ascent = 0.0,
      descent = 0.0,
    )
  }

  val cacheKey = measurementCacheKey(token.text, token.style)
  val metrics = cache.getOrPut(cacheKey) { measureToken(token.text, token.style) }
  return NativePreparedToken(
    text = token.text,
    start = token.start,
    end = token.end,
    width = metrics.width,
    lineHeight = metrics.lineHeight,
    ascent = metrics.ascent,
    descent = metrics.descent,
  )
}

private fun measurementCacheKey(text: String, style: NativeTextStyle): String {
  return listOf(
    text,
    style.fontFamily,
    style.fontSize.toString(),
    style.lineHeight.toString(),
    style.letterSpacing.toString(),
    style.locale,
    style.fontWeight,
    style.fontStyle,
    style.includeFontPadding.toString(),
    style.textDirection.name,
  ).joinToString(separator = "\u001F")
}

private fun mergeAdjacentRuns(runs: List<NativeTextRun>): List<NativeTextRun> {
  if (runs.isEmpty()) {
    return emptyList()
  }

  val merged = ArrayList<NativeTextRun>(runs.size)
  merged += runs.first()
  for (index in 1 until runs.size) {
    val run = runs[index]
    val previous = merged.last()
    if (previous.style == run.style && previous.end == run.start) {
      merged[merged.lastIndex] =
        NativeTextRun(
          start = previous.start,
          end = run.end,
          style = run.style,
        )
    } else {
      merged += run
    }
  }
  return merged
}

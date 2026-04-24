package com.margelo.nitro.pretext

import java.text.BreakIterator

internal fun tokenize(text: String, style: NativeTextStyle): List<NativeTokenDescriptor> {
  val tokens = ArrayList<NativeTokenDescriptor>()
  val current = StringBuilder()
  var currentStart = -1
  var currentEnd = -1
  var mode: TokenMode? = null
  var cursor = 0

  fun flushCurrent() {
    if (current.isEmpty() || currentStart < 0 || currentEnd < 0) {
      return
    }

    tokens += NativeTokenDescriptor(
      text = current.toString(),
      start = currentStart,
      end = currentEnd,
      style = style,
    )
    current.setLength(0)
    currentStart = -1
    currentEnd = -1
  }

  while (cursor < text.length) {
    val codePoint = text.codePointAt(cursor)
    val charCount = Character.charCount(codePoint)
    val nextCursor = cursor + charCount
    val segment = text.substring(cursor, nextCursor)

    if (codePoint == '\n'.code) {
      flushCurrent()
      mode = null
      tokens += NativeTokenDescriptor(
        text = NEWLINE_TOKEN,
        start = cursor,
        end = nextCursor,
        style = style,
      )
      cursor = nextCursor
      continue
    }

    val nextMode = if (Character.isWhitespace(codePoint)) TokenMode.WHITESPACE else TokenMode.TEXT
    if (mode == nextMode) {
      current.append(segment)
      currentEnd = nextCursor
    } else {
      flushCurrent()
      mode = nextMode
      currentStart = cursor
      currentEnd = nextCursor
      current.append(segment)
    }

    cursor = nextCursor
  }

  flushCurrent()
  return tokens
}

internal fun tokenizeBreakUnits(text: String, style: NativeTextStyle): List<NativeTokenDescriptor> {
  if (text.isEmpty()) {
    return emptyList()
  }

  return collectGraphemeBoundariesForText(text, style.locale)
    .zipWithNext()
    .mapNotNull { (start, end) ->
      if (end <= start) {
        null
      } else {
        NativeTokenDescriptor(
          text = text.substring(start, end),
          start = start,
          end = end,
          style = style,
        )
      }
    }
}

internal fun appendInlineSegmentTokens(
  segment: InlineSegment,
  resolvedStyle: NativeTextStyle,
  baseOffset: Int,
  tokens: MutableList<NativeTokenDescriptor>,
  breakUnits: MutableList<NativeTokenDescriptor>,
) {
  val breakBehavior = segment.breakBehavior.lowercase()
  if (breakBehavior == BREAK_BEHAVIOR_NEVER) {
    appendNeverBreakTokens(segment.text, baseOffset, resolvedStyle, tokens)
    appendNeverBreakTokens(segment.text, baseOffset, resolvedStyle, breakUnits)
    return
  }

  tokens += tokenize(segment.text, resolvedStyle).map { token ->
    NativeTokenDescriptor(
      text = token.text,
      start = token.start + baseOffset,
      end = token.end + baseOffset,
      style = token.style,
    )
  }
  breakUnits += tokenizeBreakUnits(segment.text, resolvedStyle).map { token ->
    NativeTokenDescriptor(
      text = token.text,
      start = token.start + baseOffset,
      end = token.end + baseOffset,
      style = token.style,
    )
  }
}

internal fun collectGraphemeBoundariesForText(
  text: String,
  locale: String = "",
): List<Int> {
  if (text.isEmpty()) {
    return listOf(0)
  }

  val breaker = BreakIterator.getCharacterInstance(resolveTextLocale(locale))
  breaker.setText(text)
  val rawBoundaries = ArrayList<Int>()
  var boundary = breaker.first()
  while (boundary != BreakIterator.DONE) {
    rawBoundaries += boundary
    boundary = breaker.next()
  }
  return rawBoundaries
    .filter { candidate -> candidate == 0 || candidate == text.length || !isUnsafeGraphemeBoundary(text, candidate) }
    .distinct()
    .sorted()
    .let { boundaries ->
      when {
        boundaries.firstOrNull() != 0 -> listOf(0) + boundaries
        boundaries.lastOrNull() != text.length -> boundaries + text.length
        else -> boundaries
      }
    }
}

private fun appendNeverBreakTokens(
  text: String,
  baseOffset: Int,
  style: NativeTextStyle,
  output: MutableList<NativeTokenDescriptor>,
) {
  var localStart = 0
  while (localStart <= text.length) {
    val newlineIndex = text.indexOf('\n', localStart)
    if (newlineIndex == -1) {
      if (localStart < text.length) {
        output += NativeTokenDescriptor(
          text = text.substring(localStart),
          start = baseOffset + localStart,
          end = baseOffset + text.length,
          style = style,
        )
      }
      break
    }

    if (newlineIndex > localStart) {
      output += NativeTokenDescriptor(
        text = text.substring(localStart, newlineIndex),
        start = baseOffset + localStart,
        end = baseOffset + newlineIndex,
        style = style,
      )
    }
    output += NativeTokenDescriptor(
      text = NEWLINE_TOKEN,
      start = baseOffset + newlineIndex,
      end = baseOffset + newlineIndex + 1,
      style = style,
    )
    localStart = newlineIndex + 1
    if (localStart == text.length) {
      break
    }
  }
}

private fun isUnsafeGraphemeBoundary(text: String, boundary: Int): Boolean {
  if (boundary <= 0 || boundary >= text.length) {
    return false
  }

  if (Character.isHighSurrogate(text[boundary - 1]) || Character.isLowSurrogate(text[boundary])) {
    return true
  }

  val before = text.codePointBefore(boundary)
  val after = text.codePointAt(boundary)
  return before == ZERO_WIDTH_JOINER ||
    after == ZERO_WIDTH_JOINER ||
    isVariationSelector(after) ||
    isEmojiModifier(after) ||
    isUnsafeRegionalIndicatorBoundary(text, boundary) ||
    isIndicVirama(before) ||
    isIndicVirama(after) ||
    isCombiningMark(after)
}

private fun isUnsafeRegionalIndicatorBoundary(text: String, boundary: Int): Boolean {
  if (!isRegionalIndicator(text.codePointBefore(boundary)) || !isRegionalIndicator(text.codePointAt(boundary))) {
    return false
  }

  var regionalIndicatorCount = 0
  var cursor = boundary
  while (cursor > 0) {
    val codePoint = text.codePointBefore(cursor)
    if (!isRegionalIndicator(codePoint)) {
      break
    }
    regionalIndicatorCount += 1
    cursor -= Character.charCount(codePoint)
  }
  return regionalIndicatorCount % 2 == 1
}

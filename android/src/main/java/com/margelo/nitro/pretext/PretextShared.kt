package com.margelo.nitro.pretext

import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.text.LineBreaker
import android.graphics.text.MeasuredText
import android.os.Build
import android.text.TextDirectionHeuristics
import java.text.BreakIterator
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.max

internal object PretextShared {
  private val nextPreparedCorpusId = AtomicLong(1)
  private val preparedCorpora = ConcurrentHashMap<Long, NativePreparedCorpus>()
  private val nextLineCursorId = AtomicLong(1)
  private val lineCursors = ConcurrentHashMap<Long, NativeLineCursor>()

  fun measure(text: String, fontFamily: String, fontSize: Double): Double {
    val paint = createPaint(
      ParagraphStyle(
        fontFamily = fontFamily,
        fontSize = fontSize,
        lineHeight = fontSize,
        letterSpacing = 0.0,
        locale = "",
      ),
    )
    return paint.measureText(text).toDouble()
  }

  fun measureBatch(texts: Array<String>, fontFamily: String, fontSize: Double): DoubleArray {
    val paint = createPaint(
      ParagraphStyle(
        fontFamily = fontFamily,
        fontSize = fontSize,
        lineHeight = fontSize,
        letterSpacing = 0.0,
        locale = "",
      ),
    )
    return DoubleArray(texts.size) { index -> paint.measureText(texts[index]).toDouble() }
  }

  fun prepareParagraphsWithStats(
    texts: Array<String>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    val locale = resolveLocale(style.locale)
    val analyzedParagraphs = texts.map { text ->
      val tokens = tokenize(text)
      val breakUnits = tokenizeBreakUnits(text, locale)
      NativePreparedParagraphSeed(
        text = text,
        tokens = tokens,
        breakUnits = breakUnits,
        textUnits = text.length,
        forceTokenLayout = false,
      )
    }
    return prepareParagraphSeedsWithStats(analyzedParagraphs, style)
  }

  fun prepareInlineParagraphsWithStats(
    paragraphs: Array<Array<InlineSegment>>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    val locale = resolveLocale(style.locale)
    val analyzedParagraphs = paragraphs.map { paragraph ->
      prepareInlineParagraphSeed(paragraph, locale)
    }
    return prepareParagraphSeedsWithStats(analyzedParagraphs, style)
  }

  private fun prepareParagraphSeedsWithStats(
    analyzedParagraphs: List<NativePreparedParagraphSeed>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    val prepareStartedAt = nowMs()
    val paint = createPaint(style)
    val analyzeStartedAt = nowMs()
    val lineHeight = resolveLineHeight(style.lineHeight, paint)
    val analyzeMs = nowMs() - analyzeStartedAt
    val totalTokenCount = analyzedParagraphs.sumOf { it.textUnits }
    val uniqueTokenCount = orderedUniqueTexts(
      analyzedParagraphs.flatMap { paragraph ->
        listOf(paragraph.tokens, paragraph.breakUnits)
      },
    ).size

    val measurementStartedAt = nowMs()
    val uniqueUnits = orderedUniqueTexts(
      analyzedParagraphs.flatMap { paragraph ->
        listOf(paragraph.tokens, paragraph.breakUnits)
      },
    )
    val widthsByText = uniqueUnits.associateWith { token ->
      if (token == NEWLINE_TOKEN) {
        0.0
      } else {
        paint.measureText(token).toDouble()
      }
    }
    val preparedParagraphs = analyzedParagraphs.map { paragraph ->
        NativePreparedParagraph(
          text = paragraph.text,
          measuredText = if (
            !paragraph.forceTokenLayout &&
              Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
          ) {
            Api29LineLayout.buildMeasuredText(paragraph.text, paint)
          } else {
            null
        },
        tokens = paragraph.tokens.map { token ->
          NativePreparedToken(
            text = token.text,
            start = token.start,
            end = token.end,
            width = widthsByText[token.text] ?: 0.0,
          )
        },
        breakUnits = paragraph.breakUnits.map { token ->
          NativePreparedToken(
            text = token.text,
            start = token.start,
            end = token.end,
            width = widthsByText[token.text] ?: 0.0,
          )
        },
        forceTokenLayout = paragraph.forceTokenLayout,
      )
    }
    val measurementMs = nowMs() - measurementStartedAt

    val buildPreparedStartedAt = nowMs()
    val prepared = NativePreparedCorpus(
      paragraphs = preparedParagraphs,
      lineHeight = lineHeight,
      lineBreaker = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        Api29LineLayout.createLineBreaker()
      } else {
        null
      },
    )
    val buildPreparedMs = nowMs() - buildPreparedStartedAt
    val id = nextPreparedCorpusId.getAndIncrement()
    preparedCorpora[id] = prepared
    val preparedState = PreparedParagraphState(
      id = id.toDouble(),
      paragraphCount = prepared.paragraphs.size.toDouble(),
    )

    return PreparedParagraphResult(
      prepared = preparedState,
      stats = PrepareParagraphStats(
        tokenizeMs = analyzeMs,
        measurementMs = measurementMs,
        buildPreparedMs = buildPreparedMs,
        totalMs = nowMs() - prepareStartedAt,
        paragraphCount = prepared.paragraphs.size.toDouble(),
        totalTokenCount = totalTokenCount.toDouble(),
        uniqueTokenCount = uniqueTokenCount.toDouble(),
      ),
    )
  }

  private fun prepareInlineParagraphSeed(
    paragraph: Array<InlineSegment>,
    locale: Locale,
  ): NativePreparedParagraphSeed {
    val textBuilder = StringBuilder()
    val tokens = ArrayList<NativeTokenDescriptor>()
    val breakUnits = ArrayList<NativeTokenDescriptor>()

    paragraph.forEach { segment ->
      appendInlineSegmentTokens(
        segment = segment,
        locale = locale,
        textBuilder = textBuilder,
        tokens = tokens,
        breakUnits = breakUnits,
      )
    }

    return NativePreparedParagraphSeed(
      text = textBuilder.toString(),
      tokens = tokens,
      breakUnits = breakUnits,
      textUnits = textBuilder.length,
      forceTokenLayout = true,
    )
  }

  fun layoutParagraphs(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraph> {
    return layoutParagraphsInternal(preparedId, defaultLayoutRequest(width)).toTypedArray()
  }

  fun layoutParagraphsMetadata(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraphMetrics> {
    return layoutParagraphsMetadataInternal(preparedId, defaultLayoutRequest(width)).toTypedArray()
  }

  fun layoutParagraphLines(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraphLines> {
    return layoutParagraphLinesInternal(preparedId, defaultLayoutRequest(width)).toTypedArray()
  }

  fun layoutParagraphsWithRequest(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraph> {
    return layoutParagraphsInternal(preparedId, normalizeLayoutRequest(request)).toTypedArray()
  }

  fun layoutParagraphsMetadataWithRequest(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraphMetrics> {
    return layoutParagraphsMetadataInternal(preparedId, normalizeLayoutRequest(request)).toTypedArray()
  }

  fun layoutParagraphLinesWithRequest(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraphLines> {
    return layoutParagraphLinesInternal(preparedId, normalizeLayoutRequest(request)).toTypedArray()
  }

  fun createParagraphLineCursor(
    preparedId: Double,
    paragraphIndex: Double,
    request: ParagraphLayoutRequest,
  ): ParagraphLineCursorState {
    val prepared = requirePreparedCorpus(preparedId)
    val normalizedRequest = normalizeLayoutRequest(request)
    val resolvedParagraphIndex = paragraphIndex.toInt()
    val paragraph = prepared.paragraphs.getOrNull(resolvedParagraphIndex)
      ?: error("Paragraph index $resolvedParagraphIndex not found for prepared corpus ${preparedId.toLong()}.")
    val lines = layoutLineLayouts(paragraph, prepared, normalizedRequest)
    val cursorId = nextLineCursorId.getAndIncrement()
    lineCursors[cursorId] = NativeLineCursor(
      lines = lines,
      nextIndex = 0,
    )
    return ParagraphLineCursorState(
      id = cursorId.toDouble(),
      paragraphIndex = resolvedParagraphIndex.toDouble(),
      lineCount = lines.size.toDouble(),
      height = sumHeights(lines),
    )
  }

  fun nextParagraphLine(cursorId: Double): ParagraphLineCursorStep {
    val cursor = lineCursors[cursorId.toLong()] ?: return doneCursorStep()
    if (cursor.nextIndex >= cursor.lines.size) {
      return doneCursorStep()
    }

    val line = cursor.lines[cursor.nextIndex]
    cursor.nextIndex += 1
    return ParagraphLineCursorStep(
      done = false,
      textStart = line.textStart.toDouble(),
      textEnd = line.textEnd.toDouble(),
      top = line.top,
      left = line.left,
      width = line.width,
      height = line.height,
      ascent = line.ascent,
      descent = line.descent,
    )
  }

  fun releaseParagraphLineCursor(cursorId: Double) {
    lineCursors.remove(cursorId.toLong())
  }

  fun resolveParagraphDrawing(
    preparedId: Double,
    paragraphIndex: Int,
    width: Double,
  ): NativeParagraphDrawing? {
    val prepared = preparedCorpora[preparedId.toLong()] ?: return null
    val paragraph = prepared.paragraphs.getOrNull(paragraphIndex) ?: return null
    val lineLayouts = layoutLineLayouts(paragraph, prepared, defaultLayoutRequest(width))
    return NativeParagraphDrawing(
      text = paragraph.text,
      lines = buildNativeParagraphLineRanges(lineLayouts),
    )
  }

  fun releaseParagraphs(preparedId: Double) {
    preparedCorpora.remove(preparedId.toLong())
  }

  private fun layoutParagraphsInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutParagraph> {
    val prepared = requirePreparedCorpus(preparedId)
    return prepared.paragraphs.map { paragraph ->
      val lineLayouts = layoutLineLayouts(paragraph, prepared, request)
      LaidOutParagraph(
        brokenText = materializeBrokenText(paragraph.text, lineLayouts),
        lineCount = lineLayouts.size.toDouble(),
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
      )
    }
  }

  private fun layoutParagraphsMetadataInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutParagraphMetrics> {
    val prepared = requirePreparedCorpus(preparedId)
    return prepared.paragraphs.map { paragraph ->
      val lineLayouts = layoutLineLayouts(paragraph, prepared, request)
      LaidOutParagraphMetrics(
        lineCount = lineLayouts.size.toDouble(),
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
      )
    }
  }

  private fun layoutParagraphLinesInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutParagraphLines> {
    val prepared = requirePreparedCorpus(preparedId)
    return prepared.paragraphs.map { paragraph ->
      val lineLayouts = layoutLineLayouts(paragraph, prepared, request)
      LaidOutParagraphLines(
        lineCount = lineLayouts.size.toDouble(),
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
        lines = buildPublicParagraphLineRanges(lineLayouts).toTypedArray(),
      )
    }
  }

  private fun requirePreparedCorpus(preparedId: Double): NativePreparedCorpus {
    val handle = preparedId.toLong()
    return preparedCorpora[handle]
      ?: error("Prepared benchmark corpus $handle not found.")
  }

  private fun buildPublicParagraphLineRanges(
    lineLayouts: List<NativeLineLayout>,
  ): List<ParagraphLineRange> {
    return lineLayouts.map { line ->
      ParagraphLineRange(
        textStart = line.textStart.toDouble(),
        textEnd = line.textEnd.toDouble(),
        top = line.top,
        left = line.left,
        width = line.width,
        height = line.height,
        ascent = line.ascent,
        descent = line.descent,
      )
    }
  }

  private fun buildNativeParagraphLineRanges(
    lineLayouts: List<NativeLineLayout>,
  ): List<NativePreparedLineRange> {
    return lineLayouts.map { line ->
      NativePreparedLineRange(
        textStart = line.textStart,
        textEnd = line.textEnd,
        top = line.top,
        left = line.left,
        width = line.width,
        height = line.height,
        ascent = line.ascent,
        descent = line.descent,
      )
    }
  }

  private fun defaultLayoutRequest(width: Double): NativeLayoutRequest {
    return NativeLayoutRequest(
      width = max(1.0, width),
      left = 0.0,
      whiteSpace = WHITE_SPACE_NORMAL,
      wordBreak = WORD_BREAK_NORMAL,
      shapeSlices = emptyList(),
    )
  }

  private fun normalizeLayoutRequest(request: ParagraphLayoutRequest): NativeLayoutRequest {
    val shapeSlices = request.shapeSlices
      .map { slice ->
        NativeShapeSlice(
          top = slice.top,
          height = max(0.0, slice.height),
          left = slice.left,
          width = max(1.0, slice.width),
        )
      }
      .sortedBy { it.top }

    return NativeLayoutRequest(
      width = max(1.0, request.width),
      left = request.left,
      whiteSpace = request.whiteSpace.lowercase(),
      wordBreak = request.wordBreak.lowercase(),
      shapeSlices = shapeSlices,
    )
  }

  private fun doneCursorStep(): ParagraphLineCursorStep {
    return ParagraphLineCursorStep(
      done = true,
      textStart = 0.0,
      textEnd = 0.0,
      top = 0.0,
      left = 0.0,
      width = 0.0,
      height = 0.0,
      ascent = 0.0,
      descent = 0.0,
    )
  }

  private fun sumHeights(lineLayouts: List<NativeLineLayout>): Double {
    return lineLayouts.lastOrNull()?.let { it.top + it.height } ?: 0.0
  }

  private fun createPaint(style: ParagraphStyle): Paint {
    return Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textSize = style.fontSize.toFloat()
      typeface = resolveTypeface(style.fontFamily)
      if (style.fontSize > 0 && style.letterSpacing != 0.0) {
        letterSpacing = (style.letterSpacing / style.fontSize).toFloat()
      }
      textLocale = resolveLocale(style.locale)
    }
  }

  private fun nowMs(): Double {
    return System.nanoTime() / 1_000_000.0
  }

  private fun resolveLineHeight(lineHeight: Double, paint: Paint): Double {
    return if (lineHeight > 0) lineHeight else paint.fontSpacing.toDouble()
  }

  private fun resolveTypeface(fontFamily: String): Typeface {
    return when (fontFamily.lowercase()) {
      "system", "default", "" -> Typeface.DEFAULT
      "serif" -> Typeface.SERIF
      "monospace" -> Typeface.MONOSPACE
      else ->
        try {
          Typeface.create(fontFamily, Typeface.NORMAL)
        } catch (_: Exception) {
          Typeface.DEFAULT
        }
    }
  }

  private fun resolveLocale(localeTag: String): Locale {
    if (localeTag.isBlank()) {
      return Locale.getDefault()
    }

    val locale = Locale.forLanguageTag(localeTag)
    return if (locale.toLanguageTag().isBlank() || locale.toLanguageTag() == "und") {
      Locale.getDefault()
    } else {
      locale
    }
  }

  private fun orderedUniqueTexts(paragraphs: List<List<NativeTokenDescriptor>>): List<String> {
    val uniqueTokens = ArrayList<String>()
    val seen = HashSet<String>()

    paragraphs.forEach { paragraph ->
      paragraph.forEach { token ->
        if (seen.add(token.text)) {
          uniqueTokens += token.text
        }
      }
    }

    return uniqueTokens
  }

  private fun tokenize(text: String): List<NativeTokenDescriptor> {
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

  private fun tokenizeBreakUnits(text: String, locale: Locale): List<NativeTokenDescriptor> {
    if (text.isEmpty()) {
      return emptyList()
    }

    val breaker = BreakIterator.getCharacterInstance(locale)
    breaker.setText(text)
    val units = ArrayList<NativeTokenDescriptor>()
    var start = breaker.first()
    var end = breaker.next()

    while (end != BreakIterator.DONE) {
      units += NativeTokenDescriptor(
        text = text.substring(start, end),
        start = start,
        end = end,
      )
      start = end
      end = breaker.next()
    }

    return units
  }

  private fun appendInlineSegmentTokens(
    segment: InlineSegment,
    locale: Locale,
    textBuilder: StringBuilder,
    tokens: MutableList<NativeTokenDescriptor>,
    breakUnits: MutableList<NativeTokenDescriptor>,
  ) {
    val baseOffset = textBuilder.length
    textBuilder.append(segment.text)
    val breakBehavior = segment.breakBehavior.lowercase()
    if (breakBehavior == BREAK_BEHAVIOR_NEVER) {
      appendNeverBreakTokens(segment.text, baseOffset, tokens)
      appendNeverBreakTokens(segment.text, baseOffset, breakUnits)
      return
    }

    tokens += tokenize(segment.text).map { token ->
      NativeTokenDescriptor(
        text = token.text,
        start = token.start + baseOffset,
        end = token.end + baseOffset,
      )
    }
    breakUnits += tokenizeBreakUnits(segment.text, locale).map { token ->
      NativeTokenDescriptor(
        text = token.text,
        start = token.start + baseOffset,
        end = token.end + baseOffset,
      )
    }
  }

  private fun appendNeverBreakTokens(
    text: String,
    baseOffset: Int,
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
          )
        }
        break
      }

      if (newlineIndex > localStart) {
        output += NativeTokenDescriptor(
          text = text.substring(localStart, newlineIndex),
          start = baseOffset + localStart,
          end = baseOffset + newlineIndex,
        )
      }
      output += NativeTokenDescriptor(
        text = NEWLINE_TOKEN,
        start = baseOffset + newlineIndex,
        end = baseOffset + newlineIndex + 1,
      )
      localStart = newlineIndex + 1
      if (localStart == text.length) {
        break
      }
    }
  }

  private fun layoutLineLayouts(
    prepared: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    request: NativeLayoutRequest,
  ): List<NativeLineLayout> {
    val lineBreaker = corpus.lineBreaker
    val measuredText = prepared.measuredText
    val canUsePlatformLineBreaker =
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        lineBreaker != null &&
        measuredText != null &&
        !prepared.forceTokenLayout &&
        request.shapeSlices.isEmpty() &&
        request.whiteSpace == WHITE_SPACE_NORMAL &&
        request.wordBreak == WORD_BREAK_NORMAL

    if (canUsePlatformLineBreaker) {
      return Api29LineLayout.layoutLineLayouts(
        text = prepared.text,
        measuredText = measuredText,
        lineBreaker = lineBreaker,
        width = request.width,
        left = request.left,
        defaultLineHeight = corpus.lineHeight,
      )
    }

    return when (request.whiteSpace) {
      WHITE_SPACE_PRE -> layoutPreformattedLineLayouts(prepared.breakUnits, corpus.lineHeight, request)
      else -> {
        val useBreakUnits = request.wordBreak == WORD_BREAK_BREAK_ALL
        val units = if (useBreakUnits) prepared.breakUnits else prepared.tokens
        layoutWrappedLineLayouts(
          units = units,
          defaultLineHeight = corpus.lineHeight,
          request = request,
          allowBreakAfterEveryUnit = useBreakUnits,
        )
      }
    }
  }

  private fun layoutPreformattedLineLayouts(
    units: List<NativePreparedToken>,
    defaultLineHeight: Double,
    request: NativeLayoutRequest,
  ): List<NativeLineLayout> {
    if (units.isEmpty()) {
      val constraint = resolveLineConstraint(request, 0.0)
      return listOf(
        NativeLineLayout(
          textStart = 0,
          textEnd = 0,
          width = 0.0,
          left = constraint.left,
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
        lines += NativeLineLayout(
          textStart = position,
          textEnd = position,
          width = 0.0,
          left = constraint.left,
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
      } else {
        lines += NativeLineLayout(
          textStart = units[start].start,
          textEnd = units[end - 1].end,
          width = sumWidths(units, start, end),
          left = constraint.left,
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
      }

      top += defaultLineHeight
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
          left = constraint.left,
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
        top += defaultLineHeight
        cursor += 1
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

        if (allowBreakAfterEveryUnit || isNonNewlineWhitespace(token.text)) {
          lastBreakAfter = end + 1
        }

        if (currentWidth + token.width <= constraint.width || end == cursor) {
          currentWidth += token.width
          end += 1
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
        lines += NativeLineLayout(
          textStart = fallback.start,
          textEnd = if (hasVisibleText) fallback.end else fallback.start,
          width = fallback.width,
          left = constraint.left,
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
        top += defaultLineHeight
        cursor += 1
      } else {
        lines += NativeLineLayout(
          textStart = units[cursor].start,
          textEnd = units[trimmedEnd - 1].end,
          width = sumWidths(units, cursor, trimmedEnd),
          left = constraint.left,
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
        top += defaultLineHeight
        cursor = end
      }

      if (hitForcedBreak && cursor < units.size && units[cursor].text == NEWLINE_TOKEN) {
        cursor += 1
      }
    }

    if (lines.isEmpty()) {
      val constraint = resolveLineConstraint(request, 0.0)
      return listOf(
        NativeLineLayout(
          textStart = 0,
          textEnd = 0,
          width = 0.0,
          left = constraint.left,
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

  private fun materializeBrokenText(text: String, lineLayouts: List<NativeLineLayout>): String {
    return lineLayouts.joinToString(NEWLINE_TOKEN) { line ->
      if (line.textEnd <= line.textStart) {
        ""
      } else {
        text.substring(line.textStart, line.textEnd)
      }
    }
  }

  private fun isNonNewlineWhitespace(token: String): Boolean {
    return token.isNotEmpty() &&
      token != NEWLINE_TOKEN &&
      token.all { it.isWhitespace() && it != '\n' }
  }
}

@androidx.annotation.RequiresApi(Build.VERSION_CODES.Q)
private object Api29LineLayout {
  fun createLineBreaker(): Any {
    return LineBreaker.Builder()
      .setBreakStrategy(LineBreaker.BREAK_STRATEGY_HIGH_QUALITY)
      .setHyphenationFrequency(LineBreaker.HYPHENATION_FREQUENCY_NONE)
      .build()
  }

  fun buildMeasuredText(text: String, paint: Paint): Any {
    val isRtl = TextDirectionHeuristics.FIRSTSTRONG_LTR.isRtl(text, 0, text.length)
    val builder = MeasuredText.Builder(text.toCharArray())
      .setComputeLayout(false)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      builder.setComputeHyphenation(MeasuredText.Builder.HYPHENATION_MODE_NONE)
    } else {
      @Suppress("DEPRECATION")
      builder.setComputeHyphenation(false)
    }

    return builder
      .appendStyleRun(paint, text.length, isRtl)
      .build()
  }

  fun layoutLineLayouts(
    text: String,
    measuredText: Any,
    lineBreaker: Any,
    width: Double,
    left: Double,
    defaultLineHeight: Double,
  ): List<NativeLineLayout> {
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
          left = left,
          top = 0.0,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        ),
      )
    }

    val lines = ArrayList<NativeLineLayout>(result.lineCount)
    var top = 0.0
    var start = 0
    for (lineIndex in 0 until result.lineCount) {
      val end = result.getLineBreakOffset(lineIndex)
      val ascent = result.getLineAscent(lineIndex).toDouble()
      val descent = result.getLineDescent(lineIndex).toDouble()
      val actualHeight = max(0.0, descent - ascent)
      val lineHeight = max(defaultLineHeight, actualHeight)
      lines += NativeLineLayout(
        textStart = start,
        textEnd = end,
        width = measuredParagraph.getWidth(start, end).toDouble(),
        left = left,
        top = top,
        height = lineHeight,
        ascent = ascent,
        descent = descent,
      )
      top += lineHeight
      start = end
    }

    return lines
  }
}

internal data class NativePreparedParagraphSeed(
  val text: String,
  val tokens: List<NativeTokenDescriptor>,
  val breakUnits: List<NativeTokenDescriptor>,
  val textUnits: Int,
  val forceTokenLayout: Boolean,
)

internal data class NativeTokenDescriptor(
  val text: String,
  val start: Int,
  val end: Int,
)

internal data class NativePreparedToken(
  val text: String,
  val start: Int,
  val end: Int,
  val width: Double,
)

internal data class NativePreparedParagraph(
  val text: String,
  val measuredText: Any?,
  val tokens: List<NativePreparedToken>,
  val breakUnits: List<NativePreparedToken>,
  val forceTokenLayout: Boolean,
)

internal data class NativePreparedCorpus(
  val paragraphs: List<NativePreparedParagraph>,
  val lineHeight: Double,
  val lineBreaker: Any?,
)

internal data class NativeLineLayout(
  val textStart: Int,
  val textEnd: Int,
  val width: Double,
  val left: Double,
  val top: Double,
  val height: Double,
  val ascent: Double,
  val descent: Double,
)

internal data class NativePreparedLineRange(
  val textStart: Int,
  val textEnd: Int,
  val top: Double,
  val left: Double,
  val width: Double,
  val height: Double,
  val ascent: Double,
  val descent: Double,
)

internal data class NativeParagraphDrawing(
  val text: String,
  val lines: List<NativePreparedLineRange>,
)

internal data class NativeLineCursor(
  val lines: List<NativeLineLayout>,
  var nextIndex: Int,
)

internal data class NativeLayoutRequest(
  val width: Double,
  val left: Double,
  val whiteSpace: String,
  val wordBreak: String,
  val shapeSlices: List<NativeShapeSlice>,
)

internal data class NativeShapeSlice(
  val top: Double,
  val height: Double,
  val left: Double,
  val width: Double,
)

internal data class NativeLineConstraint(
  val left: Double,
  val width: Double,
)

internal enum class TokenMode {
  WHITESPACE,
  TEXT,
}

internal const val NEWLINE_TOKEN = "\n"
internal const val WHITE_SPACE_NORMAL = "normal"
internal const val WHITE_SPACE_PRE = "pre"
internal const val WORD_BREAK_NORMAL = "normal"
internal const val WORD_BREAK_BREAK_ALL = "break-all"
internal const val BREAK_BEHAVIOR_NEVER = "never"

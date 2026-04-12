package com.margelo.nitro.pretext

import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.text.LineBreaker
import android.graphics.text.MeasuredText
import android.os.Build
import android.text.TextDirectionHeuristics
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.max

internal object PretextShared {
  private val nextPreparedCorpusId = AtomicLong(1)
  private val preparedCorpora = ConcurrentHashMap<Long, NativePreparedCorpus>()

  fun measure(text: String, fontFamily: String, fontSize: Double): Double {
    val paint = createPaint(
      ParagraphStyle(
        fontFamily = fontFamily,
        fontSize = fontSize,
        lineHeight = fontSize,
        letterSpacing = 0.0,
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
      ),
    )
    return DoubleArray(texts.size) { index -> paint.measureText(texts[index]).toDouble() }
  }

  fun prepareParagraphsWithStats(
    texts: Array<String>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    val prepareStartedAt = nowMs()
    val paint = createPaint(style)
    val analyzeStartedAt = nowMs()
    val lineHeight = resolveLineHeight(style.lineHeight, paint)
    val analyzedParagraphs = texts.map { text ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        NativePreparedParagraphSeed(
          text = text,
          tokens = emptyList(),
          textUnits = text.length,
          uniqueUnits = 1,
        )
      } else {
        val tokens = tokenize(text)
        NativePreparedParagraphSeed(
          text = text,
          tokens = tokens,
          textUnits = tokens.size,
          uniqueUnits = orderedUniqueTokens(listOf(tokens)).size,
        )
      }
    }
    val analyzeMs = nowMs() - analyzeStartedAt
    val totalTokenCount = analyzedParagraphs.sumOf { it.textUnits }
    val uniqueTokenCount = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      texts.size
    } else {
      orderedUniqueTokens(analyzedParagraphs.map { it.tokens }).size
    }

    val measurementStartedAt = nowMs()
    val preparedParagraphs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      analyzedParagraphs.map { paragraph ->
        NativePreparedParagraph(
          text = paragraph.text,
          measuredText = Api29LineLayout.buildMeasuredText(paragraph.text, paint),
          tokens = emptyList(),
        )
      }
    } else {
      val allTokens = analyzedParagraphs.map { it.tokens }
      val uniqueTokens = orderedUniqueTokens(allTokens)
      val widthsByToken = uniqueTokens.associateWith { token ->
        paint.measureText(token).toDouble()
      }
      analyzedParagraphs.map { paragraph ->
        NativePreparedParagraph(
          text = paragraph.text,
          measuredText = null,
          tokens = paragraph.tokens.map { token ->
            NativePreparedToken(
              text = token.text,
              start = token.start,
              end = token.end,
              width = if (token.text == NEWLINE_TOKEN) 0.0 else widthsByToken[token.text] ?: 0.0,
            )
          },
        )
      }
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

  fun layoutParagraphs(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraph> {
    val prepared = requirePreparedCorpus(preparedId)

    return prepared.paragraphs.map { paragraph ->
      val lineLayouts = layoutLineLayouts(paragraph, prepared, width)
      LaidOutParagraph(
        brokenText = materializeBrokenText(paragraph.text, lineLayouts),
        lineCount = lineLayouts.size.toDouble(),
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
      )
    }.toTypedArray()
  }

  fun layoutParagraphsMetadata(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraphMetrics> {
    val prepared = requirePreparedCorpus(preparedId)

    return prepared.paragraphs.map { paragraph ->
      val lineLayouts = layoutLineLayouts(paragraph, prepared, width)
      LaidOutParagraphMetrics(
        lineCount = lineLayouts.size.toDouble(),
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
      )
    }.toTypedArray()
  }

  fun layoutParagraphLines(
    preparedId: Double,
    width: Double,
  ): Array<LaidOutParagraphLines> {
    val prepared = requirePreparedCorpus(preparedId)

    return prepared.paragraphs.map { paragraph ->
      val lineLayouts = layoutLineLayouts(paragraph, prepared, width)
      LaidOutParagraphLines(
        lineCount = lineLayouts.size.toDouble(),
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
        lines = buildPublicParagraphLineRanges(lineLayouts).toTypedArray(),
      )
    }.toTypedArray()
  }

  fun resolveParagraphDrawing(
    preparedId: Double,
    paragraphIndex: Int,
    width: Double,
  ): NativeParagraphDrawing? {
    val prepared = preparedCorpora[preparedId.toLong()] ?: return null
    val paragraph = prepared.paragraphs.getOrNull(paragraphIndex) ?: return null
    val lineLayouts = layoutLineLayouts(paragraph, prepared, width)
    return NativeParagraphDrawing(
      text = paragraph.text,
      lines = buildNativeParagraphLineRanges(lineLayouts),
    )
  }

  fun releaseParagraphs(preparedId: Double) {
    preparedCorpora.remove(preparedId.toLong())
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
        left = 0.0,
        width = line.width,
        height = line.height,
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
        left = 0.0,
        width = line.width,
        height = line.height,
        ascent = line.ascent,
        descent = line.descent,
      )
    }
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

  private fun orderedUniqueTokens(paragraphs: List<List<NativeTokenDescriptor>>): List<String> {
    val uniqueTokens = ArrayList<String>()
    val seen = HashSet<String>()

    paragraphs.forEach { paragraph ->
      paragraph.forEach { token ->
        if (token.text != NEWLINE_TOKEN && seen.add(token.text)) {
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

  private fun layoutLineLayouts(
    prepared: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    width: Double,
  ): List<NativeLineLayout> {
    val lineBreaker = corpus.lineBreaker
    val measuredText = prepared.measuredText
    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        lineBreaker != null &&
        measuredText != null
    ) {
      return Api29LineLayout.layoutLineLayouts(
        text = prepared.text,
        measuredText = measuredText,
        lineBreaker = lineBreaker,
        width = width,
        defaultLineHeight = corpus.lineHeight,
      )
    }

    return layoutLineLayoutsFallback(prepared, corpus.lineHeight, width)
  }

  private fun layoutLineLayoutsFallback(
    prepared: NativePreparedParagraph,
    defaultLineHeight: Double,
    width: Double,
  ): List<NativeLineLayout> {
    val tokens = prepared.tokens
    val lines = ArrayList<NativeLineLayout>()
    var cursor = 0
    var top = 0.0

    while (cursor < tokens.size) {
      if (tokens[cursor].text == NEWLINE_TOKEN) {
        val newline = tokens[cursor]
        lines += NativeLineLayout(
          textStart = newline.start,
          textEnd = newline.start,
          width = 0.0,
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
        top += defaultLineHeight
        cursor += 1
        continue
      }

      while (cursor < tokens.size && isNonNewlineWhitespace(tokens[cursor].text)) {
        cursor += 1
      }

      if (cursor >= tokens.size) {
        break
      }

      var end = cursor
      var currentWidth = 0.0
      var lastBreakAfter = -1
      var hitForcedBreak = false

      while (end < tokens.size) {
        val token = tokens[end]

        if (token.text == NEWLINE_TOKEN) {
          hitForcedBreak = true
          break
        }

        if (isNonNewlineWhitespace(token.text)) {
          lastBreakAfter = end + 1
        }

        if (currentWidth + token.width <= width || end == cursor) {
          currentWidth += token.width
          end += 1
          continue
        }

        if (lastBreakAfter > cursor) {
          end = lastBreakAfter
        }
        break
      }

      val trimmedEnd = trimTrailingWhitespaceEnd(tokens, cursor, end)
      if (trimmedEnd == cursor) {
        val fallback = tokens[cursor]
        val hasVisibleText = fallback.text.trim().isNotEmpty()
        lines += NativeLineLayout(
          textStart = fallback.start,
          textEnd = if (hasVisibleText) fallback.end else fallback.start,
          width = fallback.width,
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
        top += defaultLineHeight
        cursor += 1
      } else {
        lines += NativeLineLayout(
          textStart = tokens[cursor].start,
          textEnd = tokens[trimmedEnd - 1].end,
          width = sumWidths(tokens, cursor, trimmedEnd),
          top = top,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        )
        top += defaultLineHeight
        cursor = end
      }

      if (hitForcedBreak && cursor < tokens.size && tokens[cursor].text == NEWLINE_TOKEN) {
        cursor += 1
      }
    }

    if (lines.isEmpty()) {
      return listOf(
        NativeLineLayout(
          textStart = 0,
          textEnd = 0,
          width = 0.0,
          top = 0.0,
          height = defaultLineHeight,
          ascent = 0.0,
          descent = defaultLineHeight,
        ),
      )
    }

    return lines
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
  val textUnits: Int,
  val uniqueUnits: Int,
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

internal enum class TokenMode {
  WHITESPACE,
  TEXT,
}

internal const val NEWLINE_TOKEN = "\n"

package com.margelo.nitro.pretext

import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.text.MeasuredText
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

internal object PretextShared {
  private val nextPreparedCorpusId = AtomicLong(1)
  private val preparedCorpora = ConcurrentHashMap<Long, NativePreparedCorpus>()

  fun prepareParagraphsWithStats(
    texts: Array<String>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    val baseStyle = defaultTextStyle(style)
    val analyzedParagraphs = texts.map { text ->
      val textUnits = text.length
      NativePreparedParagraphSeed(
        text = text,
        tokens = tokenize(text, baseStyle),
        breakUnits = tokenizeBreakUnits(text, baseStyle),
        runs =
          if (textUnits > 0) {
            listOf(
              NativeTextRun(
                start = 0,
                end = textUnits,
                style = baseStyle,
              ),
            )
          } else {
            emptyList()
          },
        atomicSpans = emptyList(),
        inlineBoxes = emptyList(),
        textUnits = textUnits,
        forceTokenLayout = false,
      )
    }
    return prepareParagraphSeedsWithStats(analyzedParagraphs, style)
  }

  fun prepareInlineParagraphsWithStats(
    paragraphs: Array<Array<InlineSegment>>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    val baseStyle = defaultTextStyle(style)
    val analyzedParagraphs = paragraphs.map { paragraph ->
      prepareInlineParagraphSeed(paragraph, baseStyle)
    }
    return prepareParagraphSeedsWithStats(analyzedParagraphs, style)
  }

  private fun prepareParagraphSeedsWithStats(
    analyzedParagraphs: List<NativePreparedParagraphSeed>,
    style: ParagraphStyle,
  ): PreparedParagraphResult {
    val prepareStartedAt = nowMs()
    val baseStyle = defaultTextStyle(style)
    val basePaint = createTextPaint(baseStyle)
    val analyzeStartedAt = nowMs()
    val lineHeight = resolveLineHeightValue(baseStyle.lineHeight, basePaint)
    val analyzeMs = nowMs() - analyzeStartedAt
    val totalTokenCount = analyzedParagraphs.sumOf { it.textUnits }

    val measurementStartedAt = nowMs()
    val measurementCache = LinkedHashMap<String, NativeTokenMetrics>()
    val preparedParagraphs =
      analyzedParagraphs.map { paragraph ->
        val styledText = buildStyledText(paragraph.text, paragraph.runs, paragraph.inlineBoxes)
        NativePreparedParagraph(
          text = paragraph.text,
          styledText = styledText,
          measuredText =
            if (!paragraph.forceTokenLayout && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              buildMeasuredText(paragraph.text, paragraph.runs, paragraph.inlineBoxes, baseStyle)
            } else {
              null
            },
          tokens =
            paragraph.tokens.map { token ->
              prepareMeasuredToken(token, measurementCache)
            },
          breakUnits =
            paragraph.breakUnits.map { token ->
              prepareMeasuredToken(token, measurementCache)
            },
          runs = paragraph.runs,
          atomicSpans = paragraph.atomicSpans,
          inlineBoxes = paragraph.inlineBoxes,
          forceTokenLayout = paragraph.forceTokenLayout,
        )
      }
    val measurementMs = nowMs() - measurementStartedAt

    val buildPreparedStartedAt = nowMs()
    val prepared =
      NativePreparedCorpus(
        paragraphs = preparedParagraphs,
        baseStyle = baseStyle,
        lineHeight = lineHeight,
        textPaint = basePaint,
        includeFontPadding = baseStyle.includeFontPadding,
        textDirection = baseStyle.textDirection,
        lineBreaker =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Api29LineLayout.createLineBreaker()
          } else {
            null
          },
      )
    val buildPreparedMs = nowMs() - buildPreparedStartedAt
    val id = nextPreparedCorpusId.getAndIncrement()
    preparedCorpora[id] = prepared
    val preparedState =
      PreparedParagraphState(
        id = id.toDouble(),
        paragraphCount = prepared.paragraphs.size.toDouble(),
      )

    return PreparedParagraphResult(
      prepared = preparedState,
      stats =
        PrepareParagraphStats(
          tokenizeMs = analyzeMs,
          measurementMs = measurementMs,
          buildPreparedMs = buildPreparedMs,
          totalMs = nowMs() - prepareStartedAt,
          paragraphCount = prepared.paragraphs.size.toDouble(),
          totalTokenCount = totalTokenCount.toDouble(),
          uniqueTokenCount = measurementCache.size.toDouble(),
        ),
    )
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

  fun layoutParagraphLinesWithDiagnostics(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutParagraphLinesWithDiagnostics> {
    return layoutParagraphLinesWithDiagnosticsInternal(
      preparedId,
      normalizeLayoutRequest(request),
    ).toTypedArray()
  }

  fun layoutRichParagraphLines(
    preparedId: Double,
    request: ParagraphLayoutRequest,
  ): Array<LaidOutRichParagraphLines> {
    return layoutRichParagraphLinesInternal(
      preparedId,
      normalizeLayoutRequest(request),
    ).toTypedArray()
  }

  fun releaseParagraphs(preparedId: Double) {
    preparedCorpora.remove(preparedId.toLong())
  }

  private fun layoutParagraphsMetadataInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutParagraphMetrics> {
    val prepared = requirePreparedCorpus(preparedId)
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, _ ->
      val lineLayouts = paragraphLineLayouts[index]
      LaidOutParagraphMetrics(
        lineCount = lineLayouts.size.toDouble(),
        height = AndroidTextUnits.fromPx(sumHeights(lineLayouts)),
        maxLineWidth = AndroidTextUnits.fromPx(lineLayouts.maxOfOrNull { it.width } ?: 0.0),
      )
    }
  }

  private fun layoutParagraphLinesInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutParagraphLines> {
    val prepared = requirePreparedCorpus(preparedId)
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, _ ->
      val lineLayouts = paragraphLineLayouts[index]
      LaidOutParagraphLines(
        lineCount = lineLayouts.size.toDouble(),
        height = AndroidTextUnits.fromPx(sumHeights(lineLayouts)),
        maxLineWidth = AndroidTextUnits.fromPx(lineLayouts.maxOfOrNull { it.width } ?: 0.0),
        lines = buildPublicParagraphLineRanges(lineLayouts).toTypedArray(),
      )
    }
  }

  private fun layoutParagraphLinesWithDiagnosticsInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutParagraphLinesWithDiagnostics> {
    val prepared = requirePreparedCorpus(preparedId)
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, paragraph ->
      val lineLayouts = paragraphLineLayouts[index]
      LaidOutParagraphLinesWithDiagnostics(
        lineCount = lineLayouts.size.toDouble(),
        height = AndroidTextUnits.fromPx(sumHeights(lineLayouts)),
        maxLineWidth = AndroidTextUnits.fromPx(lineLayouts.maxOfOrNull { it.width } ?: 0.0),
        lines = buildPublicParagraphLineRanges(lineLayouts).toTypedArray(),
        diagnostics = buildParagraphLayoutDiagnostics(
          paragraph = paragraph,
          corpus = prepared,
          request = request,
          lineLayouts = lineLayouts,
        ),
      )
    }
  }

  private fun layoutRichParagraphLinesInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutRichParagraphLines> {
    val prepared = requirePreparedCorpus(preparedId)
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, paragraph ->
      val lineLayouts = paragraphLineLayouts[index]
      LaidOutRichParagraphLines(
        lineCount = lineLayouts.size.toDouble(),
        height = AndroidTextUnits.fromPx(sumHeights(lineLayouts)),
        maxLineWidth = AndroidTextUnits.fromPx(lineLayouts.maxOfOrNull { it.width } ?: 0.0),
        lines = buildPublicParagraphLineRanges(lineLayouts).toTypedArray(),
        boxFrames = buildInlineBoxFrames(
          paragraphIndex = index,
          paragraph = paragraph,
          corpus = prepared,
          lineLayouts = lineLayouts,
        ).toTypedArray(),
        diagnostics = buildParagraphLayoutDiagnostics(
          paragraph = paragraph,
          corpus = prepared,
          request = request,
          lineLayouts = lineLayouts,
        ),
      )
    }
  }

  private fun requirePreparedCorpus(preparedId: Double): NativePreparedCorpus {
    val handle = preparedId.toLong()
    return preparedCorpora[handle]
      ?: error("Prepared benchmark corpus $handle not found.")
  }

  private fun resolveParagraphLineLayouts(
    prepared: NativePreparedCorpus,
    request: NativeLayoutRequest,
  ): List<List<NativeLineLayout>> {
    return prepared.resolveLineLayouts(request) {
      prepared.paragraphs.map { paragraph ->
        layoutLineLayouts(paragraph, prepared, request)
      }
    }
  }

  private fun buildPublicParagraphLineRanges(
    lineLayouts: List<NativeLineLayout>,
  ): List<ParagraphLineRange> {
    return lineLayouts.map { line ->
      ParagraphLineRange(
        textStart = line.textStart.toDouble(),
        textEnd = line.textEnd.toDouble(),
        top = AndroidTextUnits.fromPx(line.top),
        left = AndroidTextUnits.fromPx(line.left),
        width = AndroidTextUnits.fromPx(line.width),
        height = AndroidTextUnits.fromPx(line.height),
        ascent = AndroidTextUnits.fromPx(line.ascent),
        descent = AndroidTextUnits.fromPx(line.descent),
      )
    }
  }

  private fun buildInlineBoxFrames(
    paragraphIndex: Int,
    paragraph: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    lineLayouts: List<NativeLineLayout>,
  ): List<InlineBoxFrame> {
    if (paragraph.inlineBoxes.isEmpty()) {
      return emptyList()
    }

    val frames = ArrayList<InlineBoxFrame>()
    paragraph.inlineBoxes.forEach { box ->
      val lineIndex = lineLayouts.indexOfFirst { line ->
        box.start >= line.textStart && box.end <= line.textEnd
      }
      if (lineIndex < 0) {
        return@forEach
      }

      val line = lineLayouts[lineIndex]
      val actualHeight = max(0.0, line.descent - line.ascent)
      val centerOffset = max(0.0, (line.height - actualHeight) / 2.0)
      val baseline = line.top + centerOffset - line.ascent
      val left = resolveInlineBoxLeft(
        paragraph = paragraph,
        corpus = corpus,
        line = line,
        box = box,
      )
      frames += InlineBoxFrame(
        boxId = box.boxId,
        paragraphIndex = paragraphIndex.toDouble(),
        lineIndex = lineIndex.toDouble(),
        textStart = box.start.toDouble(),
        textEnd = box.end.toDouble(),
        left = AndroidTextUnits.fromPx(left),
        top = AndroidTextUnits.fromPx(baseline - box.baseline),
        width = AndroidTextUnits.fromPx(box.width),
        height = AndroidTextUnits.fromPx(box.height),
        baseline = AndroidTextUnits.fromPx(baseline),
        accessibilityLabel = box.accessibilityLabel,
        accessibilityHint = box.accessibilityHint,
        accessibilityRole = box.accessibilityRole,
      )
    }
    return frames
  }

  private fun resolveInlineBoxLeft(
    paragraph: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    line: NativeLineLayout,
    box: NativeInlineBox,
  ): Double {
    resolveInlineBoxVisualLeftWithStaticLayout(
      paragraph = paragraph,
      corpus = corpus,
      line = line,
      box = box,
    )?.let { visualLeft ->
      return line.left + visualLeft
    }

    val lineLength = max(0, line.textEnd - line.textStart)
    val isRtlLine = lineLength > 0 &&
      resolveTextDirectionHeuristic(corpus.textDirection, corpus.baseStyle.locale)
        .isRtl(paragraph.text, line.textStart, lineLength)

    if (isRtlLine) {
      val endAdvance = measureParagraphAdvance(paragraph, line.textStart, box.end)
      return line.left + max(0.0, line.width - endAdvance)
    }

    return line.left + measureParagraphAdvance(paragraph, line.textStart, box.start)
  }

  private fun resolveInlineBoxVisualLeftWithStaticLayout(
    paragraph: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    line: NativeLineLayout,
    box: NativeInlineBox,
  ): Double? {
    val lineLength = line.textEnd - line.textStart
    if (lineLength <= 0) {
      return null
    }

    val lineText = paragraph.styledText.subSequence(line.textStart, line.textEnd)
    val layout = StaticLayout.Builder.obtain(
      lineText,
      0,
      lineText.length,
      corpus.textPaint,
      max(1, ceil(max(line.width, box.width)).toInt()),
    )
      .setAlignment(Layout.Alignment.ALIGN_NORMAL)
      .setLineSpacing(0f, 1f)
      .setIncludePad(corpus.includeFontPadding)
      .setTextDirection(resolveTextDirectionHeuristic(corpus.textDirection, corpus.baseStyle.locale))
      .setBreakStrategy(Layout.BREAK_STRATEGY_HIGH_QUALITY)
      .setHyphenationFrequency(Layout.HYPHENATION_FREQUENCY_NONE)
      .build()

    if (layout.lineCount == 0) {
      return null
    }

    val relativeStart = box.start - line.textStart
    val relativeEnd = box.end - line.textStart
    val startX = layout.getPrimaryHorizontal(relativeStart).toDouble()
    val endX = layout.getPrimaryHorizontal(relativeEnd).toDouble()
    if (!startX.isFinite() || !endX.isFinite()) {
      return null
    }

    return min(startX, endX)
  }

  private fun measureParagraphAdvance(
    paragraph: NativePreparedParagraph,
    start: Int,
    end: Int,
  ): Double {
    if (end <= start) {
      return 0.0
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val measuredParagraph = paragraph.measuredText as? MeasuredText
      if (measuredParagraph != null) {
        return measuredParagraph.getWidth(start, end).toDouble()
      }
    }

    val sortedBoxes = paragraph.inlineBoxes.sortedBy { it.start }
    val sortedRuns = paragraph.runs.sortedBy { it.start }
    var cursor = start
    var width = 0.0

    while (cursor < end) {
      val box = sortedBoxes.firstOrNull { it.start == cursor }
      if (box != null) {
        width += box.width
        cursor = min(end, box.end)
        continue
      }

      val nextBoxStart = sortedBoxes
        .firstOrNull { it.start > cursor }
        ?.start
        ?: end
      val run = sortedRuns.firstOrNull { it.start <= cursor && it.end > cursor }
      val segmentEnd = minOf(end, nextBoxStart, run?.end ?: end)
      if (segmentEnd <= cursor) {
        break
      }
      val paint = run?.style?.let { createTextPaint(it) } ?: TextPaint(Paint.ANTI_ALIAS_FLAG)
      width += paint.measureText(paragraph.text, cursor, segmentEnd).toDouble()
      cursor = segmentEnd
    }

    return width
  }

  private fun nowMs(): Double {
    return System.nanoTime() / 1_000_000.0
  }


}

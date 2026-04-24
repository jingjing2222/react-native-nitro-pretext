package com.margelo.nitro.pretext

import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.text.LineBreaker
import android.graphics.text.MeasuredText
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import java.text.BreakIterator
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

  private fun prepareInlineParagraphSeed(
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

  private fun buildParagraphLayoutDiagnostics(
    paragraph: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    request: NativeLayoutRequest,
    lineLayouts: List<NativeLineLayout>,
  ): ParagraphLayoutDiagnostics {
    val canonicalLayoutEngine = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER
    } else {
      LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK
    }
    val layoutEngine = lineLayouts.firstOrNull()?.layoutEngine ?: canonicalLayoutEngine
    val fallbackReason = lineLayouts.firstNotNullOfOrNull { it.fallbackReason }
    val breakTable = buildParagraphBreakTable(paragraph, lineLayouts)
    val boundaryMap = buildParagraphBoundaryMap(paragraph, lineLayouts, breakTable)
    val complexShapeCounters = buildComplexShapeCounters(paragraph, boundaryMap)
    return ParagraphLayoutDiagnostics(
      normalizedRequest = buildPublicLayoutRequest(request),
      ruleLayer = RULE_LAYER_PRETEXT_NATIVE,
      canvasPixelParityTarget = false,
      textDirection = corpus.textDirection,
      layoutEngine = layoutEngine,
      heightMetricSource = HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS,
      fallbackReason = fallbackReason,
      driftKinds = collectDriftKinds(
        paragraph = paragraph,
        corpus = corpus,
        request = request,
        lineLayouts = lineLayouts,
        boundaryMap = boundaryMap,
      ).toTypedArray(),
      heightMetricDrivers = HEIGHT_METRIC_DRIVERS,
      breakTable = breakTable,
      boundaryMap = boundaryMap,
      complexShapeCounters = complexShapeCounters,
      lineDiagnostics = lineLayouts.map { line ->
        ParagraphLineDiagnostics(
          textStart = line.textStart.toDouble(),
          textEnd = line.textEnd.toDouble(),
          textDirection = corpus.textDirection,
          layoutEngine = line.layoutEngine,
          heightMetricSource = HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS,
          fallbackReason = line.fallbackReason,
          driftKinds = collectLineDriftKinds(line, canonicalLayoutEngine).toTypedArray(),
          clusterViolationOffsets = collectLineClusterViolationOffsets(
            line,
            boundaryMap,
            paragraph.atomicSpans,
          ).map { it.toDouble() }.toDoubleArray(),
        )
      }.toTypedArray(),
    )
  }

  private fun buildPublicLayoutRequest(request: NativeLayoutRequest): ParagraphLayoutRequest {
    return ParagraphLayoutRequest(
      width = AndroidTextUnits.fromPx(request.width),
      left = AndroidTextUnits.fromPx(request.left),
      whiteSpace = request.whiteSpace,
      wordBreak = request.wordBreak,
      shapeSlices = request.shapeSlices.map { slice ->
        ParagraphShapeSlice(
          top = AndroidTextUnits.fromPx(slice.top),
          height = AndroidTextUnits.fromPx(slice.height),
          left = AndroidTextUnits.fromPx(slice.left),
          width = AndroidTextUnits.fromPx(slice.width),
        )
      }.toTypedArray(),
    )
  }

  private fun buildParagraphBreakTable(
    paragraph: NativePreparedParagraph,
    lineLayouts: List<NativeLineLayout>,
  ): ParagraphBreakTable {
    val hardBreaks = collectHardBreaks(paragraph.text)
    val hardBreakOffsets = hardBreaks.map { it.offset.toInt() }.toSet()
    val nativeSoftBreaks = lineLayouts
      .dropLast(1)
      .mapNotNull { line ->
        val offset = line.textEnd
        val nextCharIsHardBreak = paragraph.text.getOrNull(offset) == '\n'
        if (
          offset <= 0 ||
          offset >= paragraph.text.length ||
          hardBreakOffsets.contains(offset) ||
          nextCharIsHardBreak
        ) {
          null
        } else {
          ParagraphBreakOpportunity(
            offset = offset.toDouble(),
            kind = BREAK_KIND_NATIVE_SOFT,
            source = line.layoutEngine,
          )
        }
      }
    return ParagraphBreakTable(
      hardBreaks = hardBreaks.toTypedArray(),
      nativeSoftBreaks = nativeSoftBreaks.toTypedArray(),
      graphemeBoundaries = collectGraphemeBoundaries(paragraph).map { it.toDouble() }.toDoubleArray(),
      atomicSpans = paragraph.atomicSpans.map { span ->
        ParagraphAtomicSpan(
          textStart = span.start.toDouble(),
          textEnd = span.end.toDouble(),
          source = span.source,
        )
      }.toTypedArray(),
    )
  }

  private fun buildParagraphBoundaryMap(
    paragraph: NativePreparedParagraph,
    lineLayouts: List<NativeLineLayout>,
    breakTable: ParagraphBreakTable,
  ): ParagraphBoundaryMap {
    val graphemeBoundaries = breakTable.graphemeBoundaries.map { it.toInt() }.sorted()
    val runBoundaries = collectRunBoundaries(paragraph)
    val atomicSpanBoundaries = paragraph.atomicSpans
      .flatMap { span -> listOf(span.start, span.end) }
      .distinct()
      .sorted()
    val clusterViolations = collectParagraphClusterViolationOffsets(
      lineLayouts,
      graphemeBoundaries.toSet(),
      paragraph.atomicSpans,
    )

    return ParagraphBoundaryMap(
      utf16Length = paragraph.text.length.toDouble(),
      graphemeBoundaries = graphemeBoundaries.map { it.toDouble() }.toDoubleArray(),
      runBoundaries = runBoundaries.map { it.toDouble() }.toDoubleArray(),
      hardBreaks = breakTable.hardBreaks.map { it.offset }.toDoubleArray(),
      nativeSoftBreaks = breakTable.nativeSoftBreaks.map { it.offset }.toDoubleArray(),
      atomicSpanBoundaries = atomicSpanBoundaries.map { it.toDouble() }.toDoubleArray(),
      clusterViolationOffsets = clusterViolations.map { it.toDouble() }.toDoubleArray(),
    )
  }

  private fun collectHardBreaks(text: String): List<ParagraphBreakOpportunity> {
    val breaks = ArrayList<ParagraphBreakOpportunity>()
    var index = text.indexOf('\n')
    while (index >= 0) {
      breaks += ParagraphBreakOpportunity(
        offset = (index + 1).toDouble(),
        kind = BREAK_KIND_HARD,
        source = "source_newline",
      )
      index = text.indexOf('\n', index + 1)
    }
    return breaks
  }

  private fun collectGraphemeBoundaries(paragraph: NativePreparedParagraph): List<Int> {
    return collectGraphemeBoundariesForText(
      paragraph.text,
      paragraph.runs.firstOrNull()?.style?.locale ?: "",
    )
  }

  private fun collectGraphemeBoundariesForText(
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

  private fun collectRunBoundaries(paragraph: NativePreparedParagraph): List<Int> {
    return (listOf(0, paragraph.text.length) + paragraph.runs.flatMap { run ->
      listOf(run.start, run.end)
    })
      .map { it.coerceIn(0, paragraph.text.length) }
      .distinct()
      .sorted()
  }

  private fun collectParagraphClusterViolationOffsets(
    lineLayouts: List<NativeLineLayout>,
    graphemeBoundarySet: Set<Int>,
    atomicSpans: List<NativeAtomicSpan>,
  ): List<Int> {
    return lineLayouts
      .flatMap { line -> collectLineClusterViolationOffsets(line, graphemeBoundarySet, atomicSpans) }
      .distinct()
      .sorted()
  }

  private fun collectLineClusterViolationOffsets(
    line: NativeLineLayout,
    boundaryMap: ParagraphBoundaryMap,
    atomicSpans: List<NativeAtomicSpan>,
  ): List<Int> {
    return collectLineClusterViolationOffsets(
      line,
      boundaryMap.graphemeBoundaries.map { it.toInt() }.toSet(),
      atomicSpans,
    )
  }

  private fun collectLineClusterViolationOffsets(
    line: NativeLineLayout,
    graphemeBoundarySet: Set<Int>,
    atomicSpans: List<NativeAtomicSpan>,
  ): List<Int> {
    val violations = LinkedHashSet<Int>()
    if (!graphemeBoundarySet.contains(line.textStart)) {
      violations += line.textStart
    }
    if (!graphemeBoundarySet.contains(line.textEnd)) {
      violations += line.textEnd
    }
    atomicSpans.forEach { span ->
      if (line.textStart > span.start && line.textStart < span.end) {
        violations += line.textStart
      }
      if (line.textEnd > span.start && line.textEnd < span.end) {
        violations += line.textEnd
      }
    }
    return violations.toList()
  }

  private fun buildComplexShapeCounters(
    paragraph: NativePreparedParagraph,
    boundaryMap: ParagraphBoundaryMap,
  ): ParagraphComplexShapeCounters {
    val boundaries = boundaryMap.graphemeBoundaries.map { it.toInt() }
    return ParagraphComplexShapeCounters(
      bidiRunCount = countBidiRuns(paragraph.text).toDouble(),
      emojiClusterCount = countClusters(paragraph.text, boundaries, ::containsEmoji).toDouble(),
      complexClusterCount = countComplexClusters(paragraph.text, boundaries).toDouble(),
      clusterViolationCount = boundaryMap.clusterViolationOffsets.size.toDouble(),
    )
  }

  private fun countClusters(
    text: String,
    boundaries: List<Int>,
    predicate: (String) -> Boolean,
  ): Int {
    return boundaries
      .zipWithNext()
      .count { (start, end) -> end > start && predicate(text.substring(start, end)) }
  }

  private fun countComplexClusters(text: String, boundaries: List<Int>): Int {
    return boundaries
      .zipWithNext()
      .count { (start, end) ->
        if (end <= start) {
          false
        } else {
          val cluster = text.substring(start, end)
          cluster.length > Character.charCount(cluster.codePointAt(0)) ||
            cluster.codePoints().anyMatch { codePoint ->
              isCombiningMark(codePoint) ||
                isVariationSelector(codePoint) ||
                isEmojiModifier(codePoint) ||
                isRegionalIndicator(codePoint) ||
                isIndicVirama(codePoint) ||
                codePoint == ZERO_WIDTH_JOINER
            }
        }
      }
  }

  private fun countBidiRuns(text: String): Int {
    var runs = 0
    var previousDirection: Int? = null
    text.codePoints().forEachOrdered { codePoint ->
      val direction = when (Character.getDirectionality(codePoint)) {
        Character.DIRECTIONALITY_LEFT_TO_RIGHT -> 0
        Character.DIRECTIONALITY_RIGHT_TO_LEFT,
        Character.DIRECTIONALITY_RIGHT_TO_LEFT_ARABIC -> 1
        else -> null
      }
      if (direction != null && direction != previousDirection) {
        runs += 1
        previousDirection = direction
      }
    }
    return runs
  }

  private fun collectLineDriftKinds(
    line: NativeLineLayout,
    canonicalEngine: String,
  ): List<String> {
    val driftKinds = LinkedHashSet<String>()
    if (line.layoutEngine != canonicalEngine || line.fallbackReason != null) {
      driftKinds += DRIFT_ENGINE
    }
    if (line.fallbackReason != null) {
      driftKinds += DRIFT_HEIGHT_METRIC
    }
    return driftKinds.toList()
  }

  private fun collectDriftKinds(
    paragraph: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    request: NativeLayoutRequest,
    lineLayouts: List<NativeLineLayout>,
    boundaryMap: ParagraphBoundaryMap,
  ): List<String> {
    val driftKinds = LinkedHashSet<String>()
    val canonicalEngine = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER
    } else {
      LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK
    }
    if (lineLayouts.any { it.layoutEngine != canonicalEngine || it.fallbackReason != null }) {
      driftKinds += DRIFT_ENGINE
    }
    if (
      request.whiteSpace != WHITE_SPACE_NORMAL ||
      request.wordBreak != WORD_BREAK_NORMAL ||
      request.shapeSlices.isNotEmpty() ||
      paragraph.atomicSpans.isNotEmpty()
    ) {
      driftKinds += DRIFT_ALGORITHM_RULE
      driftKinds += DRIFT_LINE_BREAK_STRATEGY
    }
    if (lineLayouts.any { it.fallbackReason != null }) {
      driftKinds += DRIFT_HEIGHT_METRIC
    }
    if (!corpus.includeFontPadding) {
      driftKinds += DRIFT_PADDING
    }
    if (paragraph.runs.any { it.style.locale.isNotBlank() }) {
      driftKinds += DRIFT_LOCALE_METRIC
    }
    if (containsPotentialFallbackGlyph(paragraph.text)) {
      driftKinds += DRIFT_FALLBACK_FONT
    }
    if (containsEmoji(paragraph.text)) {
      driftKinds += DRIFT_EMOJI_METRIC
    }
    if (boundaryMap.clusterViolationOffsets.isNotEmpty()) {
      driftKinds += DRIFT_CLUSTER_BOUNDARY
    }
    return driftKinds.toList()
  }

  private fun containsPotentialFallbackGlyph(text: String): Boolean {
    return text.codePoints().anyMatch { codePoint ->
      codePoint > 0x02AF
    }
  }

  private fun containsEmoji(text: String): Boolean {
    return text.codePoints().anyMatch { codePoint ->
      codePoint in 0x1F000..0x1FAFF ||
        codePoint in 0x2600..0x27BF ||
        codePoint == 0xFE0F
    }
  }

  private fun normalizeLayoutRequest(request: ParagraphLayoutRequest): NativeLayoutRequest {
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

  private fun sumHeights(lineLayouts: List<NativeLineLayout>): Double {
    return lineLayouts.lastOrNull()?.let { it.top + it.height } ?: 0.0
  }

  private fun nowMs(): Double {
    return System.nanoTime() / 1_000_000.0
  }

  private fun prepareMeasuredToken(
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

  private fun tokenize(text: String, style: NativeTextStyle): List<NativeTokenDescriptor> {
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

  private fun tokenizeBreakUnits(text: String, style: NativeTextStyle): List<NativeTokenDescriptor> {
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

  private fun appendInlineSegmentTokens(
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

  private fun layoutLineLayouts(
    prepared: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    request: NativeLayoutRequest,
  ): List<NativeLineLayout> {
    val canUseStaticLayout =
      request.shapeSlices.isEmpty() &&
        request.whiteSpace == WHITE_SPACE_NORMAL &&
        request.wordBreak == WORD_BREAK_NORMAL &&
        !prepared.forceTokenLayout

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
        textPaint = corpus.textPaint,
        defaultStyle = corpus.baseStyle,
        runs = prepared.runs,
        inlineBoxes = prepared.inlineBoxes,
        width = request.width,
        left = request.left,
        defaultLineHeight = corpus.lineHeight,
        includeFontPadding = corpus.includeFontPadding,
      )
    }

    if (canUseStaticLayout) {
      return StaticLayoutLineLayout.layoutLineLayouts(
        text = prepared.styledText,
        textPaint = corpus.textPaint,
        runs = prepared.runs,
        inlineBoxes = prepared.inlineBoxes,
        width = request.width,
        left = request.left,
        defaultLineHeight = corpus.lineHeight,
        includeFontPadding = corpus.includeFontPadding,
        textDirection = corpus.baseStyle.textDirection,
        textLocale = corpus.baseStyle.locale,
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
}

private fun resolveAlignedLineLeft(
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
private object Api29LineLayout {
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
          PretextShared.maxRequestedLineHeight(
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
          PretextShared.maxRequestedLineHeight(
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

private object StaticLayoutLineLayout {
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
          PretextShared.maxRequestedLineHeight(
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

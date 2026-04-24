package com.margelo.nitro.pretext

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.text.LineBreaker
import android.graphics.text.MeasuredText
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import java.text.BreakIterator
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

internal object PretextShared {
  private val nextPreparedCorpusId = AtomicLong(1)
  private val preparedCorpora = ConcurrentHashMap<Long, NativePreparedCorpus>()
  private val nextLineCursorId = AtomicLong(1)
  private val lineCursors = ConcurrentHashMap<Long, NativeLineCursor>()
  @Volatile private var applicationContext: Context? = null

  fun setApplicationContext(context: Context) {
    applicationContext = context.applicationContext
  }

  fun measure(text: String, fontFamily: String, fontSize: Double): Double {
    return measureToken(
      text,
      NativeTextStyle(
        fontFamily = fontFamily,
        fontSize = fontSize,
        lineHeight = fontSize,
        letterSpacing = 0.0,
        locale = "",
        fontWeight = "",
        fontStyle = FONT_STYLE_NORMAL,
        includeFontPadding = true,
        textDirection = ParagraphTextDirection.AUTO,
      ),
    ).width
  }

  fun measureBatch(texts: Array<String>, fontFamily: String, fontSize: Double): DoubleArray {
    val style =
      NativeTextStyle(
        fontFamily = fontFamily,
        fontSize = fontSize,
        lineHeight = fontSize,
        letterSpacing = 0.0,
        locale = "",
        fontWeight = "",
        fontStyle = FONT_STYLE_NORMAL,
        includeFontPadding = true,
        textDirection = ParagraphTextDirection.AUTO,
      )
    return DoubleArray(texts.size) { index ->
      measureToken(texts[index], style).width
    }
  }

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
        hasStyledRuns = false,
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
          hasStyledRuns = paragraph.hasStyledRuns,
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
    var hasStyledRuns = false

    paragraph.forEach { segment ->
      val start = textBuilder.length
      val breakBehavior = segment.breakBehavior.lowercase()
      if (segment.kind?.lowercase() == INLINE_SEGMENT_KIND_BOX || segment.boxId != null) {
        val box = buildInlineBox(segment, start)
        textBuilder.append(OBJECT_REPLACEMENT_CHARACTER)
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
      hasStyledRuns = hasStyledRuns || resolvedStyle != baseStyle
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
      hasStyledRuns = hasStyledRuns,
    )
  }

  private fun buildInlineBox(segment: InlineSegment, start: Int): NativeInlineBox {
    val width = max(0.0, segment.width ?: 0.0)
    val height = max(0.0, segment.height ?: 0.0)
    val baseline = (segment.baseline ?: height).coerceIn(0.0, height)
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

  fun hitTestPreparedTextPosition(
    preparedId: Double,
    paragraphIndex: Double,
    request: ParagraphLayoutRequest,
    x: Double,
    y: Double,
  ): PreparedTextPosition {
    val prepared = requirePreparedCorpus(preparedId)
    val resolvedParagraphIndex = resolveParagraphIndex(prepared, paragraphIndex.toInt())
    val paragraph = prepared.paragraphs[resolvedParagraphIndex]
    val lineLayouts = resolveParagraphLineLayouts(prepared, normalizeLayoutRequest(request))[resolvedParagraphIndex]
    val lineIndex = resolveLineIndex(lineLayouts, y)
    val line = lineLayouts.getOrNull(lineIndex) ?: emptyLineLayout()
    val offset = snapOffsetToNearestGraphemeBoundary(paragraph, resolveOffsetForX(paragraph, line, x))

    return PreparedTextPosition(
      paragraphIndex = resolvedParagraphIndex.toDouble(),
      lineIndex = lineIndex.toDouble(),
      offset = offset.toDouble(),
      lineTextStart = line.textStart.toDouble(),
      lineTextEnd = line.textEnd.toDouble(),
      x = x,
      y = y,
      layoutEngine = line.layoutEngine,
      heightMetricSource = HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS,
      fallbackReason = line.fallbackReason,
    )
  }

  fun layoutPreparedTextSelectionRects(
    preparedId: Double,
    range: PreparedTextRange,
    request: ParagraphLayoutRequest,
  ): Array<PreparedTextSelectionRect> {
    val prepared = requirePreparedCorpus(preparedId)
    val paragraphIndex = resolveParagraphIndex(prepared, range.paragraphIndex.toInt())
    val paragraph = prepared.paragraphs[paragraphIndex]
    val lineLayouts = resolveParagraphLineLayouts(prepared, normalizeLayoutRequest(request))[paragraphIndex]
    val (textStart, textEnd) = normalizeSelectionRange(
      paragraph,
      min(range.textStart, range.textEnd).toInt(),
      max(range.textStart, range.textEnd).toInt(),
    )

    return lineLayouts.mapIndexedNotNull { lineIndex, line ->
      val rectStart = max(textStart, line.textStart)
      val rectEnd = min(textEnd, line.textEnd)
      if (rectEnd <= rectStart) {
        return@mapIndexedNotNull null
      }
      val startX = measureParagraphAdvance(paragraph, line.textStart, rectStart)
      val endX = measureParagraphAdvance(paragraph, line.textStart, rectEnd)
      PreparedTextSelectionRect(
        paragraphIndex = paragraphIndex.toDouble(),
        lineIndex = lineIndex.toDouble(),
        textStart = rectStart.toDouble(),
        textEnd = rectEnd.toDouble(),
        left = line.left + startX,
        top = line.top,
        width = max(1.0, endX - startX),
        height = line.height,
        layoutEngine = line.layoutEngine,
        heightMetricSource = HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS,
        fallbackReason = line.fallbackReason,
      )
    }.toTypedArray()
  }

  fun selectAllPreparedText(
    preparedId: Double,
    paragraphIndex: Double,
  ): PreparedTextRange {
    val prepared = requirePreparedCorpus(preparedId)
    val resolvedParagraphIndex = resolveParagraphIndex(prepared, paragraphIndex.toInt())
    return PreparedTextRange(
      paragraphIndex = resolvedParagraphIndex.toDouble(),
      textStart = 0.0,
      textEnd = prepared.paragraphs[resolvedParagraphIndex].text.length.toDouble(),
    )
  }

  fun getPreparedTextSelection(
    preparedId: Double,
    range: PreparedTextRange,
  ): String {
    val prepared = requirePreparedCorpus(preparedId)
    val paragraphIndex = resolveParagraphIndex(prepared, range.paragraphIndex.toInt())
    val paragraph = prepared.paragraphs[paragraphIndex]
    val text = paragraph.text
    val (start, end) = normalizeSelectionRange(
      paragraph,
      min(range.textStart, range.textEnd).toInt(),
      max(range.textStart, range.textEnd).toInt(),
    )
    return text.substring(start, end)
  }

  fun copyPreparedTextSelection(
    preparedId: Double,
    range: PreparedTextRange,
  ): String {
    val selectedText = getPreparedTextSelection(preparedId, range)
    val clipboard = applicationContext
      ?.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
    clipboard?.setPrimaryClip(ClipData.newPlainText("Pretext selection", selectedText))
    return selectedText
  }

  fun createParagraphLineCursor(
    preparedId: Double,
    paragraphIndex: Double,
    request: ParagraphLayoutRequest,
  ): ParagraphLineCursorState {
    val prepared = requirePreparedCorpus(preparedId)
    val normalizedRequest = normalizeLayoutRequest(request)
    val resolvedParagraphIndex = paragraphIndex.toInt()
    prepared.paragraphs.getOrNull(resolvedParagraphIndex)
      ?: error("Paragraph index $resolvedParagraphIndex not found for prepared corpus ${preparedId.toLong()}.")
    val lines = resolveParagraphLineLayouts(prepared, normalizedRequest)[resolvedParagraphIndex]
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
    return resolveParagraphDrawing(
      preparedId = preparedId,
      paragraphIndex = paragraphIndex,
      request = defaultLayoutRequest(width),
    )
  }

  fun resolveParagraphDrawing(
    preparedId: Double,
    paragraphIndex: Int,
    request: NativeLayoutRequest,
  ): NativeParagraphDrawing? {
    val prepared = preparedCorpora[preparedId.toLong()] ?: return null
    val paragraph = prepared.paragraphs.getOrNull(paragraphIndex) ?: return null
    val lineLayouts = resolveParagraphLineLayouts(prepared, request)[paragraphIndex]
    return buildNativeParagraphDrawing(paragraph, lineLayouts)
  }

  fun resolveParagraphsDrawing(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<NativeParagraphDrawing>? {
    val prepared = preparedCorpora[preparedId.toLong()] ?: return null
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, paragraph ->
      buildNativeParagraphDrawing(paragraph, paragraphLineLayouts[index])
    }
  }

  fun releaseParagraphs(preparedId: Double) {
    preparedCorpora.remove(preparedId.toLong())
  }

  private fun layoutParagraphsInternal(
    preparedId: Double,
    request: NativeLayoutRequest,
  ): List<LaidOutParagraph> {
    val prepared = requirePreparedCorpus(preparedId)
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, paragraph ->
      val lineLayouts = paragraphLineLayouts[index]
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
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, _ ->
      val lineLayouts = paragraphLineLayouts[index]
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
    val paragraphLineLayouts = resolveParagraphLineLayouts(prepared, request)
    return prepared.paragraphs.mapIndexed { index, _ ->
      val lineLayouts = paragraphLineLayouts[index]
      LaidOutParagraphLines(
        lineCount = lineLayouts.size.toDouble(),
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
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
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
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
        height = sumHeights(lineLayouts),
        maxLineWidth = lineLayouts.maxOfOrNull { it.width } ?: 0.0,
        lines = buildPublicParagraphLineRanges(lineLayouts).toTypedArray(),
        boxFrames = buildInlineBoxFrames(
          paragraphIndex = index,
          paragraph = paragraph,
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

  private fun resolveParagraphIndex(
    prepared: NativePreparedCorpus,
    requestedIndex: Int,
  ): Int {
    if (prepared.paragraphs.isEmpty()) {
      error("Prepared benchmark corpus has no paragraphs.")
    }
    return requestedIndex.coerceIn(0, prepared.paragraphs.lastIndex)
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
        layoutEngine = line.layoutEngine,
        fallbackReason = line.fallbackReason,
        heightMetricSource = HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS,
      )
    }
  }

  private fun buildInlineBoxFrames(
    paragraphIndex: Int,
    paragraph: NativePreparedParagraph,
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
      val left = line.left + measureParagraphAdvance(paragraph, line.textStart, box.start)
      frames += InlineBoxFrame(
        boxId = box.boxId,
        paragraphIndex = paragraphIndex.toDouble(),
        lineIndex = lineIndex.toDouble(),
        textStart = box.start.toDouble(),
        textEnd = box.end.toDouble(),
        left = left,
        top = baseline - box.baseline,
        width = box.width,
        height = box.height,
        baseline = baseline,
        accessibilityLabel = box.accessibilityLabel,
        accessibilityHint = box.accessibilityHint,
        accessibilityRole = box.accessibilityRole,
      )
    }
    return frames
  }

  private fun resolveLineIndex(
    lineLayouts: List<NativeLineLayout>,
    y: Double,
  ): Int {
    if (lineLayouts.isEmpty()) {
      return 0
    }

    val directHit = lineLayouts.indexOfFirst { line ->
      y >= line.top && y <= line.top + line.height
    }
    if (directHit >= 0) {
      return directHit
    }

    return if (y < lineLayouts.first().top) {
      0
    } else {
      lineLayouts.lastIndex
    }
  }

  private fun resolveOffsetForX(
    paragraph: NativePreparedParagraph,
    line: NativeLineLayout,
    x: Double,
  ): Int {
    if (line.textEnd <= line.textStart) {
      return line.textStart
    }

    val targetX = x - line.left
    if (targetX <= 0.0) {
      return line.textStart
    }
    if (targetX >= line.width) {
      return line.textEnd
    }

    var low = line.textStart
    var high = line.textEnd
    while (low < high) {
      val mid = (low + high) / 2
      val advance = measureParagraphAdvance(paragraph, line.textStart, mid)
      if (advance < targetX) {
        low = mid + 1
      } else {
        high = mid
      }
    }

    val candidate = low.coerceIn(line.textStart, line.textEnd)
    val previous = (candidate - 1).coerceAtLeast(line.textStart)
    val candidateX = measureParagraphAdvance(paragraph, line.textStart, candidate)
    val previousX = measureParagraphAdvance(paragraph, line.textStart, previous)
    return if (abs(candidateX - targetX) < abs(targetX - previousX)) {
      candidate
    } else {
      previous
    }
  }

  private fun emptyLineLayout(): NativeLineLayout {
    return NativeLineLayout(
      textStart = 0,
      textEnd = 0,
      width = 0.0,
      left = 0.0,
      top = 0.0,
      height = 0.0,
      ascent = 0.0,
      descent = 0.0,
      layoutEngine = LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK,
      fallbackReason = FALLBACK_REASON_MANUAL_HEIGHT_ESTIMATE,
    )
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

  private fun buildNativeParagraphDrawing(
    paragraph: NativePreparedParagraph,
    lineLayouts: List<NativeLineLayout>,
  ): NativeParagraphDrawing {
    return NativeParagraphDrawing(
      text = paragraph.text,
      styledText = paragraph.styledText,
      hasStyledRuns = paragraph.hasStyledRuns,
      measuredText = paragraph.measuredText,
      runs = paragraph.runs,
      inlineBoxes = paragraph.inlineBoxes,
      layoutEngine = lineLayouts.firstOrNull()?.layoutEngine ?: LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK,
      fallbackReason = lineLayouts.firstNotNullOfOrNull { it.fallbackReason },
      heightMetricSource = HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS,
      lines = buildNativeParagraphLineRanges(lineLayouts),
    )
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
      width = request.width,
      left = request.left,
      whiteSpace = request.whiteSpace,
      wordBreak = request.wordBreak,
      shapeSlices = request.shapeSlices.map { slice ->
        ParagraphShapeSlice(
          top = slice.top,
          height = slice.height,
          left = slice.left,
          width = slice.width,
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

  private fun snapOffsetToNearestGraphemeBoundary(paragraph: NativePreparedParagraph, offset: Int): Int {
    val boundaries = collectGraphemeBoundaries(paragraph)
    return snapOffsetToNearestBoundary(boundaries, paragraph.text.length, offset)
  }

  private fun normalizeSelectionRange(
    paragraph: NativePreparedParagraph,
    start: Int,
    end: Int,
  ): Pair<Int, Int> {
    val text = paragraph.text
    val boundaries = collectGraphemeBoundaries(paragraph)
    val clampedStart = start.coerceIn(0, text.length)
    val clampedEnd = end.coerceIn(0, text.length)
    if (clampedStart == clampedEnd) {
      val safeOffset = snapOffsetToNearestBoundary(boundaries, text.length, clampedStart)
      return safeOffset to safeOffset
    }
    val safeStart = boundaries.lastOrNull { it <= clampedStart } ?: 0
    val safeEnd = boundaries.firstOrNull { it >= clampedEnd } ?: text.length
    return safeStart to max(safeStart, safeEnd)
  }

  private fun snapOffsetToNearestBoundary(boundaries: List<Int>, textLength: Int, offset: Int): Int {
    val clamped = offset.coerceIn(0, textLength)
    val lower = boundaries.lastOrNull { it <= clamped } ?: 0
    val upper = boundaries.firstOrNull { it >= clamped } ?: textLength
    return if (clamped - lower <= upper - clamped) lower else upper
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
        val metrics = fallbackLineMetrics(units, start, end, defaultLineHeight)
        lines += NativeLineLayout(
          textStart = position,
          textEnd = position,
          width = 0.0,
          left = constraint.left,
          top = top,
          height = metrics.lineHeight,
          ascent = metrics.ascent,
          descent = metrics.descent,
        )
      } else {
        val metrics = fallbackLineMetrics(units, start, end, defaultLineHeight)
        lines += NativeLineLayout(
          textStart = units[start].start,
          textEnd = units[end - 1].end,
          width = sumWidths(units, start, end),
          left = constraint.left,
          top = top,
          height = metrics.lineHeight,
          ascent = metrics.ascent,
          descent = metrics.descent,
        )
      }

      top += lines.last().height
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
          height = max(defaultLineHeight, newline.lineHeight),
          ascent = newline.ascent,
          descent = max(newline.descent, max(defaultLineHeight, newline.lineHeight) - newline.ascent),
        )
        top += max(defaultLineHeight, newline.lineHeight)
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
          left = constraint.left,
          top = top,
          height = fallbackLineHeight,
          ascent = fallback.ascent,
          descent = max(fallback.descent, fallbackLineHeight + fallback.ascent),
        )
        top += fallbackLineHeight
        cursor += 1
      } else {
        val metrics = fallbackLineMetrics(units, cursor, trimmedEnd, defaultLineHeight)
        lines += NativeLineLayout(
          textStart = units[cursor].start,
          textEnd = units[trimmedEnd - 1].end,
          width = sumWidths(units, cursor, trimmedEnd),
          left = constraint.left,
          top = top,
          height = metrics.lineHeight,
          ascent = metrics.ascent,
          descent = metrics.descent,
        )
        top += metrics.lineHeight
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
        val requested = if (run.style.lineHeight > 0.0) run.style.lineHeight else defaultLineHeight
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
    runs: List<NativeTextRun>,
    inlineBoxes: List<NativeInlineBox>,
    width: Double,
    left: Double,
    defaultLineHeight: Double,
    includeFontPadding: Boolean,
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
      lines += NativeLineLayout(
        textStart = start,
        textEnd = end,
        width = measuredParagraph.getWidth(start, end).toDouble(),
        left = left,
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
          fallbackReason = null,
        ),
      )
    }

    val lines = ArrayList<NativeLineLayout>(layout.lineCount)
    var top = 0.0

    for (lineIndex in 0 until layout.lineCount) {
      val start = layout.getLineStart(lineIndex)
      val end = layout.getLineVisibleEnd(lineIndex)
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
        left = left,
        top = top,
        height = lineHeight,
        ascent = ascent,
        descent = descent,
        layoutEngine = LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT,
        fallbackReason = null,
      )
      top += lineHeight
    }

    return lines
  }
}

internal data class NativePreparedParagraphSeed(
  val text: String,
  val tokens: List<NativeTokenDescriptor>,
  val breakUnits: List<NativeTokenDescriptor>,
  val runs: List<NativeTextRun>,
  val atomicSpans: List<NativeAtomicSpan>,
  val inlineBoxes: List<NativeInlineBox>,
  val textUnits: Int,
  val forceTokenLayout: Boolean,
  val hasStyledRuns: Boolean,
)

internal data class NativeTokenDescriptor(
  val text: String,
  val start: Int,
  val end: Int,
  val style: NativeTextStyle,
  val inlineBox: NativeInlineBox? = null,
)

internal data class NativePreparedToken(
  val text: String,
  val start: Int,
  val end: Int,
  val width: Double,
  val lineHeight: Double,
  val ascent: Double,
  val descent: Double,
)

internal data class NativePreparedParagraph(
  val text: String,
  val styledText: CharSequence,
  val measuredText: Any?,
  val tokens: List<NativePreparedToken>,
  val breakUnits: List<NativePreparedToken>,
  val runs: List<NativeTextRun>,
  val atomicSpans: List<NativeAtomicSpan>,
  val inlineBoxes: List<NativeInlineBox>,
  val forceTokenLayout: Boolean,
  val hasStyledRuns: Boolean,
)

internal data class NativeAtomicSpan(
  val start: Int,
  val end: Int,
  val source: String,
)

internal data class NativeInlineBox(
  val boxId: String,
  val start: Int,
  val end: Int,
  val width: Double,
  val height: Double,
  val baseline: Double,
  val breakBehavior: String,
  val accessibilityLabel: String?,
  val accessibilityHint: String?,
  val accessibilityRole: String?,
)

internal class NativePreparedCorpus(
  val paragraphs: List<NativePreparedParagraph>,
  val baseStyle: NativeTextStyle,
  val lineHeight: Double,
  val textPaint: TextPaint,
  val includeFontPadding: Boolean,
  val textDirection: ParagraphTextDirection,
  val lineBreaker: Any?,
) {
  private val layoutCacheLock = Any()
  private val layoutCache =
    LinkedHashMap<NativeLayoutRequest, List<List<NativeLineLayout>>>(16, 0.75f, true)

  fun resolveLineLayouts(
    request: NativeLayoutRequest,
    builder: () -> List<List<NativeLineLayout>>,
  ): List<List<NativeLineLayout>> {
    synchronized(layoutCacheLock) {
      layoutCache[request]?.let { return it }
    }

    val computed = builder()

    synchronized(layoutCacheLock) {
      layoutCache[request]?.let { return it }
      layoutCache[request] = computed
      while (layoutCache.size > LAYOUT_CACHE_LIMIT) {
        val iterator = layoutCache.entries.iterator()
        if (!iterator.hasNext()) {
          break
        }
        iterator.next()
        iterator.remove()
      }
    }

    return computed
  }

  private companion object {
    private const val LAYOUT_CACHE_LIMIT = 12
  }
}

internal data class NativeLineLayout(
  val textStart: Int,
  val textEnd: Int,
  val width: Double,
  val left: Double,
  val top: Double,
  val height: Double,
  val ascent: Double,
  val descent: Double,
  val layoutEngine: String = LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK,
  val fallbackReason: String? = FALLBACK_REASON_MANUAL_HEIGHT_ESTIMATE,
)

internal data class NativeLineFontPadding(
  val top: Double,
  val bottom: Double,
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
  val layoutEngine: String,
  val fallbackReason: String?,
  val heightMetricSource: String,
)

internal data class NativeParagraphDrawing(
  val text: String,
  val styledText: CharSequence,
  val hasStyledRuns: Boolean,
  val measuredText: Any?,
  val runs: List<NativeTextRun>,
  val inlineBoxes: List<NativeInlineBox>,
  val layoutEngine: String,
  val fallbackReason: String?,
  val heightMetricSource: String,
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
internal const val INLINE_SEGMENT_KIND_BOX = "box"
internal const val LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER =
  "android_measured_text_line_breaker"
internal const val LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT = "android_static_layout_compat"
internal const val LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK = "android_legacy_fallback"
internal const val FALLBACK_REASON_MANUAL_HEIGHT_ESTIMATE = "manual_height_estimate"
internal const val HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS =
  "platform_text_engine_metrics"
internal const val RULE_LAYER_PRETEXT_NATIVE = "pretext_native_rules"
internal const val BREAK_KIND_HARD = "hard_break"
internal const val BREAK_KIND_NATIVE_SOFT = "native_soft_break"
internal const val DRIFT_CLUSTER_BOUNDARY = "cluster_boundary_drift"
internal const val DRIFT_ALGORITHM_RULE = "algorithm_rule_drift"
internal const val DRIFT_EMOJI_METRIC = "emoji_metric_drift"
internal const val DRIFT_ENGINE = "engine_drift"
internal const val DRIFT_FALLBACK_FONT = "fallback_font_drift"
internal const val DRIFT_HEIGHT_METRIC = "height_metric_drift"
internal const val DRIFT_LINE_BREAK_STRATEGY = "line_break_strategy_drift"
internal const val DRIFT_LOCALE_METRIC = "locale_metric_drift"
internal const val DRIFT_PADDING = "padding_drift"
internal val HEIGHT_METRIC_DRIVERS =
  arrayOf(
    "font_metrics",
    "explicit_line_height",
    "fallback_font",
    "emoji_fallback",
    "locale",
    "include_font_padding",
    "line_break_strategy",
  )
private const val ZERO_WIDTH_JOINER = 0x200D

private fun isCombiningMark(codePoint: Int): Boolean {
  return when (Character.getType(codePoint)) {
    Character.NON_SPACING_MARK.toInt(),
    Character.COMBINING_SPACING_MARK.toInt(),
    Character.ENCLOSING_MARK.toInt() -> true
    else -> false
  }
}

private fun isVariationSelector(codePoint: Int): Boolean {
  return codePoint in 0xFE00..0xFE0F || codePoint in 0xE0100..0xE01EF
}

private fun isEmojiModifier(codePoint: Int): Boolean {
  return codePoint in 0x1F3FB..0x1F3FF
}

private fun isRegionalIndicator(codePoint: Int): Boolean {
  return codePoint in 0x1F1E6..0x1F1FF
}

private fun isIndicVirama(codePoint: Int): Boolean {
  return codePoint in setOf(
    0x094D,
    0x09CD,
    0x0A4D,
    0x0ACD,
    0x0B4D,
    0x0BCD,
    0x0C4D,
    0x0CCD,
    0x0D4D,
    0x0DCA,
    0x0E3A,
    0x0F84,
    0x1039,
    0x103A,
    0x1714,
    0x1734,
    0x17D2,
    0x1A60,
  )
}

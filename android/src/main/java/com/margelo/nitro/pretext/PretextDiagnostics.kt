package com.margelo.nitro.pretext

internal fun buildParagraphLayoutDiagnostics(
  paragraph: NativePreparedParagraph,
  corpus: NativePreparedCorpus,
  request: NativeLayoutRequest,
  lineLayouts: List<NativeLineLayout>,
): ParagraphLayoutDiagnostics {
  val canonicalLayoutEngine = LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT
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
  val canonicalEngine = LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT
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

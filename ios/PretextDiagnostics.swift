import Foundation

internal func buildParagraphLayoutDiagnostics(
    paragraph: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    request: NativeLayoutRequest,
    lineLayouts: [NativeLineLayout]
) -> ParagraphLayoutDiagnostics {
    let breakTable = buildParagraphBreakTable(paragraph: paragraph, lineLayouts: lineLayouts)
    let boundaryMap = buildParagraphBoundaryMap(
        paragraph: paragraph,
        lineLayouts: lineLayouts,
        breakTable: breakTable
    )
    let driftKinds = collectDriftKinds(
        paragraph: paragraph,
        corpus: corpus,
        request: request,
        lineLayouts: lineLayouts,
        boundaryMap: boundaryMap
    )
    return ParagraphLayoutDiagnostics(
        normalizedRequest: buildPublicLayoutRequest(request),
        ruleLayer: ruleLayerPretextNative,
        canvasPixelParityTarget: false,
        textDirection: corpus.baseStyle.textDirection,
        layoutEngine: lineLayouts.first?.layoutEngine ?? layoutEngineIosCoreText,
        heightMetricSource: heightMetricSourcePlatformTextEngineMetrics,
        fallbackReason: lineLayouts.compactMap { $0.fallbackReason }.first,
        driftKinds: driftKinds,
        heightMetricDrivers: heightMetricDrivers,
        breakTable: breakTable,
        boundaryMap: boundaryMap,
        complexShapeCounters: buildComplexShapeCounters(
            paragraph: paragraph,
            boundaryMap: boundaryMap
        ),
        lineDiagnostics: lineLayouts.map { line in
            ParagraphLineDiagnostics(
                textStart: Double(line.textStartUTF16),
                textEnd: Double(line.textEndUTF16),
                textDirection: corpus.baseStyle.textDirection,
                layoutEngine: line.layoutEngine,
                heightMetricSource: heightMetricSourcePlatformTextEngineMetrics,
                fallbackReason: line.fallbackReason,
                driftKinds: collectLineDriftKinds(line),
                clusterViolationOffsets: collectLineClusterViolationOffsets(
                    line: line,
                    boundaryMap: boundaryMap,
                    atomicSpans: paragraph.atomicSpans
                ).map(Double.init)
            )
        }
    )
}

private func buildPublicLayoutRequest(_ request: NativeLayoutRequest) -> ParagraphLayoutRequest {
    ParagraphLayoutRequest(
        width: request.width,
        left: request.left,
        whiteSpace: request.whiteSpace,
        wordBreak: request.wordBreak,
        shapeSlices: request.shapeSlices.map { slice in
            ParagraphShapeSlice(
                top: slice.top,
                height: slice.height,
                left: slice.left,
                width: slice.width
            )
        }
    )
}

private func buildParagraphBreakTable(
    paragraph: NativePreparedParagraph,
    lineLayouts: [NativeLineLayout]
) -> ParagraphBreakTable {
    let textLength = paragraph.text.length
    let nativeSoftBreaks = lineLayouts.dropLast().compactMap { line -> ParagraphBreakOpportunity? in
        let offset = line.textEndUTF16
        guard offset > 0, offset < textLength else {
            return nil
        }
        guard paragraph.text.character(at: offset) != 0x0A else {
            return nil
        }
        return ParagraphBreakOpportunity(
            offset: Double(offset),
            kind: breakKindNativeSoft,
            source: line.layoutEngine
        )
    }

    return ParagraphBreakTable(
        hardBreaks: collectHardBreaks(paragraph.text),
        nativeSoftBreaks: nativeSoftBreaks,
        graphemeBoundaries: collectGraphemeBoundaries(paragraph.text),
        atomicSpans: paragraph.atomicSpans.map { span in
            ParagraphAtomicSpan(
                textStart: Double(span.startUTF16),
                textEnd: Double(span.endUTF16),
                source: span.source
            )
        }
    )
}

private func buildParagraphBoundaryMap(
    paragraph: NativePreparedParagraph,
    lineLayouts: [NativeLineLayout],
    breakTable: ParagraphBreakTable
) -> ParagraphBoundaryMap {
    let graphemeBoundaries = breakTable.graphemeBoundaries.map(Int.init).sorted()
    let runBoundaries = collectRunBoundaries(paragraph: paragraph)
    let atomicSpanBoundaries = Array(
        Set(paragraph.atomicSpans.flatMap { span in
            [span.startUTF16, span.endUTF16]
        })
    ).sorted()
    let clusterViolations = collectParagraphClusterViolationOffsets(
        lineLayouts: lineLayouts,
        graphemeBoundarySet: Set(graphemeBoundaries),
        atomicSpans: paragraph.atomicSpans
    )

    return ParagraphBoundaryMap(
        utf16Length: Double(paragraph.text.length),
        graphemeBoundaries: graphemeBoundaries.map(Double.init),
        runBoundaries: runBoundaries.map(Double.init),
        hardBreaks: breakTable.hardBreaks.map(\.offset),
        nativeSoftBreaks: breakTable.nativeSoftBreaks.map(\.offset),
        atomicSpanBoundaries: atomicSpanBoundaries.map(Double.init),
        clusterViolationOffsets: clusterViolations.map(Double.init)
    )
}

private func collectHardBreaks(_ text: NSString) -> [ParagraphBreakOpportunity] {
    var breaks: [ParagraphBreakOpportunity] = []
    var cursor = 0
    while cursor < text.length {
        let range = text.rangeOfComposedCharacterSequence(at: cursor)
        if text.substring(with: range) == newlineToken {
            breaks.append(
                ParagraphBreakOpportunity(
                    offset: Double(range.location + range.length),
                    kind: breakKindHard,
                    source: breakSourceNewline
                )
            )
        }
        cursor = range.location + range.length
    }
    return breaks
}

private func collectGraphemeBoundaries(_ text: NSString) -> [Double] {
    var boundaries: [Double] = [0]
    var cursor = 0
    while cursor < text.length {
        let range = text.rangeOfComposedCharacterSequence(at: cursor)
        cursor = range.location + range.length
        boundaries.append(Double(cursor))
    }
    return boundaries
}

private func collectRunBoundaries(paragraph: NativePreparedParagraph) -> [Int] {
    Array(
        Set(
            [0, paragraph.text.length] + paragraph.runs.flatMap { run in
                [run.startUTF16, run.endUTF16]
            }
        )
    )
    .map { min(max($0, 0), paragraph.text.length) }
    .sorted()
}

private func collectParagraphClusterViolationOffsets(
    lineLayouts: [NativeLineLayout],
    graphemeBoundarySet: Set<Int>,
    atomicSpans: [NativeAtomicSpan]
) -> [Int] {
    Array(
        Set(
            lineLayouts.flatMap { line in
                collectLineClusterViolationOffsets(
                    line: line,
                    graphemeBoundarySet: graphemeBoundarySet,
                    atomicSpans: atomicSpans
                )
            }
        )
    ).sorted()
}

private func collectLineClusterViolationOffsets(
    line: NativeLineLayout,
    boundaryMap: ParagraphBoundaryMap,
    atomicSpans: [NativeAtomicSpan]
) -> [Int] {
    collectLineClusterViolationOffsets(
        line: line,
        graphemeBoundarySet: Set(boundaryMap.graphemeBoundaries.map(Int.init)),
        atomicSpans: atomicSpans
    )
}

private func collectLineClusterViolationOffsets(
    line: NativeLineLayout,
    graphemeBoundarySet: Set<Int>,
    atomicSpans: [NativeAtomicSpan]
) -> [Int] {
    var violations = Set<Int>()
    if !graphemeBoundarySet.contains(line.textStartUTF16) {
        violations.insert(line.textStartUTF16)
    }
    if !graphemeBoundarySet.contains(line.textEndUTF16) {
        violations.insert(line.textEndUTF16)
    }
    for span in atomicSpans {
        if line.textStartUTF16 > span.startUTF16 && line.textStartUTF16 < span.endUTF16 {
            violations.insert(line.textStartUTF16)
        }
        if line.textEndUTF16 > span.startUTF16 && line.textEndUTF16 < span.endUTF16 {
            violations.insert(line.textEndUTF16)
        }
    }
    return Array(violations).sorted()
}

private func buildComplexShapeCounters(
    paragraph: NativePreparedParagraph,
    boundaryMap: ParagraphBoundaryMap
) -> ParagraphComplexShapeCounters {
    let boundaries = boundaryMap.graphemeBoundaries.map(Int.init)
    return ParagraphComplexShapeCounters(
        bidiRunCount: Double(countBidiRuns(paragraph.text)),
        emojiClusterCount: Double(
            countClusters(text: paragraph.text, boundaries: boundaries, predicate: containsEmoji)
        ),
        complexClusterCount: Double(countComplexClusters(text: paragraph.text, boundaries: boundaries)),
        clusterViolationCount: Double(boundaryMap.clusterViolationOffsets.count)
    )
}

private func countClusters(
    text: NSString,
    boundaries: [Int],
    predicate: (NSString) -> Bool
) -> Int {
    zip(boundaries, boundaries.dropFirst()).filter { pair in
        let (start, end) = pair
        return end > start &&
            predicate(text.substring(with: NSRange(location: start, length: end - start)) as NSString)
    }.count
}

private func countComplexClusters(text: NSString, boundaries: [Int]) -> Int {
    zip(boundaries, boundaries.dropFirst()).filter { pair in
        let (start, end) = pair
        guard end > start else {
            return false
        }
        let cluster = text.substring(with: NSRange(location: start, length: end - start))
        let scalarCount = cluster.unicodeScalars.count
        return scalarCount > 1 || cluster.unicodeScalars.contains { scalar in
            isCombiningMark(scalar)
                || isVariationSelector(scalar)
                || isEmojiModifier(scalar)
                || isRegionalIndicator(scalar)
                || isIndicVirama(scalar)
                || scalar.value == zeroWidthJoiner
        }
    }.count
}

private func countBidiRuns(_ text: NSString) -> Int {
    var runs = 0
    var previousDirection: Int?
    for scalar in (text as String).unicodeScalars {
        let direction: Int?
        if isRtlScalar(scalar) {
            direction = 1
        } else if isLtrScalar(scalar) {
            direction = 0
        } else {
            direction = nil
        }
        if let direction, direction != previousDirection {
            runs += 1
            previousDirection = direction
        }
    }
    return runs
}

private func collectLineDriftKinds(_ line: NativeLineLayout) -> [String] {
    var driftKinds: [String] = []
    if line.layoutEngine != layoutEngineIosCoreText {
        driftKinds.append(driftEngine)
    }
    if line.fallbackReason != nil {
        driftKinds.append(driftHeightMetric)
    }
    return driftKinds
}

private func collectDriftKinds(
    paragraph: NativePreparedParagraph,
    corpus: NativePreparedCorpus,
    request: NativeLayoutRequest,
    lineLayouts: [NativeLineLayout],
    boundaryMap: ParagraphBoundaryMap
) -> [String] {
    var driftKinds: [String] = []
    func appendDrift(_ driftKind: String) {
        if !driftKinds.contains(driftKind) {
            driftKinds.append(driftKind)
        }
    }

    if lineLayouts.contains(where: { $0.layoutEngine != layoutEngineIosCoreText || $0.fallbackReason != nil }) {
        appendDrift(driftEngine)
    }
    if lineLayouts.contains(where: { $0.fallbackReason != nil }) {
        appendDrift(driftHeightMetric)
    }
    if request.whiteSpace != whiteSpaceNormal
        || request.wordBreak != wordBreakNormal
        || !request.shapeSlices.isEmpty
        || !paragraph.atomicSpans.isEmpty {
        appendDrift(driftAlgorithmRule)
        appendDrift(driftLineBreakStrategy)
    }
    if !corpus.baseStyle.includeFontPadding {
        appendDrift(driftPadding)
    }
    if paragraph.runs.contains(where: { !$0.style.locale.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) {
        appendDrift(driftLocaleMetric)
    }
    if containsPotentialFallbackGlyph(paragraph.text) {
        appendDrift(driftFallbackFont)
    }
    if containsEmoji(paragraph.text) {
        appendDrift(driftEmojiMetric)
    }
    if !boundaryMap.clusterViolationOffsets.isEmpty {
        appendDrift(driftClusterBoundary)
    }
    return driftKinds
}

private func containsPotentialFallbackGlyph(_ text: NSString) -> Bool {
    (text as String).unicodeScalars.contains { scalar in
        scalar.value > 0x02AF
    }
}

private func containsEmoji(_ text: NSString) -> Bool {
    (text as String).unicodeScalars.contains { scalar in
        let value = scalar.value
        return (0x1F000...0x1FAFF).contains(value)
            || (0x2600...0x27BF).contains(value)
            || value == 0xFE0F
    }
}

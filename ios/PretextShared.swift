import Foundation

internal final class PretextShared {
    static let shared = PretextShared()

    private let preparedCorporaLock = NSLock()
    private var nextPreparedCorpusId: Int64 = 1
    private var preparedCorpora: [Int64: NativePreparedCorpus] = [:]

    private init() {}

    func prepareParagraphsWithStats(
        texts: [String],
        style: ParagraphStyle
    ) -> PreparedParagraphResult {
        let baseStyle = defaultTextStyle(from: style)
        let analyzedParagraphs = texts.map { text in
            let textUnits = text.utf16.count
            return NativePreparedParagraphSeed(
                text: text,
                tokens: tokenize(text, style: baseStyle),
                breakUnits: tokenizeBreakUnits(text, style: baseStyle),
                runs: textUnits > 0
                    ? [NativeTextRun(startUTF16: 0, endUTF16: textUnits, style: baseStyle)]
                    : [],
                atomicSpans: [],
                inlineBoxes: [],
                textUnits: textUnits,
                forceTokenLayout: false
            )
        }
        return prepareParagraphSeedsWithStats(analyzedParagraphs, style: style)
    }

    func prepareInlineParagraphsWithStats(
        paragraphs: [[InlineSegment]],
        style: ParagraphStyle
    ) -> PreparedParagraphResult {
        let baseStyle = defaultTextStyle(from: style)
        let analyzedParagraphs = paragraphs.map { paragraph in
            prepareInlineParagraphSeed(paragraph, baseStyle: baseStyle)
        }
        return prepareParagraphSeedsWithStats(analyzedParagraphs, style: style)
    }

    private func prepareParagraphSeedsWithStats(
        _ analyzedParagraphs: [NativePreparedParagraphSeed],
        style: ParagraphStyle
    ) -> PreparedParagraphResult {
        let prepareStartedAt = nowMs()
        let baseTextStyle = defaultTextStyle(from: style)
        let baseFont = resolveFont(style: baseTextStyle)
        let lineHeight = resolvedLineHeightValue(baseTextStyle.lineHeight, font: baseFont)

        let analyzeStartedAt = nowMs()
        let totalTokenCount = analyzedParagraphs.reduce(0) { partialResult, paragraph in
            partialResult + paragraph.textUnits
        }
        let analyzeMs = nowMs() - analyzeStartedAt

        let measurementStartedAt = nowMs()
        var measurementCache: [String: NativeTokenMetrics] = [:]
        let paragraphs = analyzedParagraphs.map { paragraph in
            let attributedText = buildAttributedText(
                text: paragraph.text,
                runs: paragraph.runs,
                inlineBoxes: paragraph.inlineBoxes
            )
            return NativePreparedParagraph(
                text: paragraph.text,
                attributedText: attributedText,
                typesetter: paragraph.forceTokenLayout ? nil : createTypesetter(attributedText: attributedText),
                tokens: paragraph.tokens.map { token in
                    prepareMeasuredToken(token, cache: &measurementCache)
                },
                breakUnits: paragraph.breakUnits.map { token in
                    prepareMeasuredToken(token, cache: &measurementCache)
                },
                runs: paragraph.runs,
                atomicSpans: paragraph.atomicSpans,
                inlineBoxes: paragraph.inlineBoxes,
                forceTokenLayout: paragraph.forceTokenLayout
            )
        }
        let measurementMs = nowMs() - measurementStartedAt

        let buildPreparedStartedAt = nowMs()
        let prepared = NativePreparedCorpus(
            paragraphs: paragraphs,
            baseStyle: baseTextStyle,
            lineHeight: lineHeight
        )
        let buildPreparedMs = nowMs() - buildPreparedStartedAt
        let id = storePreparedCorpus(prepared)

        let preparedState = PreparedParagraphState(
            id: Double(id),
            paragraphCount: Double(prepared.paragraphs.count)
        )
        let stats = PrepareParagraphStats(
            tokenizeMs: analyzeMs,
            measurementMs: measurementMs,
            buildPreparedMs: buildPreparedMs,
            totalMs: nowMs() - prepareStartedAt,
            paragraphCount: Double(prepared.paragraphs.count),
            totalTokenCount: Double(totalTokenCount),
            uniqueTokenCount: Double(measurementCache.count)
        )

        return PreparedParagraphResult(
            prepared: preparedState,
            stats: stats
        )
    }

    func layoutParagraphsMetadata(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraphMetrics] {
        try layoutParagraphsMetadata(preparedId: preparedId, request: normalizeLayoutRequest(request))
    }

    func layoutParagraphLines(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraphLines] {
        try layoutParagraphLines(preparedId: preparedId, request: normalizeLayoutRequest(request))
    }

    func layoutParagraphLinesWithDiagnostics(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraphLinesWithDiagnostics] {
        try layoutParagraphLinesWithDiagnostics(
            preparedId: preparedId,
            request: normalizeLayoutRequest(request)
        )
    }

    func layoutRichParagraphLines(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutRichParagraphLines] {
        try layoutRichParagraphLines(
            preparedId: preparedId,
            request: normalizeLayoutRequest(request)
        )
    }

    func releaseParagraphs(preparedId: Double) {
        preparedCorporaLock.lock()
        preparedCorpora.removeValue(forKey: Int64(preparedId))
        preparedCorporaLock.unlock()
    }

    private func layoutParagraphsMetadata(
        preparedId: Double,
        request: NativeLayoutRequest
    ) throws -> [LaidOutParagraphMetrics] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)
        let paragraphLineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: request
        )

        return prepared.paragraphs.enumerated().map { index, _ in
            let lineLayouts = paragraphLineLayouts[index]
            return LaidOutParagraphMetrics(
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: lineLayouts.map(\.width).max() ?? 0
            )
        }
    }

    private func layoutParagraphLines(
        preparedId: Double,
        request: NativeLayoutRequest
    ) throws -> [LaidOutParagraphLines] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)
        let paragraphLineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: request
        )

        return prepared.paragraphs.enumerated().map { index, _ in
            let lineLayouts = paragraphLineLayouts[index]
            return LaidOutParagraphLines(
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: lineLayouts.map(\.width).max() ?? 0,
                lines: buildParagraphLineRanges(lineLayouts: lineLayouts)
            )
        }
    }

    private func layoutParagraphLinesWithDiagnostics(
        preparedId: Double,
        request: NativeLayoutRequest
    ) throws -> [LaidOutParagraphLinesWithDiagnostics] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)
        let paragraphLineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: request
        )

        return prepared.paragraphs.enumerated().map { index, paragraph in
            let lineLayouts = paragraphLineLayouts[index]
            return LaidOutParagraphLinesWithDiagnostics(
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: lineLayouts.map(\.width).max() ?? 0,
                lines: buildParagraphLineRanges(lineLayouts: lineLayouts),
                diagnostics: buildParagraphLayoutDiagnostics(
                    paragraph: paragraph,
                    corpus: prepared,
                    request: request,
                    lineLayouts: lineLayouts
                )
            )
        }
    }

    private func layoutRichParagraphLines(
        preparedId: Double,
        request: NativeLayoutRequest
    ) throws -> [LaidOutRichParagraphLines] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)
        let paragraphLineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: request
        )

        return prepared.paragraphs.enumerated().map { index, paragraph in
            let lineLayouts = paragraphLineLayouts[index]
            return LaidOutRichParagraphLines(
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: lineLayouts.map(\.width).max() ?? 0,
                lines: buildParagraphLineRanges(lineLayouts: lineLayouts),
                boxFrames: buildInlineBoxFrames(
                    paragraphIndex: index,
                    paragraph: paragraph,
                    corpus: prepared,
                    lineLayouts: lineLayouts
                ),
                diagnostics: buildParagraphLayoutDiagnostics(
                    paragraph: paragraph,
                    corpus: prepared,
                    request: request,
                    lineLayouts: lineLayouts
                )
            )
        }
    }

    private func requirePreparedCorpus(preparedId: Double) throws -> NativePreparedCorpus {
        let handle = Int64(preparedId)
        preparedCorporaLock.lock()
        let prepared = preparedCorpora[handle]
        preparedCorporaLock.unlock()

        guard let prepared = prepared else {
            throw NSError(
                domain: "Pretext",
                code: 404,
                userInfo: [NSLocalizedDescriptionKey: "Prepared benchmark corpus \(handle) not found."]
            )
        }
        return prepared
    }

    private func storePreparedCorpus(_ prepared: NativePreparedCorpus) -> Int64 {
        preparedCorporaLock.lock()
        let id = nextPreparedCorpusId
        nextPreparedCorpusId += 1
        preparedCorpora[id] = prepared
        preparedCorporaLock.unlock()
        return id
    }

    private func nowMs() -> Double {
        ProcessInfo.processInfo.systemUptime * 1000
    }
}

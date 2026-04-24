import CoreText
import Foundation

internal let newlineToken = "\n"
internal let whiteSpaceNormal = "normal"
internal let whiteSpacePre = "pre"
internal let wordBreakNormal = "normal"
internal let wordBreakBreakAll = "break-all"
internal let breakBehaviorNever = "never"
internal let inlineSegmentKindBox = "box"
internal let layoutEngineIosCoreText = "ios_core_text"
internal let layoutEngineIosManualTokenFallback = "ios_manual_token_fallback"
internal let fallbackReasonManualHeightEstimate = "manual_height_estimate"
internal let heightMetricSourcePlatformTextEngineMetrics = "platform_text_engine_metrics"
internal let ruleLayerPretextNative = "pretext_native_rules"
internal let breakKindHard = "hard_break"
internal let breakKindNativeSoft = "native_soft_break"
internal let driftAlgorithmRule = "algorithm_rule_drift"
internal let driftClusterBoundary = "cluster_boundary_drift"
internal let driftEmojiMetric = "emoji_metric_drift"
internal let driftEngine = "engine_drift"
internal let driftFallbackFont = "fallback_font_drift"
internal let driftHeightMetric = "height_metric_drift"
internal let driftLineBreakStrategy = "line_break_strategy_drift"
internal let driftLocaleMetric = "locale_metric_drift"
internal let driftPadding = "padding_drift"
internal let heightMetricDrivers = [
    "font_metrics",
    "explicit_line_height",
    "fallback_font",
    "emoji_fallback",
    "locale",
    "include_font_padding",
    "line_break_strategy",
]
private let zeroWidthJoiner: UInt32 = 0x200D

private func isCombiningMark(_ scalar: UnicodeScalar) -> Bool {
    CharacterSet.nonBaseCharacters.contains(scalar)
}

private func isVariationSelector(_ scalar: UnicodeScalar) -> Bool {
    (0xFE00...0xFE0F).contains(scalar.value) || (0xE0100...0xE01EF).contains(scalar.value)
}

private func isEmojiModifier(_ scalar: UnicodeScalar) -> Bool {
    (0x1F3FB...0x1F3FF).contains(scalar.value)
}

private func isRegionalIndicator(_ scalar: UnicodeScalar) -> Bool {
    (0x1F1E6...0x1F1FF).contains(scalar.value)
}

private func isIndicVirama(_ scalar: UnicodeScalar) -> Bool {
    [
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
    ].contains(scalar.value)
}

private func isRtlScalar(_ scalar: UnicodeScalar) -> Bool {
    (0x0590...0x08FF).contains(scalar.value)
        || (0xFB1D...0xFDFF).contains(scalar.value)
        || (0xFE70...0xFEFF).contains(scalar.value)
}

private func isLtrScalar(_ scalar: UnicodeScalar) -> Bool {
    CharacterSet.letters.contains(scalar)
}

internal struct NativeTokenDescriptor {
    let text: String
    let startUTF16: Int
    let endUTF16: Int
    let style: NativeTextStyle
    let inlineBox: NativeInlineBox?

    init(
        text: String,
        startUTF16: Int,
        endUTF16: Int,
        style: NativeTextStyle,
        inlineBox: NativeInlineBox? = nil
    ) {
        self.text = text
        self.startUTF16 = startUTF16
        self.endUTF16 = endUTF16
        self.style = style
        self.inlineBox = inlineBox
    }
}

internal struct NativePreparedToken {
    let text: String
    let startUTF16: Int
    let endUTF16: Int
    let width: Double
    let lineHeight: Double
    let ascent: Double
    let descent: Double
}

internal struct NativePreparedParagraphSeed {
    let text: String
    let tokens: [NativeTokenDescriptor]
    let breakUnits: [NativeTokenDescriptor]
    let runs: [NativeTextRun]
    let atomicSpans: [NativeAtomicSpan]
    let inlineBoxes: [NativeInlineBox]
    let textUnits: Int
    let forceTokenLayout: Bool
}

internal final class NativePreparedParagraph {
    let text: NSString
    let attributedText: NSAttributedString
    let typesetter: CTTypesetter?
    let tokens: [NativePreparedToken]
    let breakUnits: [NativePreparedToken]
    let runs: [NativeTextRun]
    let atomicSpans: [NativeAtomicSpan]
    let inlineBoxes: [NativeInlineBox]
    let forceTokenLayout: Bool

    init(
        text: String,
        attributedText: NSAttributedString,
        typesetter: CTTypesetter?,
        tokens: [NativePreparedToken],
        breakUnits: [NativePreparedToken],
        runs: [NativeTextRun],
        atomicSpans: [NativeAtomicSpan],
        inlineBoxes: [NativeInlineBox],
        forceTokenLayout: Bool
    ) {
        self.text = text as NSString
        self.attributedText = attributedText
        self.typesetter = typesetter
        self.tokens = tokens
        self.breakUnits = breakUnits
        self.runs = runs
        self.atomicSpans = atomicSpans
        self.inlineBoxes = inlineBoxes
        self.forceTokenLayout = forceTokenLayout
    }
}

internal struct NativeAtomicSpan {
    let startUTF16: Int
    let endUTF16: Int
    let source: String
}

internal struct NativeInlineBox {
    let boxId: String
    let startUTF16: Int
    let endUTF16: Int
    let width: Double
    let height: Double
    let baseline: Double
    let breakBehavior: String
    let accessibilityLabel: String?
    let accessibilityHint: String?
    let accessibilityRole: String?
}

internal final class NativePreparedCorpus {
    let paragraphs: [NativePreparedParagraph]
    let baseStyle: NativeTextStyle
    let lineHeight: Double

    private let layoutCacheLimit = 12
    private let layoutCacheLock = NSLock()
    private var layoutCache: [NativeLayoutRequest: [[NativeLineLayout]]] = [:]
    private var layoutCacheOrder: [NativeLayoutRequest] = []

    init(
        paragraphs: [NativePreparedParagraph],
        baseStyle: NativeTextStyle,
        lineHeight: Double
    ) {
        self.paragraphs = paragraphs
        self.baseStyle = baseStyle
        self.lineHeight = lineHeight
    }

    func resolveLineLayouts(
        request: NativeLayoutRequest,
        builder: () -> [[NativeLineLayout]]
    ) -> [[NativeLineLayout]] {
        layoutCacheLock.lock()
        if let cached = layoutCache[request] {
            layoutCacheOrder.removeAll(where: { $0 == request })
            layoutCacheOrder.append(request)
            layoutCacheLock.unlock()
            return cached
        }
        layoutCacheLock.unlock()

        let computed = builder()

        layoutCacheLock.lock()
        if let cached = layoutCache[request] {
            layoutCacheLock.unlock()
            return cached
        }

        layoutCache[request] = computed
        layoutCacheOrder.removeAll(where: { $0 == request })
        layoutCacheOrder.append(request)

        while layoutCacheOrder.count > layoutCacheLimit {
            let evictedRequest = layoutCacheOrder.removeFirst()
            layoutCache.removeValue(forKey: evictedRequest)
        }
        layoutCacheLock.unlock()

        return computed
    }
}

internal struct NativeLineLayout {
    let textStartUTF16: Int
    let textEndUTF16: Int
    let width: Double
    let left: Double
    let top: Double
    let height: Double
    let ascent: Double
    let descent: Double
    let layoutEngine: String
    let fallbackReason: String?
    let ctLine: CTLine?

    init(
        textStartUTF16: Int,
        textEndUTF16: Int,
        width: Double,
        left: Double,
        top: Double,
        height: Double,
        ascent: Double,
        descent: Double,
        layoutEngine: String = layoutEngineIosManualTokenFallback,
        fallbackReason: String? = fallbackReasonManualHeightEstimate,
        ctLine: CTLine? = nil
    ) {
        self.textStartUTF16 = textStartUTF16
        self.textEndUTF16 = textEndUTF16
        self.width = width
        self.left = left
        self.top = top
        self.height = height
        self.ascent = ascent
        self.descent = descent
        self.layoutEngine = layoutEngine
        self.fallbackReason = fallbackReason
        self.ctLine = ctLine
    }
}

internal enum TokenMode {
    case whitespace
    case text
}

internal struct NativeLayoutRequest: Hashable {
    let width: Double
    let left: Double
    let whiteSpace: String
    let wordBreak: String
    let shapeSlices: [NativeShapeSlice]
}

internal struct NativeShapeSlice: Hashable {
    let top: Double
    let height: Double
    let left: Double
    let width: Double
}

internal struct NativeLineConstraint {
    let left: Double
    let width: Double
}

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

    private func prepareInlineParagraphSeed(
        _ paragraph: [InlineSegment],
        baseStyle: NativeTextStyle
    ) -> NativePreparedParagraphSeed {
        var text = ""
        var tokens: [NativeTokenDescriptor] = []
        var breakUnits: [NativeTokenDescriptor] = []
        var runs: [NativeTextRun] = []
        var atomicSpans: [NativeAtomicSpan] = []
        var inlineBoxes: [NativeInlineBox] = []
        var forceTokenLayout = false

        for segment in paragraph {
            let baseOffset = (text as NSString).length
            let breakBehavior = segment.breakBehavior.lowercased()
            if segment.kind?.lowercased() == inlineSegmentKindBox || segment.boxId != nil {
                let box = buildInlineBox(segment: segment, startUTF16: baseOffset)
                text += objectReplacementCharacter
                runs.append(
                    NativeTextRun(
                        startUTF16: box.startUTF16,
                        endUTF16: box.endUTF16,
                        style: baseStyle
                    )
                )
                inlineBoxes.append(box)
                atomicSpans.append(
                    NativeAtomicSpan(
                        startUTF16: box.startUTF16,
                        endUTF16: box.endUTF16,
                        source: "inline_box"
                    )
                )
                tokens.append(
                    NativeTokenDescriptor(
                        text: objectReplacementCharacter,
                        startUTF16: box.startUTF16,
                        endUTF16: box.endUTF16,
                        style: baseStyle,
                        inlineBox: box
                    )
                )
                breakUnits.append(
                    NativeTokenDescriptor(
                        text: objectReplacementCharacter,
                        startUTF16: box.startUTF16,
                        endUTF16: box.endUTF16,
                        style: baseStyle,
                        inlineBox: box
                    )
                )
                continue
            }
            let resolvedStyle = resolveTextStyle(segment: segment, baseStyle: baseStyle)
            text += segment.text
            let endOffset = (text as NSString).length
            if endOffset > baseOffset {
                runs.append(
                    NativeTextRun(
                        startUTF16: baseOffset,
                        endUTF16: endOffset,
                        style: resolvedStyle
                    )
                )
            }
            forceTokenLayout = forceTokenLayout || breakBehavior == breakBehaviorNever
            if breakBehavior == breakBehaviorNever && endOffset > baseOffset {
                atomicSpans.append(
                    NativeAtomicSpan(
                        startUTF16: baseOffset,
                        endUTF16: endOffset,
                        source: "inline_break_never"
                    )
                )
            }
            appendInlineSegment(
                segment,
                resolvedStyle: resolvedStyle,
                tokens: &tokens,
                breakUnits: &breakUnits
            )
        }

        return NativePreparedParagraphSeed(
            text: text,
            tokens: tokens,
            breakUnits: breakUnits,
            runs: mergeAdjacentRuns(runs),
            atomicSpans: atomicSpans,
            inlineBoxes: inlineBoxes,
            textUnits: text.utf16.count,
            forceTokenLayout: forceTokenLayout
        )
    }

    private func buildInlineBox(segment: InlineSegment, startUTF16: Int) -> NativeInlineBox {
        let width = max(0, segment.width ?? 0)
        let height = max(0, segment.height ?? 0)
        let baseline = min(max(0, segment.baseline ?? height), height)
        return NativeInlineBox(
            boxId: segment.boxId ?? "inline-box-\(startUTF16)",
            startUTF16: startUTF16,
            endUTF16: startUTF16 + (objectReplacementCharacter as NSString).length,
            width: width,
            height: height,
            baseline: baseline,
            breakBehavior: segment.breakBehavior.lowercased(),
            accessibilityLabel: segment.accessibilityLabel,
            accessibilityHint: segment.accessibilityHint,
            accessibilityRole: segment.accessibilityRole
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

    private func createTypesetter(
        attributedText: NSAttributedString
    ) -> CTTypesetter {
        return CTTypesetterCreateWithAttributedString(attributedText)
    }

    private func prepareMeasuredToken(
        _ token: NativeTokenDescriptor,
        cache: inout [String: NativeTokenMetrics]
    ) -> NativePreparedToken {
        if let box = token.inlineBox {
            return NativePreparedToken(
                text: token.text,
                startUTF16: token.startUTF16,
                endUTF16: token.endUTF16,
                width: box.width,
                lineHeight: box.height,
                ascent: -box.baseline,
                descent: max(0, box.height - box.baseline)
            )
        }

        if token.text == newlineToken {
            return NativePreparedToken(
                text: token.text,
                startUTF16: token.startUTF16,
                endUTF16: token.endUTF16,
                width: 0,
                lineHeight: 0,
                ascent: 0,
                descent: 0
            )
        }

        let cacheKey = measurementCacheKey(text: token.text, style: token.style)
        let metrics: NativeTokenMetrics
        if let cached = cache[cacheKey] {
            metrics = cached
        } else {
            let measured = measureToken(token.text, style: token.style)
            cache[cacheKey] = measured
            metrics = measured
        }

        return NativePreparedToken(
            text: token.text,
            startUTF16: token.startUTF16,
            endUTF16: token.endUTF16,
            width: metrics.width,
            lineHeight: metrics.lineHeight,
            ascent: metrics.ascent,
            descent: metrics.descent
        )
    }

    private func measurementCacheKey(
        text: String,
        style: NativeTextStyle
    ) -> String {
        [
            text,
            style.fontFamily,
            String(style.fontSize),
            String(style.lineHeight),
            String(style.letterSpacing),
            style.locale,
            style.fontWeight,
            style.fontStyle,
            String(style.includeFontPadding),
            style.textDirection.stringValue
        ].joined(separator: "\u{1F}")
    }

    private func mergeAdjacentRuns(_ runs: [NativeTextRun]) -> [NativeTextRun] {
        guard let first = runs.first else {
            return []
        }

        var merged: [NativeTextRun] = [first]
        for run in runs.dropFirst() {
            let lastIndex = merged.count - 1
            if merged[lastIndex].style == run.style && merged[lastIndex].endUTF16 == run.startUTF16 {
                merged[lastIndex] = NativeTextRun(
                    startUTF16: merged[lastIndex].startUTF16,
                    endUTF16: run.endUTF16,
                    style: run.style
                )
            } else {
                merged.append(run)
            }
        }
        return merged
    }

    private func buildParagraphLineRanges(
        lineLayouts: [NativeLineLayout]
    ) -> [ParagraphLineRange] {
        lineLayouts.map { line in
            ParagraphLineRange(
                textStart: Double(line.textStartUTF16),
                textEnd: Double(line.textEndUTF16),
                top: line.top,
                left: line.left,
                width: line.width,
                height: line.height,
                ascent: line.ascent,
                descent: line.descent
            )
        }
    }

    private func buildInlineBoxFrames(
        paragraphIndex: Int,
        paragraph: NativePreparedParagraph,
        corpus: NativePreparedCorpus,
        lineLayouts: [NativeLineLayout]
    ) -> [InlineBoxFrame] {
        guard !paragraph.inlineBoxes.isEmpty else {
            return []
        }

        return paragraph.inlineBoxes.compactMap { box in
            guard let lineIndex = lineLayouts.firstIndex(where: { line in
                box.startUTF16 >= line.textStartUTF16 && box.endUTF16 <= line.textEndUTF16
            }) else {
                return nil
            }

            let line = lineLayouts[lineIndex]
            let actualHeight = max(0, line.descent - line.ascent)
            let centerOffset = max(0, (line.height - actualHeight) / 2)
            let baseline = line.top + centerOffset - line.ascent
            let visualRange = resolveVisualRangeForTextRange(
                paragraph: paragraph,
                corpus: corpus,
                line: line,
                startUTF16: box.startUTF16,
                endUTF16: box.endUTF16
            )

            return InlineBoxFrame(
                boxId: box.boxId,
                paragraphIndex: Double(paragraphIndex),
                lineIndex: Double(lineIndex),
                textStart: Double(box.startUTF16),
                textEnd: Double(box.endUTF16),
                left: line.left + visualRange.left,
                top: baseline - box.baseline,
                width: box.width,
                height: box.height,
                baseline: baseline,
                accessibilityLabel: box.accessibilityLabel,
                accessibilityHint: box.accessibilityHint,
                accessibilityRole: box.accessibilityRole
            )
        }
    }

    private func measureParagraphAdvance(
        paragraph: NativePreparedParagraph,
        startUTF16: Int,
        endUTF16: Int
    ) -> Double {
        guard endUTF16 > startUTF16 else {
            return 0
        }

        let sortedBoxes = paragraph.inlineBoxes.sorted { $0.startUTF16 < $1.startUTF16 }
        let sortedRuns = paragraph.runs.sorted { $0.startUTF16 < $1.startUTF16 }
        var cursor = startUTF16
        var width = 0.0

        while cursor < endUTF16 {
            if let box = sortedBoxes.first(where: { $0.startUTF16 == cursor }) {
                width += box.width
                cursor = min(endUTF16, box.endUTF16)
                continue
            }

            let nextBoxStart = sortedBoxes.first(where: { $0.startUTF16 > cursor })?.startUTF16 ?? endUTF16
            let run = sortedRuns.first(where: { $0.startUTF16 <= cursor && $0.endUTF16 > cursor })
            let segmentEnd = min(endUTF16, nextBoxStart, run?.endUTF16 ?? endUTF16)
            guard segmentEnd > cursor else {
                break
            }
            let substring = paragraph.text.substring(
                with: NSRange(location: cursor, length: segmentEnd - cursor)
            )
            if let style = run?.style {
                width += measureToken(substring, style: style).width
            }
            cursor = segmentEnd
        }

        return width
    }

    private func resolveVisualRangeForTextRange(
        paragraph: NativePreparedParagraph,
        corpus: NativePreparedCorpus,
        line: NativeLineLayout,
        startUTF16: Int,
        endUTF16: Int
    ) -> (left: Double, width: Double) {
        if let ctLine = line.ctLine {
            let startX = Double(CTLineGetOffsetForStringIndex(ctLine, startUTF16, nil))
            let endX = Double(CTLineGetOffsetForStringIndex(ctLine, endUTF16, nil))
            if startX.isFinite, endX.isFinite {
                let left = min(startX, endX)
                let right = max(startX, endX)
                return (left, max(1, right - left))
            }
        }

        if let fallbackRange = resolveVisualRangeWithCoreTextLine(
            paragraph: paragraph,
            line: line,
            startUTF16: startUTF16,
            endUTF16: endUTF16
        ) {
            return fallbackRange
        }

        if isRtlLine(
            paragraph: paragraph,
            line: line,
            textDirection: corpus.baseStyle.textDirection,
            textLocale: corpus.baseStyle.locale
        ) {
            let endX = measureParagraphAdvance(
                paragraph: paragraph,
                startUTF16: line.textStartUTF16,
                endUTF16: endUTF16
            )
            let startX = measureParagraphAdvance(
                paragraph: paragraph,
                startUTF16: line.textStartUTF16,
                endUTF16: startUTF16
            )
            let left = max(0, line.width - max(startX, endX))
            return (left, max(1, abs(endX - startX)))
        }

        let startX = measureParagraphAdvance(
            paragraph: paragraph,
            startUTF16: line.textStartUTF16,
            endUTF16: startUTF16
        )
        let endX = measureParagraphAdvance(
            paragraph: paragraph,
            startUTF16: line.textStartUTF16,
            endUTF16: endUTF16
        )
        let left = min(startX, endX)
        let right = max(startX, endX)
        return (left, max(1, right - left))
    }

    private func resolveVisualRangeWithCoreTextLine(
        paragraph: NativePreparedParagraph,
        line: NativeLineLayout,
        startUTF16: Int,
        endUTF16: Int
    ) -> (left: Double, width: Double)? {
        let lineLength = line.textEndUTF16 - line.textStartUTF16
        guard lineLength > 0 else {
            return nil
        }

        let attributedLine = paragraph.attributedText.attributedSubstring(
            from: NSRange(location: line.textStartUTF16, length: lineLength)
        )
        let ctLine = CTLineCreateWithAttributedString(attributedLine as CFAttributedString)
        let relativeStart = startUTF16 - line.textStartUTF16
        let relativeEnd = endUTF16 - line.textStartUTF16
        let startX = Double(CTLineGetOffsetForStringIndex(ctLine, relativeStart, nil))
        let endX = Double(CTLineGetOffsetForStringIndex(ctLine, relativeEnd, nil))
        guard startX.isFinite, endX.isFinite else {
            return nil
        }

        let left = min(startX, endX)
        let right = max(startX, endX)
        return (left, max(1, right - left))
    }

    private func isRtlLine(
        paragraph: NativePreparedParagraph,
        line: NativeLineLayout,
        textDirection: ParagraphTextDirection,
        textLocale: String
    ) -> Bool {
        let length = max(0, line.textEndUTF16 - line.textStartUTF16)
        guard length > 0 else {
            return textDirection == .rtl
        }

        let text = paragraph.text.substring(
            with: NSRange(location: line.textStartUTF16, length: length)
        )
        return isRtlText(text, textDirection: textDirection, textLocale: textLocale)
    }

    private func isRtlText(
        _ text: String,
        textDirection: ParagraphTextDirection,
        textLocale: String
    ) -> Bool {
        switch textDirection {
        case .ltr:
            return false
        case .rtl:
            return true
        case .auto:
            guard !text.isEmpty else {
                return false
            }
            for scalar in text.unicodeScalars {
                if isRtlScalar(scalar) {
                    return true
                }
                if isLtrScalar(scalar) {
                    return false
                }
            }
            return isRtlLocale(textLocale)
        }
    }

    private func buildParagraphLayoutDiagnostics(
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
                        source: "source_text"
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

    private func normalizeLayoutRequest(_ request: ParagraphLayoutRequest) -> NativeLayoutRequest {
        let shapeSlices = request.shapeSlices.map { slice in
            NativeShapeSlice(
                top: slice.top,
                height: max(0, slice.height),
                left: slice.left,
                width: max(1, slice.width)
            )
        }
        .sorted { left, right in
            left.top < right.top
        }

        return NativeLayoutRequest(
            width: max(1, request.width),
            left: request.left,
            whiteSpace: request.whiteSpace.lowercased(),
            wordBreak: request.wordBreak.lowercased(),
            shapeSlices: shapeSlices
        )
    }

    private func resolveParagraphLineLayouts(
        prepared: NativePreparedCorpus,
        request: NativeLayoutRequest
    ) -> [[NativeLineLayout]] {
        prepared.resolveLineLayouts(request: request) {
            prepared.paragraphs.map { paragraph in
                layoutLineLayouts(
                    paragraph,
                    lineHeight: prepared.lineHeight,
                    textDirection: prepared.baseStyle.textDirection,
                    textLocale: prepared.baseStyle.locale,
                    request: request
                )
            }
        }
    }

    private func resolveLineConstraint(
        request: NativeLayoutRequest,
        top: Double
    ) -> NativeLineConstraint {
        if let slice = request.shapeSlices.first(where: { top >= $0.top && top < $0.top + $0.height }) {
            return NativeLineConstraint(left: slice.left, width: slice.width)
        }

        return NativeLineConstraint(left: request.left, width: request.width)
    }

    private func resolveCoreTextLineLeft(
        constraint: NativeLineConstraint,
        lineWidth: Double,
        lineText: String,
        textDirection: ParagraphTextDirection,
        textLocale: String,
        line: CTLine
    ) -> Double {
        let flushFactor: CGFloat = isRtlText(
            lineText,
            textDirection: textDirection,
            textLocale: textLocale
        ) ? 1 : 0
        let penOffset = Double(CTLineGetPenOffsetForFlush(line, flushFactor, constraint.width))
        if penOffset.isFinite {
            return constraint.left + penOffset
        }

        return resolveFallbackLineLeft(
            constraint: constraint,
            lineWidth: lineWidth,
            lineText: lineText,
            textDirection: textDirection,
            textLocale: textLocale
        )
    }

    private func resolveFallbackLineLeft(
        constraint: NativeLineConstraint,
        lineWidth: Double,
        lineText: String,
        textDirection: ParagraphTextDirection,
        textLocale: String
    ) -> Double {
        guard isRtlText(lineText, textDirection: textDirection, textLocale: textLocale) else {
            return constraint.left
        }

        return constraint.left + max(0, constraint.width - max(0, lineWidth))
    }

    private func layoutLineLayouts(
        _ prepared: NativePreparedParagraph,
        lineHeight: Double,
        textDirection: ParagraphTextDirection,
        textLocale: String,
        request: NativeLayoutRequest
    ) -> [NativeLineLayout] {
        guard let typesetter = prepared.typesetter, !prepared.forceTokenLayout else {
            if request.whiteSpace == whiteSpacePre {
                return layoutPreformattedLineLayoutsFallback(
                    prepared.breakUnits,
                    lineHeight: lineHeight,
                    textDirection: textDirection,
                    textLocale: textLocale,
                    request: request
                )
            }

            let tokens = request.wordBreak == wordBreakBreakAll ? prepared.breakUnits : prepared.tokens
            return layoutLineLayoutsFallback(
                tokens,
                lineHeight: lineHeight,
                textDirection: textDirection,
                textLocale: textLocale,
                request: request
            )
        }

        var lines: [NativeLineLayout] = []
        var start = 0
        var top = 0.0
        let length = prepared.text.length

        func appendEmptyLine(at position: Int) {
            let constraint = resolveLineConstraint(request: request, top: top)
            lines.append(
                NativeLineLayout(
                    textStartUTF16: position,
                    textEndUTF16: position,
                    width: 0,
                    left: resolveFallbackLineLeft(
                        constraint: constraint,
                        lineWidth: 0,
                        lineText: "",
                        textDirection: textDirection,
                        textLocale: textLocale
                    ),
                    top: top,
                    height: lineHeight,
                    ascent: 0,
                    descent: lineHeight,
                    layoutEngine: layoutEngineIosCoreText,
                    fallbackReason: nil
                )
            )
            top += lineHeight
        }

        while start < length {
            let constraint = resolveLineConstraint(request: request, top: top)

            if prepared.text.character(at: start) == 0x0A {
                appendEmptyLine(at: start)
                start += 1
                if start == length {
                    appendEmptyLine(at: start)
                }
                continue
            }

            let nextNewline = prepared.text.range(
                of: newlineToken,
                options: [],
                range: NSRange(location: start, length: length - start)
            )
            let newlineLocation = nextNewline.location == NSNotFound ? length : nextNewline.location

            var count = newlineLocation - start
            if request.whiteSpace != whiteSpacePre {
                let suggestedCount: Int
                if request.wordBreak == wordBreakBreakAll {
                    suggestedCount = CTTypesetterSuggestClusterBreak(typesetter, start, constraint.width)
                } else {
                    suggestedCount = CTTypesetterSuggestLineBreak(typesetter, start, constraint.width)
                }
                count = min(suggestedCount, newlineLocation - start)
            }

            if count <= 0 {
                let characterRange = prepared.text.rangeOfComposedCharacterSequence(at: start)
                count = max(1, characterRange.length)
            }

            let lineRange = CFRange(location: start, length: count)
            let line = CTTypesetterCreateLine(typesetter, lineRange)
            var ascent: CGFloat = 0
            var descent: CGFloat = 0
            var leading: CGFloat = 0
            let typographicWidth = CTLineGetTypographicBounds(line, &ascent, &descent, &leading)
            let lineText = prepared.text.substring(
                with: NSRange(location: start, length: count)
            )
            let actualHeight = max(0, Double(ascent + descent + leading))
            let normalizedAscent = -max(0, Double(ascent))
            let normalizedDescent = max(0, Double(descent))
            let lineHeightFloor = max(
                lineHeight,
                maxRequestedLineHeight(
                    runs: prepared.runs,
                    inlineBoxes: prepared.inlineBoxes,
                    defaultLineHeight: lineHeight,
                    startUTF16: start,
                    endUTF16: start + count
                )
            )
            let effectiveLineHeight = max(lineHeightFloor, actualHeight)

            lines.append(
                NativeLineLayout(
                    textStartUTF16: start,
                    textEndUTF16: start + count,
                    width: typographicWidth,
                    left: resolveCoreTextLineLeft(
                        constraint: constraint,
                        lineWidth: typographicWidth,
                        lineText: lineText,
                        textDirection: textDirection,
                        textLocale: textLocale,
                        line: line
                    ),
                    top: top,
                    height: effectiveLineHeight,
                    ascent: normalizedAscent,
                    descent: normalizedDescent,
                    layoutEngine: layoutEngineIosCoreText,
                    fallbackReason: nil,
                    ctLine: line
                )
            )

            top += effectiveLineHeight
            start += count
            if start < length && prepared.text.character(at: start) == 0x0A {
                start += 1
                if start == length {
                    appendEmptyLine(at: start)
                }
            }
        }

        if lines.isEmpty {
            let constraint = resolveLineConstraint(request: request, top: 0)
            return [
                NativeLineLayout(
                    textStartUTF16: 0,
                    textEndUTF16: 0,
                    width: 0,
                    left: resolveFallbackLineLeft(
                        constraint: constraint,
                        lineWidth: 0,
                        lineText: "",
                        textDirection: textDirection,
                        textLocale: textLocale
                    ),
                    top: 0,
                    height: lineHeight,
                    ascent: 0,
                    descent: lineHeight,
                    layoutEngine: layoutEngineIosCoreText,
                    fallbackReason: nil
                )
            ]
        }

        return lines
    }

    private func layoutPreformattedLineLayoutsFallback(
        _ tokens: [NativePreparedToken],
        lineHeight: Double,
        textDirection: ParagraphTextDirection,
        textLocale: String,
        request: NativeLayoutRequest
    ) -> [NativeLineLayout] {
        guard !tokens.isEmpty else {
            let constraint = resolveLineConstraint(request: request, top: 0)
            return [
                NativeLineLayout(
                    textStartUTF16: 0,
                    textEndUTF16: 0,
                    width: 0,
                    left: resolveFallbackLineLeft(
                        constraint: constraint,
                        lineWidth: 0,
                        lineText: "",
                        textDirection: textDirection,
                        textLocale: textLocale
                    ),
                    top: 0,
                    height: lineHeight,
                    ascent: 0,
                    descent: lineHeight
                )
            ]
        }

        var lines: [NativeLineLayout] = []
        var start = 0
        var top = 0.0

        while start < tokens.count {
            let constraint = resolveLineConstraint(request: request, top: top)
            var end = start
            while end < tokens.count && tokens[end].text != newlineToken {
                end += 1
            }

            if start == end {
                let position = tokens[start].startUTF16
                let metrics = fallbackLineMetrics(tokens, start: start, end: end, defaultLineHeight: lineHeight)
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: position,
                        textEndUTF16: position,
                        width: 0,
                        left: resolveFallbackLineLeft(
                            constraint: constraint,
                            lineWidth: 0,
                            lineText: "",
                            textDirection: textDirection,
                            textLocale: textLocale
                        ),
                        top: top,
                        height: metrics.lineHeight,
                        ascent: metrics.ascent,
                        descent: metrics.descent
                    )
                )
            } else {
                let metrics = fallbackLineMetrics(tokens, start: start, end: end, defaultLineHeight: lineHeight)
                let lineWidth = sumWidths(tokens, start: start, end: end)
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: tokens[start].startUTF16,
                        textEndUTF16: tokens[end - 1].endUTF16,
                        width: lineWidth,
                        left: resolveFallbackLineLeft(
                            constraint: constraint,
                            lineWidth: lineWidth,
                            lineText: lineTextFromTokens(tokens, start: start, end: end),
                            textDirection: textDirection,
                            textLocale: textLocale
                        ),
                        top: top,
                        height: metrics.lineHeight,
                        ascent: metrics.ascent,
                        descent: metrics.descent
                    )
                )
            }

            top += lines.last?.height ?? lineHeight
            if end == tokens.count - 1 && tokens[end].text == newlineToken {
                let newline = tokens[end]
                let trailingHeight = max(lineHeight, newline.lineHeight)
                let trailingConstraint = resolveLineConstraint(request: request, top: top)
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: newline.endUTF16,
                        textEndUTF16: newline.endUTF16,
                        width: 0,
                        left: resolveFallbackLineLeft(
                            constraint: trailingConstraint,
                            lineWidth: 0,
                            lineText: "",
                            textDirection: textDirection,
                            textLocale: textLocale
                        ),
                        top: top,
                        height: trailingHeight,
                        ascent: 0,
                        descent: trailingHeight
                    )
                )
                break
            }
            if end >= tokens.count {
                break
            }
            start = end + 1
        }

        return lines
    }

    private func layoutLineLayoutsFallback(
        _ tokens: [NativePreparedToken],
        lineHeight: Double,
        textDirection: ParagraphTextDirection,
        textLocale: String,
        request: NativeLayoutRequest
    ) -> [NativeLineLayout] {
        var lines: [NativeLineLayout] = []
        var cursor = 0
        var top = 0.0

        func appendEmptyFallbackLine(at position: Int, height: Double) {
            let constraint = resolveLineConstraint(request: request, top: top)
            lines.append(
                NativeLineLayout(
                    textStartUTF16: position,
                    textEndUTF16: position,
                    width: 0,
                    left: resolveFallbackLineLeft(
                        constraint: constraint,
                        lineWidth: 0,
                        lineText: "",
                        textDirection: textDirection,
                        textLocale: textLocale
                    ),
                    top: top,
                    height: height,
                    ascent: 0,
                    descent: height
                )
            )
            top += height
        }

        while cursor < tokens.count {
            let constraint = resolveLineConstraint(request: request, top: top)

            if tokens[cursor].text == newlineToken {
                let newline = tokens[cursor]
                let newlineHeight = max(lineHeight, newline.lineHeight)
                appendEmptyFallbackLine(at: newline.startUTF16, height: newlineHeight)
                cursor += 1
                if cursor == tokens.count {
                    appendEmptyFallbackLine(at: newline.endUTF16, height: newlineHeight)
                }
                continue
            }

            while cursor < tokens.count && isNonNewlineWhitespace(tokens[cursor].text) {
                cursor += 1
            }

            if cursor >= tokens.count {
                break
            }

            var end = cursor
            var currentWidth = 0.0
            var lastBreakAfter = -1
            var hitForcedBreak = false
            let breakAnywhere = request.wordBreak == wordBreakBreakAll

            while end < tokens.count {
                let token = tokens[end]

                if token.text == newlineToken {
                    hitForcedBreak = true
                    break
                }

                if currentWidth + token.width <= constraint.width || end == cursor {
                    currentWidth += token.width
                    end += 1
                    if breakAnywhere || isNonNewlineWhitespace(token.text) {
                        lastBreakAfter = end
                    }
                    continue
                }

                if lastBreakAfter > cursor {
                    end = lastBreakAfter
                }
                break
            }

            let trimmedEnd = trimTrailingWhitespaceEnd(tokens, start: cursor, end: end)
            if trimmedEnd == cursor {
                let fallback = tokens[cursor]
                let fallbackRange = fallback.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    ? fallback.startUTF16..<fallback.startUTF16
                    : fallback.startUTF16..<fallback.endUTF16
                let fallbackLineHeight = fallback.lineHeight > 0 ? max(lineHeight, fallback.lineHeight) : lineHeight
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: fallbackRange.lowerBound,
                        textEndUTF16: fallbackRange.upperBound,
                        width: fallback.width,
                        left: resolveFallbackLineLeft(
                            constraint: constraint,
                            lineWidth: fallback.width,
                            lineText: fallback.text,
                            textDirection: textDirection,
                            textLocale: textLocale
                        ),
                        top: top,
                        height: fallbackLineHeight,
                        ascent: fallback.ascent,
                        descent: max(fallback.descent, fallbackLineHeight + fallback.ascent)
                    )
                )
                top += fallbackLineHeight
                cursor += 1
            } else {
                let metrics = fallbackLineMetrics(tokens, start: cursor, end: trimmedEnd, defaultLineHeight: lineHeight)
                let lineWidth = sumWidths(tokens, start: cursor, end: trimmedEnd)
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: tokens[cursor].startUTF16,
                        textEndUTF16: tokens[trimmedEnd - 1].endUTF16,
                        width: lineWidth,
                        left: resolveFallbackLineLeft(
                            constraint: constraint,
                            lineWidth: lineWidth,
                            lineText: lineTextFromTokens(tokens, start: cursor, end: trimmedEnd),
                            textDirection: textDirection,
                            textLocale: textLocale
                        ),
                        top: top,
                        height: metrics.lineHeight,
                        ascent: metrics.ascent,
                        descent: metrics.descent
                    )
                )
                top += metrics.lineHeight
                cursor = end
            }

            if hitForcedBreak && cursor < tokens.count && tokens[cursor].text == newlineToken {
                let newline = tokens[cursor]
                cursor += 1
                if cursor == tokens.count {
                    appendEmptyFallbackLine(
                        at: newline.endUTF16,
                        height: max(lineHeight, newline.lineHeight)
                    )
                }
            }
        }

        if lines.isEmpty {
            let constraint = resolveLineConstraint(request: request, top: 0)
            return [
                NativeLineLayout(
                    textStartUTF16: 0,
                    textEndUTF16: 0,
                    width: 0,
                    left: resolveFallbackLineLeft(
                        constraint: constraint,
                        lineWidth: 0,
                        lineText: "",
                        textDirection: textDirection,
                        textLocale: textLocale
                    ),
                    top: 0,
                    height: lineHeight,
                    ascent: 0,
                    descent: lineHeight
                )
            ]
        }

        return lines
    }

    private func tokenize(
        _ text: String,
        style: NativeTextStyle
    ) -> [NativeTokenDescriptor] {
        var tokens: [NativeTokenDescriptor] = []
        var current = ""
        var currentStart = -1
        var currentEnd = -1
        var mode: TokenMode?
        let nsText = text as NSString
        var cursor = 0

        func flushCurrent() {
            guard !current.isEmpty, currentStart >= 0, currentEnd >= 0 else {
                return
            }

            tokens.append(
                NativeTokenDescriptor(
                    text: current,
                    startUTF16: currentStart,
                    endUTF16: currentEnd,
                    style: style
                )
            )
            current = ""
            currentStart = -1
            currentEnd = -1
        }

        while cursor < nsText.length {
            let range = nsText.rangeOfComposedCharacterSequence(at: cursor)
            let segment = nsText.substring(with: range)

            if segment == newlineToken {
                flushCurrent()
                mode = nil
                tokens.append(
                    NativeTokenDescriptor(
                        text: newlineToken,
                        startUTF16: range.location,
                        endUTF16: range.location + range.length,
                        style: style
                    )
                )
                cursor = range.location + range.length
                continue
            }

            let nextMode: TokenMode = segment.unicodeScalars.allSatisfy {
                CharacterSet.whitespacesAndNewlines.contains($0) && !isUnicodeNewline($0)
            } ? .whitespace : .text

            if mode == nextMode {
                current.append(segment)
                currentEnd = range.location + range.length
            } else {
                flushCurrent()
                mode = nextMode
                current = segment
                currentStart = range.location
                currentEnd = range.location + range.length
            }

            cursor = range.location + range.length
        }

        flushCurrent()
        return tokens
    }

    private func tokenizeBreakUnits(
        _ text: String,
        style: NativeTextStyle
    ) -> [NativeTokenDescriptor] {
        let nsText = text as NSString
        guard nsText.length > 0 else {
            return []
        }

        var tokens: [NativeTokenDescriptor] = []
        var cursor = 0
        while cursor < nsText.length {
            let range = nsText.rangeOfComposedCharacterSequence(at: cursor)
            tokens.append(
                NativeTokenDescriptor(
                    text: nsText.substring(with: range),
                    startUTF16: range.location,
                    endUTF16: range.location + range.length,
                    style: style
                )
            )
            cursor = range.location + range.length
        }
        return tokens
    }

    private func appendInlineSegment(
        _ segment: InlineSegment,
        resolvedStyle: NativeTextStyle,
        tokens: inout [NativeTokenDescriptor],
        breakUnits: inout [NativeTokenDescriptor]
    ) {
        let baseOffset = min(tokens.last?.endUTF16 ?? Int.max, breakUnits.last?.endUTF16 ?? Int.max)
        let resolvedBaseOffset = baseOffset == Int.max ? 0 : baseOffset

        if segment.breakBehavior.lowercased() == breakBehaviorNever {
            appendNeverBreakTokens(
                segment.text,
                baseOffset: resolvedBaseOffset,
                style: resolvedStyle,
                output: &tokens
            )
            appendNeverBreakTokens(
                segment.text,
                baseOffset: resolvedBaseOffset,
                style: resolvedStyle,
                output: &breakUnits
            )
            return
        }

        tokens += tokenize(segment.text, style: resolvedStyle).map { token in
            NativeTokenDescriptor(
                text: token.text,
                startUTF16: token.startUTF16 + resolvedBaseOffset,
                endUTF16: token.endUTF16 + resolvedBaseOffset,
                style: token.style
            )
        }
        breakUnits += tokenizeBreakUnits(segment.text, style: resolvedStyle).map { token in
            NativeTokenDescriptor(
                text: token.text,
                startUTF16: token.startUTF16 + resolvedBaseOffset,
                endUTF16: token.endUTF16 + resolvedBaseOffset,
                style: token.style
            )
        }
    }

    private func appendNeverBreakTokens(
        _ text: String,
        baseOffset: Int,
        style: NativeTextStyle,
        output: inout [NativeTokenDescriptor]
    ) {
        let nsText = text as NSString
        var localStart = 0

        while localStart < nsText.length {
            let remainingRange = NSRange(location: localStart, length: nsText.length - localStart)
            let nextNewline = nsText.range(of: newlineToken, options: [], range: remainingRange)

            if nextNewline.location == NSNotFound {
                output.append(
                    NativeTokenDescriptor(
                        text: nsText.substring(with: remainingRange),
                        startUTF16: baseOffset + localStart,
                        endUTF16: baseOffset + nsText.length,
                        style: style
                    )
                )
                break
            }

            if nextNewline.location > localStart {
                output.append(
                    NativeTokenDescriptor(
                        text: nsText.substring(with: NSRange(location: localStart, length: nextNewline.location - localStart)),
                        startUTF16: baseOffset + localStart,
                        endUTF16: baseOffset + nextNewline.location,
                        style: style
                    )
                )
            }

            output.append(
                NativeTokenDescriptor(
                    text: newlineToken,
                    startUTF16: baseOffset + nextNewline.location,
                    endUTF16: baseOffset + nextNewline.location + nextNewline.length,
                    style: style
                )
            )
            localStart = nextNewline.location + nextNewline.length
        }
    }

    private func sumHeights(_ lineLayouts: [NativeLineLayout]) -> Double {
        lineLayouts.last.map { $0.top + $0.height } ?? 0
    }

    private func nowMs() -> Double {
        ProcessInfo.processInfo.systemUptime * 1000
    }

    private func trimTrailingWhitespaceEnd(
        _ tokens: [NativePreparedToken],
        start: Int,
        end: Int
    ) -> Int {
        var trimmedEnd = end

        while trimmedEnd > start && isNonNewlineWhitespace(tokens[trimmedEnd - 1].text) {
            trimmedEnd -= 1
        }

        return trimmedEnd
    }

    private func sumWidths(_ tokens: [NativePreparedToken], start: Int, end: Int) -> Double {
        guard end > start else {
            return 0
        }

        return tokens[start..<end].reduce(0) { partialResult, token in
            partialResult + token.width
        }
    }

    private func lineTextFromTokens(_ tokens: [NativePreparedToken], start: Int, end: Int) -> String {
        guard end > start else {
            return ""
        }

        return tokens[start..<end].map(\.text).joined()
    }

    private func maxRequestedLineHeight(
        runs: [NativeTextRun],
        inlineBoxes: [NativeInlineBox] = [],
        defaultLineHeight: Double,
        startUTF16: Int,
        endUTF16: Int
    ) -> Double {
        var maxHeight = defaultLineHeight

        for run in runs where run.endUTF16 > startUTF16 && run.startUTF16 < endUTF16 {
            maxHeight = max(maxHeight, run.style.lineHeight > 0 ? run.style.lineHeight : defaultLineHeight)
        }
        for box in inlineBoxes where box.endUTF16 > startUTF16 && box.startUTF16 < endUTF16 {
            maxHeight = max(maxHeight, box.height)
        }

        return maxHeight
    }

    private func fallbackLineMetrics(
        _ tokens: [NativePreparedToken],
        start: Int,
        end: Int,
        defaultLineHeight: Double
    ) -> (lineHeight: Double, ascent: Double, descent: Double) {
        guard end > start else {
            return (defaultLineHeight, 0, defaultLineHeight)
        }

        var ascent = 0.0
        var descent = 0.0
        var lineHeight = defaultLineHeight
        for token in tokens[start..<end] {
            ascent = min(ascent, token.ascent)
            descent = max(descent, token.descent)
            lineHeight = max(lineHeight, token.lineHeight)
        }

        lineHeight = max(lineHeight, descent - ascent)
        return (lineHeight, ascent, descent)
    }

    private func isNonNewlineWhitespace(_ token: String) -> Bool {
        guard !token.isEmpty && token != newlineToken else {
            return false
        }

        return token.unicodeScalars.allSatisfy {
            CharacterSet.whitespaces.contains($0) && !isUnicodeNewline($0)
        }
    }

    private func isUnicodeNewline(_ scalar: Unicode.Scalar) -> Bool {
        CharacterSet.newlines.contains(scalar)
    }
}

private extension Comparable {
    func clamped(to limits: ClosedRange<Self>) -> Self {
        min(max(self, limits.lowerBound), limits.upperBound)
    }
}

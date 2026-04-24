import CoreText
import Foundation
import UIKit

internal let newlineToken = "\n"
internal let whiteSpaceNormal = "normal"
internal let whiteSpacePre = "pre"
internal let wordBreakNormal = "normal"
internal let wordBreakBreakAll = "break-all"
internal let breakBehaviorNever = "never"
internal let layoutEngineIosCoreText = "ios_core_text"
internal let layoutEngineIosManualTokenFallback = "ios_manual_token_fallback"
internal let fallbackReasonManualHeightEstimate = "manual_height_estimate"
internal let heightMetricSourcePlatformTextEngineMetrics = "platform_text_engine_metrics"
internal let ruleLayerPretextNative = "pretext_native_rules"
internal let breakKindHard = "hard_break"
internal let breakKindNativeSoft = "native_soft_break"
internal let driftAlgorithmRule = "algorithm_rule_drift"
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

internal struct NativeTokenDescriptor {
    let text: String
    let startUTF16: Int
    let endUTF16: Int
    let style: NativeTextStyle
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
    let textUnits: Int
    let forceTokenLayout: Bool
    let hasStyledRuns: Bool
}

internal final class NativePreparedParagraph {
    let text: NSString
    let attributedText: NSAttributedString
    let typesetter: CTTypesetter?
    let tokens: [NativePreparedToken]
    let breakUnits: [NativePreparedToken]
    let runs: [NativeTextRun]
    let atomicSpans: [NativeAtomicSpan]
    let forceTokenLayout: Bool
    let hasStyledRuns: Bool

    init(
        text: String,
        attributedText: NSAttributedString,
        typesetter: CTTypesetter?,
        tokens: [NativePreparedToken],
        breakUnits: [NativePreparedToken],
        runs: [NativeTextRun],
        atomicSpans: [NativeAtomicSpan],
        forceTokenLayout: Bool,
        hasStyledRuns: Bool
    ) {
        self.text = text as NSString
        self.attributedText = attributedText
        self.typesetter = typesetter
        self.tokens = tokens
        self.breakUnits = breakUnits
        self.runs = runs
        self.atomicSpans = atomicSpans
        self.forceTokenLayout = forceTokenLayout
        self.hasStyledRuns = hasStyledRuns
    }
}

internal struct NativeAtomicSpan {
    let startUTF16: Int
    let endUTF16: Int
    let source: String
}

internal final class NativePreparedCorpus {
    let paragraphs: [NativePreparedParagraph]
    let lineHeight: Double

    private let layoutCacheLimit = 12
    private let layoutCacheLock = NSLock()
    private var layoutCache: [NativeLayoutRequest: [[NativeLineLayout]]] = [:]
    private var layoutCacheOrder: [NativeLayoutRequest] = []

    init(
        paragraphs: [NativePreparedParagraph],
        lineHeight: Double
    ) {
        self.paragraphs = paragraphs
        self.lineHeight = lineHeight
    }

    func resolveLineLayouts(
        request: NativeLayoutRequest,
        builder: () -> [[NativeLineLayout]]
    ) -> [[NativeLineLayout]] {
        layoutCacheLock.lock()
        if let cached = layoutCache[request] {
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

internal struct NativePreparedLineRange {
    let textStartUTF16: Int
    let textEndUTF16: Int
    let top: Double
    let left: Double
    let width: Double
    let height: Double
    let ascent: Double
    let descent: Double
    let ctLine: CTLine?
    let layoutEngine: String
    let fallbackReason: String?
    let heightMetricSource: String
}

internal struct NativeParagraphDrawing {
    let text: NSString
    let attributedText: NSAttributedString
    let hasStyledRuns: Bool
    let layoutEngine: String
    let fallbackReason: String?
    let heightMetricSource: String
    let lines: [NativePreparedLineRange]
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

internal final class NativeLineCursor {
    let lines: [NativeLineLayout]
    var nextIndex: Int

    init(lines: [NativeLineLayout]) {
        self.lines = lines
        self.nextIndex = 0
    }
}

internal final class PretextShared {
    static let shared = PretextShared()

    private var nextPreparedCorpusId: Int64 = 1
    private var preparedCorpora: [Int64: NativePreparedCorpus] = [:]
    private var nextLineCursorId: Int64 = 1
    private var lineCursors: [Int64: NativeLineCursor] = [:]

    private init() {}

    func measure(text: String, fontFamily: String, fontSize: Double) -> Double {
        measureToken(
            text,
            style: NativeTextStyle(
                fontFamily: fontFamily,
                fontSize: fontSize,
                lineHeight: fontSize,
                letterSpacing: 0,
                locale: "",
                fontWeight: "",
                fontStyle: fontStyleNormal,
                includeFontPadding: true,
                textDirection: .auto
            )
        ).width
    }

    func measureBatch(texts: [String], fontFamily: String, fontSize: Double) -> [Double] {
        let style = NativeTextStyle(
            fontFamily: fontFamily,
            fontSize: fontSize,
            lineHeight: fontSize,
            letterSpacing: 0,
            locale: "",
            fontWeight: "",
            fontStyle: fontStyleNormal,
            includeFontPadding: true,
            textDirection: .auto
        )
        return texts.map { measureToken($0, style: style).width }
    }

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
                textUnits: textUnits,
                forceTokenLayout: false,
                hasStyledRuns: false
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
            let attributedText = buildAttributedText(text: paragraph.text, runs: paragraph.runs)
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
                forceTokenLayout: paragraph.forceTokenLayout,
                hasStyledRuns: paragraph.hasStyledRuns
            )
        }
        let measurementMs = nowMs() - measurementStartedAt

        let buildPreparedStartedAt = nowMs()
        let prepared = NativePreparedCorpus(
            paragraphs: paragraphs,
            lineHeight: lineHeight
        )
        let buildPreparedMs = nowMs() - buildPreparedStartedAt
        let id = nextPreparedCorpusId
        nextPreparedCorpusId += 1
        preparedCorpora[id] = prepared

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
        var forceTokenLayout = false
        var hasStyledRuns = false

        for segment in paragraph {
            let baseOffset = (text as NSString).length
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
            hasStyledRuns = hasStyledRuns || resolvedStyle != baseStyle
            forceTokenLayout = forceTokenLayout || segment.breakBehavior.lowercased() == breakBehaviorNever
            if segment.breakBehavior.lowercased() == breakBehaviorNever && endOffset > baseOffset {
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
            textUnits: text.utf16.count,
            forceTokenLayout: forceTokenLayout,
            hasStyledRuns: hasStyledRuns
        )
    }

    func layoutParagraphs(preparedId: Double, width: Double) throws -> [LaidOutParagraph] {
        try layoutParagraphs(preparedId: preparedId, request: defaultLayoutRequest(width: width))
    }

    func layoutParagraphs(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraph] {
        try layoutParagraphs(preparedId: preparedId, request: normalizeLayoutRequest(request))
    }

    func layoutParagraphsMetadata(
        preparedId: Double,
        width: Double
    ) throws -> [LaidOutParagraphMetrics] {
        try layoutParagraphsMetadata(preparedId: preparedId, request: defaultLayoutRequest(width: width))
    }

    func layoutParagraphsMetadata(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraphMetrics] {
        try layoutParagraphsMetadata(preparedId: preparedId, request: normalizeLayoutRequest(request))
    }

    func layoutParagraphLines(
        preparedId: Double,
        width: Double
    ) throws -> [LaidOutParagraphLines] {
        try layoutParagraphLines(preparedId: preparedId, request: defaultLayoutRequest(width: width))
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

    func createParagraphLineCursor(
        preparedId: Double,
        paragraphIndex: Double,
        request: ParagraphLayoutRequest
    ) throws -> ParagraphLineCursorState {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)
        let normalizedRequest = normalizeLayoutRequest(request)
        let resolvedIndex = Int(paragraphIndex)
        guard resolvedIndex >= 0, resolvedIndex < prepared.paragraphs.count else {
            throw NSError(
                domain: "Pretext",
                code: 404,
                userInfo: [NSLocalizedDescriptionKey: "Paragraph index \(resolvedIndex) not found."]
            )
        }

        let allLineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: normalizedRequest
        )
        let lines = allLineLayouts[resolvedIndex]
        let cursorId = nextLineCursorId
        nextLineCursorId += 1
        lineCursors[cursorId] = NativeLineCursor(lines: lines)
        return ParagraphLineCursorState(
            id: Double(cursorId),
            paragraphIndex: Double(resolvedIndex),
            lineCount: Double(lines.count),
            height: sumHeights(lines)
        )
    }

    func nextParagraphLine(cursorId: Double) -> ParagraphLineCursorStep {
        let handle = Int64(cursorId)
        guard let cursor = lineCursors[handle] else {
            return doneCursorStep()
        }
        guard cursor.nextIndex < cursor.lines.count else {
            return doneCursorStep()
        }

        let line = cursor.lines[cursor.nextIndex]
        cursor.nextIndex += 1
        return ParagraphLineCursorStep(
            done: false,
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

    func releaseParagraphLineCursor(cursorId: Double) {
        lineCursors.removeValue(forKey: Int64(cursorId))
    }

    func resolveParagraphDrawing(
        preparedId: Double,
        paragraphIndex: Int,
        width: Double
    ) -> NativeParagraphDrawing? {
        resolveParagraphDrawing(
            preparedId: preparedId,
            paragraphIndex: paragraphIndex,
            request: defaultLayoutRequest(width: width)
        )
    }

    func resolveParagraphDrawing(
        preparedId: Double,
        paragraphIndex: Int,
        request: NativeLayoutRequest
    ) -> NativeParagraphDrawing? {
        guard
            let prepared = preparedCorpora[Int64(preparedId)],
            paragraphIndex >= 0,
            paragraphIndex < prepared.paragraphs.count
        else {
            return nil
        }

        let paragraph = prepared.paragraphs[paragraphIndex]
        let lineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: request
        )[paragraphIndex]
        return buildNativeParagraphDrawing(paragraph: paragraph, lineLayouts: lineLayouts)
    }

    func resolveParagraphsDrawing(
        preparedId: Double,
        request: NativeLayoutRequest
    ) -> [NativeParagraphDrawing]? {
        guard let prepared = preparedCorpora[Int64(preparedId)] else {
            return nil
        }

        let paragraphLineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: request
        )

        return prepared.paragraphs.enumerated().map { index, paragraph in
            buildNativeParagraphDrawing(
                paragraph: paragraph,
                lineLayouts: paragraphLineLayouts[index]
            )
        }
    }

    private func buildNativeParagraphDrawing(
        paragraph: NativePreparedParagraph,
        lineLayouts: [NativeLineLayout]
    ) -> NativeParagraphDrawing {
        return NativeParagraphDrawing(
            text: paragraph.text,
            attributedText: paragraph.attributedText,
            hasStyledRuns: paragraph.hasStyledRuns,
            layoutEngine: lineLayouts.first?.layoutEngine ?? layoutEngineIosManualTokenFallback,
            fallbackReason: lineLayouts.compactMap(\.fallbackReason).first,
            heightMetricSource: heightMetricSourcePlatformTextEngineMetrics,
            lines: buildPreparedLineRanges(lineLayouts: lineLayouts)
        )
    }

    func releaseParagraphs(preparedId: Double) {
        preparedCorpora.removeValue(forKey: Int64(preparedId))
    }

    private func layoutParagraphs(
        preparedId: Double,
        request: NativeLayoutRequest
    ) throws -> [LaidOutParagraph] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)
        let paragraphLineLayouts = resolveParagraphLineLayouts(
            prepared: prepared,
            request: request
        )

        return prepared.paragraphs.enumerated().map { index, paragraph in
            let lineLayouts = paragraphLineLayouts[index]
            let maxLineWidth = lineLayouts.map(\.width).max() ?? 0
            return LaidOutParagraph(
                brokenText: materializeBrokenText(paragraph.text, lineLayouts: lineLayouts),
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: maxLineWidth
            )
        }
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
                    request: request,
                    lineLayouts: lineLayouts
                )
            )
        }
    }

    private func requirePreparedCorpus(preparedId: Double) throws -> NativePreparedCorpus {
        let handle = Int64(preparedId)
        guard let prepared = preparedCorpora[handle] else {
            throw NSError(
                domain: "Pretext",
                code: 404,
                userInfo: [NSLocalizedDescriptionKey: "Prepared benchmark corpus \(handle) not found."]
            )
        }
        return prepared
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

    private func buildPreparedLineRanges(
        lineLayouts: [NativeLineLayout]
    ) -> [NativePreparedLineRange] {
        lineLayouts.map { line in
            NativePreparedLineRange(
                textStartUTF16: line.textStartUTF16,
                textEndUTF16: line.textEndUTF16,
                top: line.top,
                left: line.left,
                width: line.width,
                height: line.height,
                ascent: line.ascent,
                descent: line.descent,
                ctLine: line.ctLine,
                layoutEngine: line.layoutEngine,
                fallbackReason: line.fallbackReason,
                heightMetricSource: heightMetricSourcePlatformTextEngineMetrics
            )
        }
    }

    private func buildParagraphLayoutDiagnostics(
        paragraph: NativePreparedParagraph,
        request: NativeLayoutRequest,
        lineLayouts: [NativeLineLayout]
    ) -> ParagraphLayoutDiagnostics {
        let driftKinds = collectDriftKinds(
            paragraph: paragraph,
            request: request,
            lineLayouts: lineLayouts
        )
        return ParagraphLayoutDiagnostics(
            normalizedRequest: buildPublicLayoutRequest(request),
            ruleLayer: ruleLayerPretextNative,
            canvasPixelParityTarget: false,
            layoutEngine: lineLayouts.first?.layoutEngine ?? layoutEngineIosCoreText,
            heightMetricSource: heightMetricSourcePlatformTextEngineMetrics,
            fallbackReason: lineLayouts.compactMap { $0.fallbackReason }.first,
            driftKinds: driftKinds,
            heightMetricDrivers: heightMetricDrivers,
            breakTable: buildParagraphBreakTable(paragraph: paragraph, lineLayouts: lineLayouts),
            lineDiagnostics: lineLayouts.map { line in
                ParagraphLineDiagnostics(
                    textStart: Double(line.textStartUTF16),
                    textEnd: Double(line.textEndUTF16),
                    layoutEngine: line.layoutEngine,
                    heightMetricSource: heightMetricSourcePlatformTextEngineMetrics,
                    fallbackReason: line.fallbackReason,
                    driftKinds: collectLineDriftKinds(line)
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
                source: layoutEngineIosCoreText
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
        request: NativeLayoutRequest,
        lineLayouts: [NativeLineLayout]
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
        if paragraph.runs.contains(where: { !$0.style.includeFontPadding }) {
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

    private func defaultLayoutRequest(width: Double) -> NativeLayoutRequest {
        NativeLayoutRequest(
            width: max(1, width),
            left: 0,
            whiteSpace: whiteSpaceNormal,
            wordBreak: wordBreakNormal,
            shapeSlices: []
        )
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

    private func doneCursorStep() -> ParagraphLineCursorStep {
        ParagraphLineCursorStep(
            done: true,
            textStart: 0,
            textEnd: 0,
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            ascent: 0,
            descent: 0
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

    private func layoutLineLayouts(
        _ prepared: NativePreparedParagraph,
        lineHeight: Double,
        request: NativeLayoutRequest
    ) -> [NativeLineLayout] {
        guard let typesetter = prepared.typesetter, !prepared.forceTokenLayout else {
            let tokens = request.wordBreak == wordBreakBreakAll ? prepared.breakUnits : prepared.tokens
            return layoutLineLayoutsFallback(tokens, lineHeight: lineHeight, request: request)
        }

        var lines: [NativeLineLayout] = []
        var start = 0
        var top = 0.0
        let length = prepared.text.length

        while start < length {
            let constraint = resolveLineConstraint(request: request, top: top)

            if prepared.text.character(at: start) == 0x0A {
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: start,
                        textEndUTF16: start,
                        width: 0,
                        left: constraint.left,
                        top: top,
                        height: lineHeight,
                        ascent: 0,
                        descent: lineHeight,
                        layoutEngine: layoutEngineIosCoreText,
                        fallbackReason: nil
                    )
                )
                top += lineHeight
                start += 1
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
            let actualHeight = max(0, Double(ascent + descent + leading))
            let lineHeightFloor = max(
                lineHeight,
                maxRequestedLineHeight(
                    runs: prepared.runs,
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
                    left: constraint.left,
                    top: top,
                    height: effectiveLineHeight,
                    ascent: ascent,
                    descent: descent,
                    layoutEngine: layoutEngineIosCoreText,
                    fallbackReason: nil,
                    ctLine: line
                )
            )

            top += effectiveLineHeight
            start += count
            if start < length && prepared.text.character(at: start) == 0x0A {
                start += 1
            }
        }

        if lines.isEmpty {
            let constraint = resolveLineConstraint(request: request, top: 0)
            return [
                NativeLineLayout(
                    textStartUTF16: 0,
                    textEndUTF16: 0,
                    width: 0,
                    left: constraint.left,
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

    private func layoutLineLayoutsFallback(
        _ tokens: [NativePreparedToken],
        lineHeight: Double,
        request: NativeLayoutRequest
    ) -> [NativeLineLayout] {
        var lines: [NativeLineLayout] = []
        var cursor = 0
        var top = 0.0

        while cursor < tokens.count {
            let constraint = resolveLineConstraint(request: request, top: top)

            if tokens[cursor].text == newlineToken {
                let newline = tokens[cursor]
                let newlineHeight = max(lineHeight, newline.lineHeight)
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: newline.startUTF16,
                        textEndUTF16: newline.startUTF16,
                        width: 0,
                        left: constraint.left,
                        top: top,
                        height: newlineHeight,
                        ascent: newline.ascent,
                        descent: max(newline.descent, newlineHeight - newline.ascent)
                    )
                )
                top += newlineHeight
                cursor += 1
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

                if breakAnywhere || isNonNewlineWhitespace(token.text) {
                    lastBreakAfter = end + 1
                }

                if currentWidth + token.width <= constraint.width || end == cursor {
                    currentWidth += token.width
                    end += 1
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
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: fallbackRange.lowerBound,
                        textEndUTF16: fallbackRange.upperBound,
                        width: fallback.width,
                        left: constraint.left,
                        top: top,
                        height: fallback.lineHeight > 0 ? max(lineHeight, fallback.lineHeight) : lineHeight,
                        ascent: fallback.ascent,
                        descent: fallback.descent
                    )
                )
                top += fallback.lineHeight > 0 ? max(lineHeight, fallback.lineHeight) : lineHeight
                cursor += 1
            } else {
                let metrics = fallbackLineMetrics(tokens, start: cursor, end: trimmedEnd, defaultLineHeight: lineHeight)
                let lineWidth = sumWidths(tokens, start: cursor, end: trimmedEnd)
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: tokens[cursor].startUTF16,
                        textEndUTF16: tokens[trimmedEnd - 1].endUTF16,
                        width: lineWidth,
                        left: constraint.left,
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
                cursor += 1
            }
        }

        if lines.isEmpty {
            let constraint = resolveLineConstraint(request: request, top: 0)
            return [
                NativeLineLayout(
                    textStartUTF16: 0,
                    textEndUTF16: 0,
                    width: 0,
                    left: constraint.left,
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

    private func maxRequestedLineHeight(
        runs: [NativeTextRun],
        defaultLineHeight: Double,
        startUTF16: Int,
        endUTF16: Int
    ) -> Double {
        var maxHeight = defaultLineHeight

        for run in runs where run.endUTF16 > startUTF16 && run.startUTF16 < endUTF16 {
            maxHeight = max(maxHeight, run.style.lineHeight > 0 ? run.style.lineHeight : defaultLineHeight)
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
            ascent = max(ascent, token.ascent)
            descent = max(descent, token.descent)
            lineHeight = max(lineHeight, token.lineHeight)
        }

        lineHeight = max(lineHeight, ascent + descent)
        return (lineHeight, ascent, descent)
    }

    private func materializeBrokenText(
        _ text: NSString,
        lineLayouts: [NativeLineLayout]
    ) -> String {
        lineLayouts.map { line in
            guard line.textEndUTF16 > line.textStartUTF16 else {
                return ""
            }

            return text.substring(
                with: NSRange(
                    location: line.textStartUTF16,
                    length: line.textEndUTF16 - line.textStartUTF16
                )
            )
        }.joined(separator: newlineToken)
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

import CoreText
import Foundation
import UIKit

internal let newlineToken = "\n"
internal let whiteSpaceNormal = "normal"
internal let whiteSpacePre = "pre"
internal let wordBreakNormal = "normal"
internal let wordBreakBreakAll = "break-all"
internal let breakBehaviorNever = "never"

internal struct NativeTokenDescriptor {
    let text: String
    let startUTF16: Int
    let endUTF16: Int
}

internal struct NativePreparedToken {
    let text: String
    let startUTF16: Int
    let endUTF16: Int
    let width: Double
}

internal struct NativePreparedParagraphSeed {
    let text: String
    let tokens: [NativeTokenDescriptor]
    let breakUnits: [NativeTokenDescriptor]
    let textUnits: Int
    let forceTokenLayout: Bool
}

internal final class NativePreparedParagraph {
    let text: NSString
    let typesetter: CTTypesetter?
    let tokens: [NativePreparedToken]
    let breakUnits: [NativePreparedToken]
    let forceTokenLayout: Bool

    init(
        text: String,
        typesetter: CTTypesetter?,
        tokens: [NativePreparedToken],
        breakUnits: [NativePreparedToken],
        forceTokenLayout: Bool
    ) {
        self.text = text as NSString
        self.typesetter = typesetter
        self.tokens = tokens
        self.breakUnits = breakUnits
        self.forceTokenLayout = forceTokenLayout
    }
}

internal struct NativePreparedCorpus {
    let paragraphs: [NativePreparedParagraph]
    let lineHeight: Double
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
}

internal struct NativeParagraphDrawing {
    let text: NSString
    let lines: [NativePreparedLineRange]
}

internal enum TokenMode {
    case whitespace
    case text
}

internal struct NativeLayoutRequest {
    let width: Double
    let left: Double
    let whiteSpace: String
    let wordBreak: String
    let shapeSlices: [NativeShapeSlice]
}

internal struct NativeShapeSlice {
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
        let font = resolveFont(fontFamily: fontFamily, fontSize: fontSize)
        return measureToken(text, font: font, letterSpacing: 0, locale: "")
    }

    func measureBatch(texts: [String], fontFamily: String, fontSize: Double) -> [Double] {
        let font = resolveFont(fontFamily: fontFamily, fontSize: fontSize)
        return texts.map { measureToken($0, font: font, letterSpacing: 0, locale: "") }
    }

    func prepareParagraphsWithStats(
        texts: [String],
        style: ParagraphStyle
    ) -> PreparedParagraphResult {
        let analyzedParagraphs = texts.map { text in
            NativePreparedParagraphSeed(
                text: text,
                tokens: tokenize(text),
                breakUnits: tokenizeBreakUnits(text),
                textUnits: text.utf16.count,
                forceTokenLayout: false
            )
        }
        return prepareParagraphSeedsWithStats(analyzedParagraphs, style: style)
    }

    func prepareInlineParagraphsWithStats(
        paragraphs: [[InlineSegment]],
        style: ParagraphStyle
    ) -> PreparedParagraphResult {
        let analyzedParagraphs = paragraphs.map { paragraph in
            prepareInlineParagraphSeed(paragraph)
        }
        return prepareParagraphSeedsWithStats(analyzedParagraphs, style: style)
    }

    private func prepareParagraphSeedsWithStats(
        _ analyzedParagraphs: [NativePreparedParagraphSeed],
        style: ParagraphStyle
    ) -> PreparedParagraphResult {
        let prepareStartedAt = nowMs()
        let font = resolveFont(fontFamily: style.fontFamily, fontSize: style.fontSize)
        let lineHeight = resolvedLineHeight(style.lineHeight, font: font)

        let analyzeStartedAt = nowMs()
        let totalTokenCount = analyzedParagraphs.reduce(0) { partialResult, paragraph in
            partialResult + paragraph.textUnits
        }
        let analyzeMs = nowMs() - analyzeStartedAt

        let measurementStartedAt = nowMs()
        let paragraphs = analyzedParagraphs.map { paragraph in
            NativePreparedParagraph(
                text: paragraph.text,
                typesetter: paragraph.forceTokenLayout ? nil : createTypesetter(
                    text: paragraph.text,
                    font: font,
                    letterSpacing: style.letterSpacing,
                    locale: style.locale
                ),
                tokens: paragraph.tokens.map { token in
                    NativePreparedToken(
                        text: token.text,
                        startUTF16: token.startUTF16,
                        endUTF16: token.endUTF16,
                        width: token.text == newlineToken
                            ? 0
                            : measureToken(
                                token.text,
                                font: font,
                                letterSpacing: style.letterSpacing,
                                locale: style.locale
                            )
                    )
                },
                breakUnits: paragraph.breakUnits.map { token in
                    NativePreparedToken(
                        text: token.text,
                        startUTF16: token.startUTF16,
                        endUTF16: token.endUTF16,
                        width: token.text == newlineToken
                            ? 0
                            : measureToken(
                                token.text,
                                font: font,
                                letterSpacing: style.letterSpacing,
                                locale: style.locale
                            )
                    )
                },
                forceTokenLayout: paragraph.forceTokenLayout
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
            uniqueTokenCount: Double(prepared.paragraphs.count)
        )

        return PreparedParagraphResult(
            prepared: preparedState,
            stats: stats
        )
    }

    private func prepareInlineParagraphSeed(
        _ paragraph: [InlineSegment]
    ) -> NativePreparedParagraphSeed {
        var text = ""
        var tokens: [NativeTokenDescriptor] = []
        var breakUnits: [NativeTokenDescriptor] = []

        for segment in paragraph {
            appendInlineSegment(
                segment,
                text: &text,
                tokens: &tokens,
                breakUnits: &breakUnits
            )
        }

        return NativePreparedParagraphSeed(
            text: text,
            tokens: tokens,
            breakUnits: breakUnits,
            textUnits: text.utf16.count,
            forceTokenLayout: true
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

        let lines = layoutLineLayouts(
            prepared.paragraphs[resolvedIndex],
            lineHeight: prepared.lineHeight,
            request: normalizedRequest
        )
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
        guard
            let prepared = preparedCorpora[Int64(preparedId)],
            paragraphIndex >= 0,
            paragraphIndex < prepared.paragraphs.count
        else {
            return nil
        }

        let paragraph = prepared.paragraphs[paragraphIndex]
        let lineLayouts = layoutLineLayouts(
            paragraph,
            lineHeight: prepared.lineHeight,
            request: defaultLayoutRequest(width: width)
        )
        return NativeParagraphDrawing(
            text: paragraph.text,
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

        return prepared.paragraphs.map { paragraph in
            let lineLayouts = layoutLineLayouts(paragraph, lineHeight: prepared.lineHeight, request: request)
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

        return prepared.paragraphs.map { paragraph in
            let lineLayouts = layoutLineLayouts(paragraph, lineHeight: prepared.lineHeight, request: request)
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

        return prepared.paragraphs.map { paragraph in
            let lineLayouts = layoutLineLayouts(paragraph, lineHeight: prepared.lineHeight, request: request)
            return LaidOutParagraphLines(
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: lineLayouts.map(\.width).max() ?? 0,
                lines: buildParagraphLineRanges(lineLayouts: lineLayouts)
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
        text: String,
        font: UIFont,
        letterSpacing: Double,
        locale: String
    ) -> CTTypesetter {
        var attributes: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font
        ]

        if letterSpacing != 0 {
            attributes[NSAttributedString.Key(rawValue: kCTKernAttributeName as String)] = CGFloat(letterSpacing)
        }

        if !locale.isEmpty {
            attributes[NSAttributedString.Key(rawValue: kCTLanguageAttributeName as String)] = locale
        }

        let attributedText = NSAttributedString(string: text, attributes: attributes)
        return CTTypesetterCreateWithAttributedString(attributedText)
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
                descent: line.descent
            )
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
                        descent: lineHeight
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
            let effectiveLineHeight = max(lineHeight, actualHeight)

            lines.append(
                NativeLineLayout(
                    textStartUTF16: start,
                    textEndUTF16: start + count,
                    width: typographicWidth,
                    left: constraint.left,
                    top: top,
                    height: effectiveLineHeight,
                    ascent: ascent,
                    descent: descent
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
                    descent: lineHeight
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
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: newline.startUTF16,
                        textEndUTF16: newline.startUTF16,
                        width: 0,
                        left: constraint.left,
                        top: top,
                        height: lineHeight,
                        ascent: 0,
                        descent: lineHeight
                    )
                )
                top += lineHeight
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
                        height: lineHeight,
                        ascent: 0,
                        descent: lineHeight
                    )
                )
                top += lineHeight
                cursor += 1
            } else {
                let lineWidth = sumWidths(tokens, start: cursor, end: trimmedEnd)
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: tokens[cursor].startUTF16,
                        textEndUTF16: tokens[trimmedEnd - 1].endUTF16,
                        width: lineWidth,
                        left: constraint.left,
                        top: top,
                        height: lineHeight,
                        ascent: 0,
                        descent: lineHeight
                    )
                )
                top += lineHeight
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

    private func tokenize(_ text: String) -> [NativeTokenDescriptor] {
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
                    endUTF16: currentEnd
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
                        endUTF16: range.location + range.length
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

    private func tokenizeBreakUnits(_ text: String) -> [NativeTokenDescriptor] {
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
                    endUTF16: range.location + range.length
                )
            )
            cursor = range.location + range.length
        }
        return tokens
    }

    private func appendInlineSegment(
        _ segment: InlineSegment,
        text: inout String,
        tokens: inout [NativeTokenDescriptor],
        breakUnits: inout [NativeTokenDescriptor]
    ) {
        let baseOffset = (text as NSString).length
        text += segment.text

        if segment.breakBehavior.lowercased() == breakBehaviorNever {
            appendNeverBreakTokens(segment.text, baseOffset: baseOffset, output: &tokens)
            appendNeverBreakTokens(segment.text, baseOffset: baseOffset, output: &breakUnits)
            return
        }

        tokens += tokenize(segment.text).map { token in
            NativeTokenDescriptor(
                text: token.text,
                startUTF16: token.startUTF16 + baseOffset,
                endUTF16: token.endUTF16 + baseOffset
            )
        }
        breakUnits += tokenizeBreakUnits(segment.text).map { token in
            NativeTokenDescriptor(
                text: token.text,
                startUTF16: token.startUTF16 + baseOffset,
                endUTF16: token.endUTF16 + baseOffset
            )
        }
    }

    private func appendNeverBreakTokens(
        _ text: String,
        baseOffset: Int,
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
                        endUTF16: baseOffset + nsText.length
                    )
                )
                break
            }

            if nextNewline.location > localStart {
                output.append(
                    NativeTokenDescriptor(
                        text: nsText.substring(with: NSRange(location: localStart, length: nextNewline.location - localStart)),
                        startUTF16: baseOffset + localStart,
                        endUTF16: baseOffset + nextNewline.location
                    )
                )
            }

            output.append(
                NativeTokenDescriptor(
                    text: newlineToken,
                    startUTF16: baseOffset + nextNewline.location,
                    endUTF16: baseOffset + nextNewline.location + nextNewline.length
                )
            )
            localStart = nextNewline.location + nextNewline.length
        }
    }

    private func sumHeights(_ lineLayouts: [NativeLineLayout]) -> Double {
        lineLayouts.last.map { $0.top + $0.height } ?? 0
    }

    private func resolveFont(fontFamily: String, fontSize: Double) -> UIFont {
        UIFont(name: fontFamily, size: fontSize) ?? UIFont.systemFont(ofSize: fontSize)
    }

    private func nowMs() -> Double {
        ProcessInfo.processInfo.systemUptime * 1000
    }

    private func resolvedLineHeight(_ lineHeight: Double, font: UIFont) -> Double {
        lineHeight > 0 ? lineHeight : Double(font.lineHeight)
    }

    private func measureToken(
        _ token: String,
        font: UIFont,
        letterSpacing: Double,
        locale: String
    ) -> Double {
        var attributes: [NSAttributedString.Key: Any] = [
            .font: font
        ]
        if letterSpacing != 0 {
            attributes[.kern] = letterSpacing
        }
        if !locale.isEmpty {
            attributes[NSAttributedString.Key(rawValue: kCTLanguageAttributeName as String)] = locale
        }
        return (token as NSString).size(withAttributes: attributes).width
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

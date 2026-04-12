import CoreText
import Foundation
import UIKit

internal let newlineToken = "\n"

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

internal final class NativePreparedParagraph {
    let text: NSString
    let typesetter: CTTypesetter?
    let tokens: [NativePreparedToken]

    init(text: String, typesetter: CTTypesetter?, tokens: [NativePreparedToken]) {
        self.text = text as NSString
        self.typesetter = typesetter
        self.tokens = tokens
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

internal final class PretextShared {
    static let shared = PretextShared()

    private var nextPreparedCorpusId: Int64 = 1
    private var preparedCorpora: [Int64: NativePreparedCorpus] = [:]

    private init() {}

    func measure(text: String, fontFamily: String, fontSize: Double) -> Double {
        let font = resolveFont(fontFamily: fontFamily, fontSize: fontSize)
        return measureToken(text, font: font, letterSpacing: 0)
    }

    func measureBatch(texts: [String], fontFamily: String, fontSize: Double) -> [Double] {
        let font = resolveFont(fontFamily: fontFamily, fontSize: fontSize)
        return texts.map { measureToken($0, font: font, letterSpacing: 0) }
    }

    func prepareParagraphsWithStats(
        texts: [String],
        style: ParagraphStyle
    ) -> PreparedParagraphResult {
        let prepareStartedAt = nowMs()
        let font = resolveFont(fontFamily: style.fontFamily, fontSize: style.fontSize)
        let lineHeight = resolvedLineHeight(style.lineHeight, font: font)

        let analyzeStartedAt = nowMs()
        let totalTokenCount = texts.reduce(0) { partialResult, text in
            partialResult + text.utf16.count
        }
        let analyzeMs = nowMs() - analyzeStartedAt

        let measurementStartedAt = nowMs()
        let paragraphs = texts.map { text in
            NativePreparedParagraph(
                text: text,
                typesetter: createTypesetter(
                    text: text,
                    font: font,
                    letterSpacing: style.letterSpacing
                ),
                tokens: []
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

    func layoutParagraphs(preparedId: Double, width: Double) throws -> [LaidOutParagraph] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)

        return prepared.paragraphs.map { paragraph in
            let lineLayouts = layoutLineLayouts(paragraph, lineHeight: prepared.lineHeight, width: width)
            let maxLineWidth = lineLayouts.map(\.width).max() ?? 0
            return LaidOutParagraph(
                brokenText: materializeBrokenText(paragraph.text, lineLayouts: lineLayouts),
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: maxLineWidth
            )
        }
    }

    func layoutParagraphsMetadata(
        preparedId: Double,
        width: Double
    ) throws -> [LaidOutParagraphMetrics] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)

        return prepared.paragraphs.map { paragraph in
            let lineLayouts = layoutLineLayouts(paragraph, lineHeight: prepared.lineHeight, width: width)
            return LaidOutParagraphMetrics(
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: lineLayouts.map(\.width).max() ?? 0
            )
        }
    }

    func layoutParagraphLines(
        preparedId: Double,
        width: Double
    ) throws -> [LaidOutParagraphLines] {
        let prepared = try requirePreparedCorpus(preparedId: preparedId)

        return prepared.paragraphs.map { paragraph in
            let lineLayouts = layoutLineLayouts(paragraph, lineHeight: prepared.lineHeight, width: width)
            return LaidOutParagraphLines(
                lineCount: Double(lineLayouts.count),
                height: sumHeights(lineLayouts),
                maxLineWidth: lineLayouts.map(\.width).max() ?? 0,
                lines: buildParagraphLineRanges(lineLayouts: lineLayouts)
            )
        }
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
        let lineLayouts = layoutLineLayouts(paragraph, lineHeight: prepared.lineHeight, width: width)
        return NativeParagraphDrawing(
            text: paragraph.text,
            lines: buildPreparedLineRanges(lineLayouts: lineLayouts)
        )
    }

    func releaseParagraphs(preparedId: Double) {
        preparedCorpora.removeValue(forKey: Int64(preparedId))
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
        letterSpacing: Double
    ) -> CTTypesetter {
        var attributes: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font
        ]

        if letterSpacing != 0 {
            attributes[NSAttributedString.Key(rawValue: kCTKernAttributeName as String)] = CGFloat(letterSpacing)
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
                left: 0,
                width: line.width,
                height: line.height
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
                left: 0,
                width: line.width,
                height: line.height,
                ascent: line.ascent,
                descent: line.descent
            )
        }
    }

    private func layoutLineLayouts(
        _ prepared: NativePreparedParagraph,
        lineHeight: Double,
        width: Double
    ) -> [NativeLineLayout] {
        guard let typesetter = prepared.typesetter else {
            return layoutLineLayoutsFallback(prepared.tokens, lineHeight: lineHeight, width: width)
        }

        var lines: [NativeLineLayout] = []
        var start = 0
        var top = 0.0
        let length = prepared.text.length

        while start < length {
            if prepared.text.character(at: start) == 0x0A {
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: start,
                        textEndUTF16: start,
                        width: 0,
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
            let suggestedCount = CTTypesetterSuggestLineBreak(typesetter, start, width)
            var count = min(suggestedCount, newlineLocation - start)

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
            return [
                NativeLineLayout(
                    textStartUTF16: 0,
                    textEndUTF16: 0,
                    width: 0,
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
        width: Double
    ) -> [NativeLineLayout] {
        var lines: [NativeLineLayout] = []
        var cursor = 0
        var top = 0.0

        while cursor < tokens.count {
            if tokens[cursor].text == newlineToken {
                let newline = tokens[cursor]
                lines.append(
                    NativeLineLayout(
                        textStartUTF16: newline.startUTF16,
                        textEndUTF16: newline.startUTF16,
                        width: 0,
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

            while end < tokens.count {
                let token = tokens[end]

                if token.text == newlineToken {
                    hitForcedBreak = true
                    break
                }

                if isNonNewlineWhitespace(token.text) {
                    lastBreakAfter = end + 1
                }

                if currentWidth + token.width <= width || end == cursor {
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
            return [NativeLineLayout(textStartUTF16: 0, textEndUTF16: 0, width: 0, top: 0, height: lineHeight, ascent: 0, descent: lineHeight)]
        }

        return lines
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

    private func measureToken(_ token: String, font: UIFont, letterSpacing: Double) -> Double {
        var attributes: [NSAttributedString.Key: Any] = [.font: font]
        if letterSpacing != 0 {
            attributes[.kern] = letterSpacing
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
            CharacterSet.whitespaces.contains($0) && !$0.properties.isNewline
        }
    }
}

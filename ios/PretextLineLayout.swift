import CoreText
import Foundation

internal func buildParagraphLineRanges(
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

internal func buildInlineBoxFrames(
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
        return isRtlText("", textDirection: textDirection, textLocale: textLocale)
    }

    let text = paragraph.text.substring(
        with: NSRange(location: line.textStartUTF16, length: length)
    )
    return isRtlText(text, textDirection: textDirection, textLocale: textLocale)
}

internal func isRtlText(
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
            return isRtlLocale(textLocale)
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

internal func normalizeLayoutRequest(_ request: ParagraphLayoutRequest) -> NativeLayoutRequest {
    let shapeSlices = request.shapeSlices.map { slice in
        NativeShapeSlice(
            top: finiteOrDefault(slice.top, fallback: 0),
            height: max(0, finiteOrDefault(slice.height, fallback: 0)),
            left: finiteOrDefault(slice.left, fallback: 0),
            width: max(1, finiteOrDefault(slice.width, fallback: 1))
        )
    }
    .sorted { left, right in
        left.top < right.top
    }

    return NativeLayoutRequest(
        width: max(1, finiteOrDefault(request.width, fallback: 1)),
        left: finiteOrDefault(request.left, fallback: 0),
        whiteSpace: request.whiteSpace.lowercased(),
        wordBreak: request.wordBreak.lowercased(),
        shapeSlices: shapeSlices
    )
}

private func finiteOrDefault(_ value: Double, fallback: Double) -> Double {
    value.isFinite ? value : fallback
}

internal func resolveParagraphLineLayouts(
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
        return constraint.left + (flushFactor == 1 ? max(0, penOffset) : penOffset)
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
    let canUseCoreText = request.shapeSlices.isEmpty
        && request.whiteSpace == whiteSpaceNormal
        && request.wordBreak == wordBreakNormal
    guard let typesetter = prepared.typesetter, !prepared.forceTokenLayout, canUseCoreText else {
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

internal func sumHeights(_ lineLayouts: [NativeLineLayout]) -> Double {
    lineLayouts.last.map { $0.top + $0.height } ?? 0
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

import Foundation

extension NativeLineLayout {
    func withHeight(_ rowHeight: Double) -> NativeLineLayout {
        guard height != rowHeight else {
            return self
        }

        return NativeLineLayout(
            textStartUTF16: textStartUTF16,
            textEndUTF16: textEndUTF16,
            width: width,
            left: left,
            top: top,
            height: rowHeight,
            ascent: ascent,
            descent: max(descent, rowHeight + ascent),
            layoutEngine: layoutEngine,
            fallbackReason: fallbackReason,
            ctLine: ctLine
        )
    }
}

internal func sumHeights(_ lineLayouts: [NativeLineLayout]) -> Double {
    lineLayouts.last.map { $0.top + $0.height } ?? 0
}

internal func trimTrailingWhitespaceEnd(
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

internal func sumWidths(_ tokens: [NativePreparedToken], start: Int, end: Int) -> Double {
    guard end > start else {
        return 0
    }

    return tokens[start..<end].reduce(0) { partialResult, token in
        partialResult + token.width
    }
}

internal func lineTextFromTokens(_ tokens: [NativePreparedToken], start: Int, end: Int) -> String {
    guard end > start else {
        return ""
    }

    return tokens[start..<end].map(\.text).joined()
}

internal func maxRequestedLineHeight(
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

internal func fallbackLineMetrics(
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

internal func isNonNewlineWhitespace(_ token: String) -> Bool {
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

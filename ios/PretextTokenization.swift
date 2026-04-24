import Foundation

internal func tokenize(
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

internal func tokenizeBreakUnits(
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

internal func appendInlineSegment(
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

private func isUnicodeNewline(_ scalar: Unicode.Scalar) -> Bool {
    CharacterSet.newlines.contains(scalar)
}

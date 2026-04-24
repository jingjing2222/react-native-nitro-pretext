import CoreText
import Foundation

internal func prepareInlineParagraphSeed(
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

internal func createTypesetter(
    attributedText: NSAttributedString
) -> CTTypesetter {
    return CTTypesetterCreateWithAttributedString(attributedText)
}

internal func prepareMeasuredToken(
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

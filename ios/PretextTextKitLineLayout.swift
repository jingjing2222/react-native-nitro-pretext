import Foundation
import UIKit

internal func layoutTextKitLineLayouts(
    _ prepared: NativePreparedParagraph,
    lineHeight: Double,
    request: NativeLayoutRequest
) -> [NativeLineLayout] {
    let constraint = NativeLineConstraint(left: request.left, width: request.width)
    let textStorage = NSTextStorage(attributedString: prepared.attributedText)
    applyTextKitBaselineOffset(textStorage)

    let layoutManager = NSLayoutManager()
    layoutManager.usesFontLeading = false

    let textContainer = NSTextContainer(
        size: CGSize(
            width: CGFloat(max(1, constraint.width)),
            height: CGFloat.greatestFiniteMagnitude
        )
    )
    textContainer.lineFragmentPadding = 0
    textContainer.lineBreakMode = .byWordWrapping
    textContainer.maximumNumberOfLines = 0

    layoutManager.addTextContainer(textContainer)
    textStorage.addLayoutManager(layoutManager)
    layoutManager.ensureLayout(for: textContainer)

    let glyphRange = layoutManager.glyphRange(for: textContainer)
    var lines: [NativeLineLayout] = []
    let textLength = prepared.text.length

    layoutManager.enumerateLineFragments(forGlyphRange: glyphRange) {
        _,
        usedRect,
        _,
        lineGlyphRange,
        _ in
        let characterRange = layoutManager.characterRange(
            forGlyphRange: lineGlyphRange,
            actualGlyphRange: nil
        )
        guard characterRange.location != NSNotFound else {
            return
        }

        let start = min(max(0, characterRange.location), textLength)
        let end = min(max(start, characterRange.location + characterRange.length), textLength)
        let baseline = resolveTextKitBaseline(
            layoutManager: layoutManager,
            lineGlyphRange: lineGlyphRange,
            characterRange: characterRange
        )
        let height = max(0, Double(usedRect.height))

        lines.append(
            NativeLineLayout(
                textStartUTF16: start,
                textEndUTF16: end,
                width: max(0, Double(usedRect.width)),
                left: constraint.left + Double(usedRect.origin.x),
                top: Double(usedRect.origin.y),
                height: height,
                ascent: -baseline,
                descent: max(0, height - baseline),
                layoutEngine: layoutEngineIosTextKit,
                fallbackReason: nil
            )
        )
    }

    if lines.isEmpty {
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
                layoutEngine: layoutEngineIosTextKit,
                fallbackReason: nil
            )
        ]
    }

    return lines
}

private func resolveTextKitBaseline(
    layoutManager: NSLayoutManager,
    lineGlyphRange: NSRange,
    characterRange: NSRange
) -> Double {
    guard lineGlyphRange.length > 0 else {
        return 0
    }

    let lineStart = lineGlyphRange.location
    let lineEnd = lineGlyphRange.location + lineGlyphRange.length - 1
    let baselineGlyphIndex = min(max(characterRange.location, lineStart), lineEnd)
    return Double(layoutManager.location(forGlyphAt: baselineGlyphIndex).y)
}

private func applyTextKitBaselineOffset(_ attributedText: NSMutableAttributedString) {
    let fullRange = NSRange(location: 0, length: attributedText.length)
    applyTextKitBaselineOffset(attributedText, range: fullRange)
}

private func applyTextKitBaselineOffset(
    _ attributedText: NSMutableAttributedString,
    range: NSRange
) {
    var maximumLineHeight: CGFloat = 0
    attributedText.enumerateAttribute(.paragraphStyle, in: range, options: []) { value, _, _ in
        guard let paragraphStyle = value as? NSParagraphStyle else {
            return
        }
        maximumLineHeight = max(maximumLineHeight, paragraphStyle.maximumLineHeight)
    }

    guard maximumLineHeight > 0 else {
        return
    }

    var maximumFontLineHeight: CGFloat = 0
    attributedText.enumerateAttribute(.font, in: range, options: []) { value, _, _ in
        guard let font = value as? UIFont else {
            return
        }
        maximumFontLineHeight = max(maximumFontLineHeight, font.lineHeight)
    }

    guard maximumLineHeight >= maximumFontLineHeight else {
        return
    }

    attributedText.addAttribute(
        .baselineOffset,
        value: (maximumLineHeight - maximumFontLineHeight) / 2,
        range: range
    )
}

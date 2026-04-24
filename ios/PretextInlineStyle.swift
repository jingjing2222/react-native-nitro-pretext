import CoreText
import Foundation
import UIKit

internal let fontStyleNormal = "normal"
internal let fontStyleItalic = "italic"
internal let objectReplacementCharacter = "\u{FFFC}"

internal struct NativeTextStyle: Equatable {
    let fontFamily: String
    let fontSize: Double
    let lineHeight: Double
    let letterSpacing: Double
    let locale: String
    let fontWeight: String
    let fontStyle: String
    let includeFontPadding: Bool
    let textDirection: ParagraphTextDirection
}

internal struct NativeTextRun {
    let startUTF16: Int
    let endUTF16: Int
    let style: NativeTextStyle
}

internal struct NativeTokenMetrics {
    let width: Double
    let lineHeight: Double
    let ascent: Double
    let descent: Double
}

internal func defaultTextStyle(from style: ParagraphStyle) -> NativeTextStyle {
    NativeTextStyle(
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        locale: style.locale,
        fontWeight: style.fontWeight ?? "",
        fontStyle: style.fontStyle ?? fontStyleNormal,
        includeFontPadding: style.includeFontPadding ?? true,
        textDirection: style.textDirection ?? .auto
    )
}

internal func resolveTextStyle(
    segment: InlineSegment,
    baseStyle: NativeTextStyle
) -> NativeTextStyle {
    NativeTextStyle(
        fontFamily: segment.fontFamily ?? baseStyle.fontFamily,
        fontSize: segment.fontSize ?? baseStyle.fontSize,
        lineHeight: segment.lineHeight ?? baseStyle.lineHeight,
        letterSpacing: segment.letterSpacing ?? baseStyle.letterSpacing,
        locale: segment.locale ?? baseStyle.locale,
        fontWeight: segment.fontWeight ?? baseStyle.fontWeight,
        fontStyle: segment.fontStyle ?? baseStyle.fontStyle,
        includeFontPadding: baseStyle.includeFontPadding,
        textDirection: baseStyle.textDirection
    )
}

internal func resolveFont(style: NativeTextStyle) -> UIFont {
    let size = max(1, style.fontSize)
    let resolvedWeight = resolveFontWeight(style.fontWeight)
    let wantsItalic = style.fontStyle.lowercased() == fontStyleItalic
    let normalizedFamily = style.fontFamily.trimmingCharacters(in: .whitespacesAndNewlines)
    let isSystemFamily = normalizedFamily.isEmpty
        || normalizedFamily.lowercased() == "system"
        || normalizedFamily.lowercased() == "default"

    if isSystemFamily {
        if wantsItalic {
            let systemFont = UIFont.systemFont(ofSize: size, weight: resolvedWeight)
            let descriptor = systemFont.fontDescriptor.withSymbolicTraits(.traitItalic)
                ?? systemFont.fontDescriptor
            return UIFont(descriptor: descriptor, size: size)
        }
        return UIFont.systemFont(ofSize: size, weight: resolvedWeight)
    }

    let baseFont = UIFont(name: normalizedFamily, size: size)
        ?? UIFont.systemFont(ofSize: size, weight: resolvedWeight)
    var descriptor = baseFont.fontDescriptor.addingAttributes([
        UIFontDescriptor.AttributeName.traits: [
            UIFontDescriptor.TraitKey.weight: resolvedWeight
        ]
    ])
    if wantsItalic {
        descriptor = descriptor.withSymbolicTraits(descriptor.symbolicTraits.union(.traitItalic)) ?? descriptor
    }
    return UIFont(descriptor: descriptor, size: size)
}

internal func buildAttributedText(
    text: String,
    runs: [NativeTextRun],
    inlineBoxes: [NativeInlineBox] = []
) -> NSAttributedString {
    let attributedText = NSMutableAttributedString(string: text)
    for run in runs where run.endUTF16 > run.startUTF16 {
        attributedText.addAttributes(
            textAttributes(for: run.style),
            range: NSRange(location: run.startUTF16, length: run.endUTF16 - run.startUTF16)
        )
    }
    for box in inlineBoxes where box.endUTF16 > box.startUTF16 {
        addInlineBoxRunDelegate(box, to: attributedText)
    }
    return attributedText
}

internal func measureToken(
    _ token: String,
    style: NativeTextStyle
) -> NativeTokenMetrics {
    let font = resolveFont(style: style)
    let attributedText = NSAttributedString(
        string: token,
        attributes: textAttributes(for: style, font: font)
    )
    let line = CTLineCreateWithAttributedString(attributedText)
    var ascent: CGFloat = 0
    var descent: CGFloat = 0
    var leading: CGFloat = 0
    let width = CTLineGetTypographicBounds(line, &ascent, &descent, &leading)
    let actualHeight = max(0, Double(ascent + descent + leading))
    return NativeTokenMetrics(
        width: width,
        lineHeight: max(resolvedLineHeightValue(style.lineHeight, font: font), actualHeight),
        ascent: max(0, Double(ascent)),
        descent: max(0, Double(descent))
    )
}

internal func textAttributes(
    for style: NativeTextStyle,
    font: UIFont? = nil
) -> [NSAttributedString.Key: Any] {
    var attributes: [NSAttributedString.Key: Any] = [
        .font: font ?? resolveFont(style: style)
    ]
    if style.letterSpacing != 0 {
        attributes[.kern] = style.letterSpacing
    }
    if !style.locale.isEmpty {
        attributes[NSAttributedString.Key(rawValue: kCTLanguageAttributeName as String)] = style.locale
    }
    attributes[.paragraphStyle] = paragraphStyle(for: style)
    return attributes
}

private func paragraphStyle(for style: NativeTextStyle) -> NSParagraphStyle {
    let paragraphStyle = NSMutableParagraphStyle()
    switch style.textDirection {
    case .ltr:
        paragraphStyle.baseWritingDirection = .leftToRight
    case .rtl:
        paragraphStyle.baseWritingDirection = .rightToLeft
    case .auto:
        paragraphStyle.baseWritingDirection = .natural
    }
    return paragraphStyle
}

internal func resolvedLineHeightValue(
    _ lineHeight: Double,
    font: UIFont
) -> Double {
    lineHeight > 0 ? lineHeight : Double(font.lineHeight)
}

private func resolveFontWeight(_ fontWeight: String) -> UIFont.Weight {
    switch fontWeight.lowercased() {
    case "100", "thin":
        return .thin
    case "200", "ultralight":
        return .ultraLight
    case "300", "light":
        return .light
    case "500", "medium":
        return .medium
    case "600", "semibold":
        return .semibold
    case "700", "bold":
        return .bold
    case "800", "heavy":
        return .heavy
    case "900", "black":
        return .black
    default:
        return .regular
    }
}

private final class InlineBoxRunDelegateMetrics {
    let ascent: CGFloat
    let descent: CGFloat
    let width: CGFloat

    init(box: NativeInlineBox) {
        ascent = CGFloat(box.baseline)
        descent = CGFloat(max(0, box.height - box.baseline))
        width = CGFloat(box.width)
    }
}

private var inlineBoxRunDelegateCallbacks = CTRunDelegateCallbacks(
    version: kCTRunDelegateVersion1,
    dealloc: { pointer in
        Unmanaged<InlineBoxRunDelegateMetrics>.fromOpaque(pointer).release()
    },
    getAscent: { pointer in
        return Unmanaged<InlineBoxRunDelegateMetrics>
            .fromOpaque(pointer)
            .takeUnretainedValue()
            .ascent
    },
    getDescent: { pointer in
        return Unmanaged<InlineBoxRunDelegateMetrics>
            .fromOpaque(pointer)
            .takeUnretainedValue()
            .descent
    },
    getWidth: { pointer in
        return Unmanaged<InlineBoxRunDelegateMetrics>
            .fromOpaque(pointer)
            .takeUnretainedValue()
            .width
    }
)

private func addInlineBoxRunDelegate(
    _ box: NativeInlineBox,
    to attributedText: NSMutableAttributedString
) {
    var callbacks = inlineBoxRunDelegateCallbacks
    let metrics = InlineBoxRunDelegateMetrics(box: box)
    let pointer = Unmanaged.passRetained(metrics).toOpaque()
    guard let delegate = CTRunDelegateCreate(&callbacks, pointer) else {
        Unmanaged<InlineBoxRunDelegateMetrics>.fromOpaque(pointer).release()
        return
    }
    attributedText.addAttribute(
        NSAttributedString.Key(rawValue: kCTRunDelegateAttributeName as String),
        value: delegate,
        range: NSRange(location: box.startUTF16, length: box.endUTF16 - box.startUTF16)
    )
}

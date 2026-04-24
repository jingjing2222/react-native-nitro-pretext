import UIKit

@objc(PreparedParagraphView)
final class PreparedParagraphView: UIView {
    @objc var preparedId: NSNumber = 0 {
        didSet {
            guard !preparedId.isEqual(to: oldValue) else { return }
            rebuildLayout()
        }
    }

    @objc var paragraphIndex: NSNumber = 0 {
        didSet {
            guard !paragraphIndex.isEqual(to: oldValue) else { return }
            rebuildLayout()
        }
    }

    @objc var layoutWidth: NSNumber = 0 {
        didSet {
            guard !layoutWidth.isEqual(to: oldValue) else { return }
            rebuildLayout()
        }
    }

    @objc var layoutRequest: NSDictionary = [:] {
        didSet {
            guard !layoutRequest.isEqual(to: oldValue as? [AnyHashable: Any] ?? [:]) else { return }
            rebuildLayout()
        }
    }

    @objc var fontFamily: NSString = "System" {
        didSet {
            guard !fontFamily.isEqual(to: oldValue as String) else { return }
            updateTextAttributes()
        }
    }

    @objc var fontWeight: NSString = "" {
        didSet {
            guard !fontWeight.isEqual(to: oldValue as String) else { return }
            updateTextAttributes()
        }
    }

    @objc var fontStyle: NSString = "normal" {
        didSet {
            guard !fontStyle.isEqual(to: oldValue as String) else { return }
            updateTextAttributes()
        }
    }

    @objc var fontSize: NSNumber = 14 {
        didSet {
            guard !fontSize.isEqual(to: oldValue) else { return }
            updateTextAttributes()
        }
    }

    @objc var lineHeight: NSNumber = 20 {
        didSet {
            guard !lineHeight.isEqual(to: oldValue) else { return }
            setNeedsDisplay()
        }
    }

    @objc var letterSpacing: NSNumber = 0 {
        didSet {
            guard !letterSpacing.isEqual(to: oldValue) else { return }
            updateTextAttributes()
        }
    }

    @objc var textColor: UIColor = .black {
        didSet {
            guard !textColor.isEqual(oldValue) else { return }
            updateTextAttributes()
        }
    }

    @objc var contentInsetLeft: NSNumber = 0 {
        didSet {
            guard !contentInsetLeft.isEqual(to: oldValue) else { return }
            setNeedsDisplay()
        }
    }

    @objc var contentInsetTop: NSNumber = 0 {
        didSet {
            guard !contentInsetTop.isEqual(to: oldValue) else { return }
            setNeedsDisplay()
        }
    }

    private var resolvedText: NSString = ""
    private var resolvedAttributedText: NSAttributedString = NSAttributedString(string: "")
    private var resolvedLines: [NativePreparedLineRange] = []
    private var hasStyledRuns = false
    private var cachedFont: UIFont = .systemFont(ofSize: 14)
    private var cachedAttributes: [NSAttributedString.Key: Any] = [:]

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        contentMode = .redraw
        backgroundColor = .clear
        updateTextAttributes()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        super.draw(rect)

        let resolvedLineHeight = CGFloat(truncating: lineHeight)
        let originX = CGFloat(truncating: contentInsetLeft)
        let originY = CGFloat(truncating: contentInsetTop)

        for line in resolvedLines {
            guard
                line.textEndUTF16 > line.textStartUTF16,
                line.textStartUTF16 >= 0,
                line.textEndUTF16 <= resolvedText.length
            else {
                continue
            }

            let lineRect = CGRect(
                x: originX + CGFloat(line.left),
                y: originY + CGFloat(line.top)
                    + max(0, (CGFloat(line.height) - max(0, CGFloat(line.descent - line.ascent))) / 2),
                width: max(CGFloat(line.width), 1),
                height: max(CGFloat(line.height), resolvedLineHeight)
            )
            let range = NSRange(
                location: line.textStartUTF16,
                length: line.textEndUTF16 - line.textStartUTF16
            )
            if hasStyledRuns {
                resolvedAttributedText.attributedSubstring(from: range).draw(
                    with: lineRect,
                    options: [.usesLineFragmentOrigin, .usesFontLeading],
                    context: nil
                )
            } else {
                let lineText = resolvedText.substring(with: range) as NSString
                lineText.draw(in: lineRect, withAttributes: cachedAttributes)
            }
        }
    }

    private func updateTextAttributes() {
        let resolvedStyle = NativeTextStyle(
            fontFamily: fontFamily as String,
            fontSize: fontSize.doubleValue,
            lineHeight: lineHeight.doubleValue,
            letterSpacing: letterSpacing.doubleValue,
            locale: "",
            fontWeight: fontWeight as String,
            fontStyle: fontStyle as String,
            includeFontPadding: true,
            textDirection: .auto
        )
        cachedFont = resolveFont(style: resolvedStyle)

        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineBreakMode = .byClipping

        var attributes: [NSAttributedString.Key: Any] = [
            .font: cachedFont,
            .foregroundColor: textColor,
            .paragraphStyle: paragraphStyle,
        ]
        let resolvedLetterSpacing = CGFloat(truncating: letterSpacing)
        if resolvedLetterSpacing != 0 {
            attributes[.kern] = resolvedLetterSpacing
        }
        cachedAttributes = attributes
        setNeedsDisplay()
    }

    private func rebuildLayout() {
        let resolvedPreparedId = preparedId.doubleValue
        let resolvedParagraphIndex = paragraphIndex.intValue
        let resolvedRequest = resolveLayoutRequest()

        guard resolvedPreparedId > 0, resolvedRequest.width > 0 else {
            resolvedText = ""
            resolvedLines = []
            setNeedsDisplay()
            return
        }

        let drawing = PretextShared.shared.resolveParagraphDrawing(
            preparedId: resolvedPreparedId,
            paragraphIndex: resolvedParagraphIndex,
            request: resolvedRequest
        )
        resolvedText = drawing?.text ?? ("" as NSString)
        resolvedAttributedText = drawing?.attributedText ?? NSAttributedString(string: "")
        resolvedLines = drawing?.lines ?? []
        hasStyledRuns = drawing?.hasStyledRuns ?? false
        setNeedsDisplay()
    }

    private func resolveLayoutRequest() -> NativeLayoutRequest {
        let defaultRequest = NativeLayoutRequest(
            width: max(1, layoutWidth.doubleValue),
            left: 0,
            whiteSpace: whiteSpaceNormal,
            wordBreak: wordBreakNormal,
            shapeSlices: []
        )

        guard layoutRequest.count > 0 else {
            return defaultRequest
        }

        let shapeSlices = (layoutRequest["shapeSlices"] as? [Any] ?? [])
            .compactMap { item -> NativeShapeSlice? in
                guard let slice = item as? [String: Any] else {
                    return nil
                }

                return NativeShapeSlice(
                    top: numberValue(slice["top"]) ?? 0,
                    height: max(0, numberValue(slice["height"]) ?? 0),
                    left: numberValue(slice["left"]) ?? 0,
                    width: max(1, numberValue(slice["width"]) ?? 1)
                )
            }
            .sorted { left, right in
                left.top < right.top
            }

        return NativeLayoutRequest(
            width: max(1, numberValue(layoutRequest["width"]) ?? layoutWidth.doubleValue),
            left: numberValue(layoutRequest["left"]) ?? 0,
            whiteSpace: stringValue(layoutRequest["whiteSpace"])?.lowercased() ?? whiteSpaceNormal,
            wordBreak: stringValue(layoutRequest["wordBreak"])?.lowercased() ?? wordBreakNormal,
            shapeSlices: shapeSlices
        )
    }

    private func numberValue(_ value: Any?) -> Double? {
        if let number = value as? NSNumber {
            return number.doubleValue
        }

        return nil
    }

    private func stringValue(_ value: Any?) -> String? {
        if let string = value as? NSString {
            return string as String
        }

        if let string = value as? String {
            return string
        }

        return nil
    }
}

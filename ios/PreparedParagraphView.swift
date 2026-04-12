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

    @objc var fontFamily: NSString = "System" {
        didSet {
            guard !fontFamily.isEqual(to: oldValue as String) else { return }
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
    private var resolvedLines: [NativePreparedLineRange] = []
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
            let lineText = resolvedText.substring(
                with: NSRange(
                    location: line.textStartUTF16,
                    length: line.textEndUTF16 - line.textStartUTF16
                )
            ) as NSString
            lineText.draw(in: lineRect, withAttributes: cachedAttributes)
        }
    }

    private func updateTextAttributes() {
        let resolvedFontSize = CGFloat(truncating: fontSize)
        cachedFont = UIFont(name: fontFamily as String, size: resolvedFontSize)
            ?? UIFont.systemFont(ofSize: resolvedFontSize)

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
        let resolvedLayoutWidth = layoutWidth.doubleValue
        let resolvedParagraphIndex = paragraphIndex.intValue

        guard resolvedPreparedId > 0, resolvedLayoutWidth > 0 else {
            resolvedText = ""
            resolvedLines = []
            setNeedsDisplay()
            return
        }

        let drawing = PretextShared.shared.resolveParagraphDrawing(
            preparedId: resolvedPreparedId,
            paragraphIndex: resolvedParagraphIndex,
            width: resolvedLayoutWidth
        )
        resolvedText = drawing?.text ?? ("" as NSString)
        resolvedLines = drawing?.lines ?? []
        setNeedsDisplay()
    }
}

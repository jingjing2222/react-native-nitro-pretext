import UIKit

@objc(PreparedParagraphsView)
final class PreparedParagraphsView: UIView {
    @objc var preparedId: NSNumber = 0 {
        didSet {
            guard !preparedId.isEqual(to: oldValue) else { return }
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

    @objc var paragraphCount: NSNumber = 0 {
        didSet {
            guard !paragraphCount.isEqual(to: oldValue) else { return }
            rebuildLayout()
        }
    }

    @objc var paragraphGap: NSNumber = 0 {
        didSet {
            guard !paragraphGap.isEqual(to: oldValue) else { return }
            setNeedsDisplay()
        }
    }

    @objc var textColor: UIColor = .black {
        didSet {
            guard !textColor.isEqual(oldValue) else { return }
            setNeedsDisplay()
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

    private var resolvedDrawings: [NativeParagraphDrawing] = []

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        contentMode = .redraw
        backgroundColor = .clear
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        super.draw(rect)

        guard let context = UIGraphicsGetCurrentContext() else {
            return
        }

        let originX = CGFloat(truncating: contentInsetLeft)
        let insetY = CGFloat(truncating: contentInsetTop)
        let gap = CGFloat(truncating: paragraphGap)
        var paragraphTop: CGFloat = 0

        for (index, drawing) in resolvedDrawings.enumerated() {
            drawPreparedParagraph(
                context: context,
                drawing: drawing,
                textColor: textColor,
                originX: originX,
                originY: paragraphTop + insetY,
                defaultLineHeight: 0
            )
            paragraphTop += preparedParagraphHeight(drawing) + insetY * 2
            if index < resolvedDrawings.count - 1 {
                paragraphTop += gap
            }
        }
    }

    private func rebuildLayout() {
        let resolvedPreparedId = preparedId.doubleValue
        let resolvedRequest = resolveLayoutRequest()

        guard resolvedPreparedId > 0, resolvedRequest.width > 0 else {
            resolvedDrawings = []
            setNeedsDisplay()
            return
        }

        let drawings = PretextShared.shared.resolveParagraphsDrawing(
            preparedId: resolvedPreparedId,
            request: resolvedRequest
        ) ?? []
        let resolvedCount = paragraphCount.intValue
        if resolvedCount > 0 {
            resolvedDrawings = Array(drawings.prefix(resolvedCount))
        } else {
            resolvedDrawings = drawings
        }
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

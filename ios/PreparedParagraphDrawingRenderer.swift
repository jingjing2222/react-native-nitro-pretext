import CoreText
import UIKit

internal func drawPreparedParagraph(
    context: CGContext,
    drawing: NativeParagraphDrawing,
    textColor: UIColor,
    originX: CGFloat,
    originY: CGFloat,
    defaultLineHeight: CGFloat
) {
    context.setFillColor(textColor.cgColor)

    for line in drawing.lines {
        guard
            line.textEndUTF16 > line.textStartUTF16,
            line.textStartUTF16 >= 0,
            line.textEndUTF16 <= drawing.text.length
        else {
            continue
        }

        let ctLine = line.ctLine ?? makeFallbackLine(drawing: drawing, line: line)
        let actualHeight = max(0, CGFloat(line.ascent + line.descent))
        let effectiveLineHeight = max(CGFloat(line.height), defaultLineHeight)
        let centerOffset = max(0, (effectiveLineHeight - actualHeight) / 2)
        let baselineY = originY + CGFloat(line.top) + centerOffset + CGFloat(line.ascent)

        context.saveGState()
        context.textMatrix = .identity
        context.translateBy(x: originX + CGFloat(line.left), y: baselineY)
        context.scaleBy(x: 1, y: -1)
        context.textPosition = .zero
        CTLineDraw(ctLine, context)
        context.restoreGState()
    }
}

internal func preparedParagraphHeight(_ drawing: NativeParagraphDrawing) -> CGFloat {
    guard let lastLine = drawing.lines.last else {
        return 0
    }

    return CGFloat(lastLine.top + lastLine.height)
}

private func makeFallbackLine(
    drawing: NativeParagraphDrawing,
    line: NativePreparedLineRange
) -> CTLine {
    let range = NSRange(
        location: line.textStartUTF16,
        length: line.textEndUTF16 - line.textStartUTF16
    )
    return CTLineCreateWithAttributedString(drawing.attributedText.attributedSubstring(from: range))
}

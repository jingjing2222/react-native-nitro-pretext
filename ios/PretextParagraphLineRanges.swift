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

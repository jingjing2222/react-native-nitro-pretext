import Foundation

class Pretext: HybridPretextSpec {
    public func measure(text: String, fontFamily: String, fontSize: Double) throws -> Double {
        PretextShared.shared.measure(text: text, fontFamily: fontFamily, fontSize: fontSize)
    }

    public func measureBatch(texts: [String], fontFamily: String, fontSize: Double) throws -> [Double] {
        PretextShared.shared.measureBatch(texts: texts, fontFamily: fontFamily, fontSize: fontSize)
    }

    public func prepareParagraphs(
        texts: [String],
        style: ParagraphStyle
    ) throws -> PreparedParagraphState {
        try prepareParagraphsWithStats(texts: texts, style: style).prepared
    }

    public func prepareParagraphsWithStats(
        texts: [String],
        style: ParagraphStyle
    ) throws -> PreparedParagraphResult {
        PretextShared.shared.prepareParagraphsWithStats(texts: texts, style: style)
    }

    public func layoutParagraphs(
        preparedId: Double,
        width: Double
    ) throws -> [LaidOutParagraph] {
        try PretextShared.shared.layoutParagraphs(preparedId: preparedId, width: width)
    }

    public func layoutParagraphsMetadata(
        preparedId: Double,
        width: Double
    ) throws -> [LaidOutParagraphMetrics] {
        try PretextShared.shared.layoutParagraphsMetadata(preparedId: preparedId, width: width)
    }

    public func layoutParagraphLines(
        preparedId: Double,
        width: Double
    ) throws -> [LaidOutParagraphLines] {
        try PretextShared.shared.layoutParagraphLines(preparedId: preparedId, width: width)
    }

    public func releaseParagraphs(preparedId: Double) throws {
        PretextShared.shared.releaseParagraphs(preparedId: preparedId)
    }
}

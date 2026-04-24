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

    public func prepareInlineParagraphSegments(
        paragraphsPayload: String,
        style: ParagraphStyle
    ) throws -> PreparedParagraphState {
        try prepareInlineParagraphSegmentsWithStats(
            paragraphsPayload: paragraphsPayload,
            style: style
        ).prepared
    }

    public func prepareParagraphsWithStats(
        texts: [String],
        style: ParagraphStyle
    ) throws -> PreparedParagraphResult {
        PretextShared.shared.prepareParagraphsWithStats(texts: texts, style: style)
    }

    public func prepareInlineParagraphSegmentsWithStats(
        paragraphsPayload: String,
        style: ParagraphStyle
    ) throws -> PreparedParagraphResult {
        PretextShared.shared.prepareInlineParagraphsWithStats(
            paragraphs: try materializeInlineParagraphs(paragraphsPayload: paragraphsPayload),
            style: style
        )
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

    public func layoutParagraphsWithRequest(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraph] {
        try PretextShared.shared.layoutParagraphs(preparedId: preparedId, request: request)
    }

    public func layoutParagraphsMetadataWithRequest(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraphMetrics] {
        try PretextShared.shared.layoutParagraphsMetadata(preparedId: preparedId, request: request)
    }

    public func layoutParagraphLinesWithRequest(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraphLines] {
        try PretextShared.shared.layoutParagraphLines(preparedId: preparedId, request: request)
    }

    public func layoutParagraphLinesWithDiagnostics(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutParagraphLinesWithDiagnostics] {
        try PretextShared.shared.layoutParagraphLinesWithDiagnostics(
            preparedId: preparedId,
            request: request
        )
    }

    public func layoutRichParagraphLines(
        preparedId: Double,
        request: ParagraphLayoutRequest
    ) throws -> [LaidOutRichParagraphLines] {
        try PretextShared.shared.layoutRichParagraphLines(
            preparedId: preparedId,
            request: request
        )
    }

    public func hitTestPreparedTextPosition(
        preparedId: Double,
        paragraphIndex: Double,
        request: ParagraphLayoutRequest,
        x: Double,
        y: Double
    ) throws -> PreparedTextPosition {
        try PretextShared.shared.hitTestPreparedTextPosition(
            preparedId: preparedId,
            paragraphIndex: paragraphIndex,
            request: request,
            x: x,
            y: y
        )
    }

    public func layoutPreparedTextSelectionRects(
        preparedId: Double,
        range: PreparedTextRange,
        request: ParagraphLayoutRequest
    ) throws -> [PreparedTextSelectionRect] {
        try PretextShared.shared.layoutPreparedTextSelectionRects(
            preparedId: preparedId,
            range: range,
            request: request
        )
    }

    public func selectAllPreparedText(
        preparedId: Double,
        paragraphIndex: Double
    ) throws -> PreparedTextRange {
        try PretextShared.shared.selectAllPreparedText(
            preparedId: preparedId,
            paragraphIndex: paragraphIndex
        )
    }

    public func getPreparedTextSelection(
        preparedId: Double,
        range: PreparedTextRange
    ) throws -> String {
        try PretextShared.shared.getPreparedTextSelection(
            preparedId: preparedId,
            range: range
        )
    }

    public func copyPreparedTextSelection(
        preparedId: Double,
        range: PreparedTextRange
    ) throws -> String {
        try PretextShared.shared.copyPreparedTextSelection(
            preparedId: preparedId,
            range: range
        )
    }

    public func createParagraphLineCursor(
        preparedId: Double,
        paragraphIndex: Double,
        request: ParagraphLayoutRequest
    ) throws -> ParagraphLineCursorState {
        try PretextShared.shared.createParagraphLineCursor(
            preparedId: preparedId,
            paragraphIndex: paragraphIndex,
            request: request
        )
    }

    public func nextParagraphLine(cursorId: Double) throws -> ParagraphLineCursorStep {
        PretextShared.shared.nextParagraphLine(cursorId: cursorId)
    }

    public func releaseParagraphLineCursor(cursorId: Double) throws {
        PretextShared.shared.releaseParagraphLineCursor(cursorId: cursorId)
    }

    public func releaseParagraphs(preparedId: Double) throws {
        PretextShared.shared.releaseParagraphs(preparedId: preparedId)
    }

    private func materializeInlineParagraphs(
        paragraphsPayload: String
    ) throws -> [[InlineSegment]] {
        guard !paragraphsPayload.isEmpty else {
            return []
        }

        guard let data = paragraphsPayload.data(using: .utf8) else {
            throw NSError(
                domain: "Pretext",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Failed to decode inline paragraph payload."]
            )
        }

        guard let root = try JSONSerialization.jsonObject(with: data) as? [[Any]] else {
            throw NSError(
                domain: "Pretext",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Inline paragraph payload must be a nested array."]
            )
        }

        return root.map { paragraph in
            paragraph.compactMap { segment in
                guard let segmentObject = segment as? [String: Any] else {
                    return nil
                }

                return InlineSegment(
                    kind: segmentObject["kind"] as? String,
                    text: segmentObject["text"] as? String ?? "",
                    breakBehavior: segmentObject["breakBehavior"] as? String ?? "",
                    boxId: segmentObject["boxId"] as? String,
                    width: numberValue(segmentObject["width"]),
                    height: numberValue(segmentObject["height"]),
                    baseline: numberValue(segmentObject["baseline"]),
                    accessibilityLabel: segmentObject["accessibilityLabel"] as? String,
                    accessibilityHint: segmentObject["accessibilityHint"] as? String,
                    accessibilityRole: segmentObject["accessibilityRole"] as? String,
                    fontFamily: segmentObject["fontFamily"] as? String,
                    fontSize: numberValue(segmentObject["fontSize"]),
                    lineHeight: numberValue(segmentObject["lineHeight"]),
                    letterSpacing: numberValue(segmentObject["letterSpacing"]),
                    locale: segmentObject["locale"] as? String,
                    fontWeight: segmentObject["fontWeight"] as? String,
                    fontStyle: segmentObject["fontStyle"] as? String
                )
            }
        }
    }

    private func numberValue(_ value: Any?) -> Double? {
        if let number = value as? NSNumber {
            return number.doubleValue
        }

        return nil
    }
}

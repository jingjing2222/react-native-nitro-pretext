import Foundation

class Pretext: HybridPretextSpec {
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
                    kind: nonEmptyString(segmentObject["kind"]),
                    text: segmentObject["text"] as? String ?? "",
                    breakBehavior: segmentObject["breakBehavior"] as? String ?? "",
                    boxId: nonEmptyString(segmentObject["boxId"]),
                    width: numberValue(segmentObject["width"]),
                    height: numberValue(segmentObject["height"]),
                    baseline: numberValue(segmentObject["baseline"]),
                    accessibilityLabel: nonEmptyString(segmentObject["accessibilityLabel"]),
                    accessibilityHint: nonEmptyString(segmentObject["accessibilityHint"]),
                    accessibilityRole: nonEmptyString(segmentObject["accessibilityRole"]),
                    fontFamily: nonEmptyString(segmentObject["fontFamily"]),
                    fontSize: numberValue(segmentObject["fontSize"]),
                    lineHeight: numberValue(segmentObject["lineHeight"]),
                    letterSpacing: numberValue(segmentObject["letterSpacing"]),
                    locale: nonEmptyString(segmentObject["locale"]),
                    fontWeight: nonEmptyString(segmentObject["fontWeight"]),
                    fontStyle: nonEmptyString(segmentObject["fontStyle"])
                )
            }
        }
    }

    private func nonEmptyString(_ value: Any?) -> String? {
        guard let string = value as? String, !string.isEmpty else {
            return nil
        }

        return string
    }

    private func numberValue(_ value: Any?) -> Double? {
        if let number = value as? NSNumber {
            return number.doubleValue
        }

        return nil
    }
}

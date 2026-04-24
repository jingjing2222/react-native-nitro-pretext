import CoreText
import Foundation

internal struct NativeTokenDescriptor {
    let text: String
    let startUTF16: Int
    let endUTF16: Int
    let style: NativeTextStyle
    let inlineBox: NativeInlineBox?

    init(
        text: String,
        startUTF16: Int,
        endUTF16: Int,
        style: NativeTextStyle,
        inlineBox: NativeInlineBox? = nil
    ) {
        self.text = text
        self.startUTF16 = startUTF16
        self.endUTF16 = endUTF16
        self.style = style
        self.inlineBox = inlineBox
    }
}

internal struct NativePreparedToken {
    let text: String
    let startUTF16: Int
    let endUTF16: Int
    let width: Double
    let lineHeight: Double
    let ascent: Double
    let descent: Double
}

internal struct NativePreparedParagraphSeed {
    let text: String
    let tokens: [NativeTokenDescriptor]
    let breakUnits: [NativeTokenDescriptor]
    let runs: [NativeTextRun]
    let atomicSpans: [NativeAtomicSpan]
    let inlineBoxes: [NativeInlineBox]
    let textUnits: Int
    let forceTokenLayout: Bool
}

internal final class NativePreparedParagraph {
    let text: NSString
    let attributedText: NSAttributedString
    let typesetter: CTTypesetter?
    let tokens: [NativePreparedToken]
    let breakUnits: [NativePreparedToken]
    let runs: [NativeTextRun]
    let atomicSpans: [NativeAtomicSpan]
    let inlineBoxes: [NativeInlineBox]
    let forceTokenLayout: Bool

    init(
        text: String,
        attributedText: NSAttributedString,
        typesetter: CTTypesetter?,
        tokens: [NativePreparedToken],
        breakUnits: [NativePreparedToken],
        runs: [NativeTextRun],
        atomicSpans: [NativeAtomicSpan],
        inlineBoxes: [NativeInlineBox],
        forceTokenLayout: Bool
    ) {
        self.text = text as NSString
        self.attributedText = attributedText
        self.typesetter = typesetter
        self.tokens = tokens
        self.breakUnits = breakUnits
        self.runs = runs
        self.atomicSpans = atomicSpans
        self.inlineBoxes = inlineBoxes
        self.forceTokenLayout = forceTokenLayout
    }
}

internal struct NativeAtomicSpan {
    let startUTF16: Int
    let endUTF16: Int
    let source: String
}

internal struct NativeInlineBox {
    let boxId: String
    let startUTF16: Int
    let endUTF16: Int
    let width: Double
    let height: Double
    let baseline: Double
    let breakBehavior: String
    let accessibilityLabel: String?
    let accessibilityHint: String?
    let accessibilityRole: String?
}

internal final class NativePreparedCorpus {
    let paragraphs: [NativePreparedParagraph]
    let baseStyle: NativeTextStyle
    let lineHeight: Double

    private let layoutCacheLimit = 12
    private let layoutCacheLock = NSLock()
    private var layoutCache: [NativeLayoutRequest: [[NativeLineLayout]]] = [:]
    private var layoutCacheOrder: [NativeLayoutRequest] = []

    init(
        paragraphs: [NativePreparedParagraph],
        baseStyle: NativeTextStyle,
        lineHeight: Double
    ) {
        self.paragraphs = paragraphs
        self.baseStyle = baseStyle
        self.lineHeight = lineHeight
    }

    func resolveLineLayouts(
        request: NativeLayoutRequest,
        builder: () -> [[NativeLineLayout]]
    ) -> [[NativeLineLayout]] {
        layoutCacheLock.lock()
        if let cached = layoutCache[request] {
            layoutCacheOrder.removeAll(where: { $0 == request })
            layoutCacheOrder.append(request)
            layoutCacheLock.unlock()
            return cached
        }
        layoutCacheLock.unlock()

        let computed = builder()

        layoutCacheLock.lock()
        if let cached = layoutCache[request] {
            layoutCacheLock.unlock()
            return cached
        }

        layoutCache[request] = computed
        layoutCacheOrder.removeAll(where: { $0 == request })
        layoutCacheOrder.append(request)

        while layoutCacheOrder.count > layoutCacheLimit {
            let evictedRequest = layoutCacheOrder.removeFirst()
            layoutCache.removeValue(forKey: evictedRequest)
        }
        layoutCacheLock.unlock()

        return computed
    }
}

internal struct NativeLineLayout {
    let textStartUTF16: Int
    let textEndUTF16: Int
    let width: Double
    let left: Double
    let top: Double
    let height: Double
    let ascent: Double
    let descent: Double
    let layoutEngine: String
    let fallbackReason: String?
    let ctLine: CTLine?

    init(
        textStartUTF16: Int,
        textEndUTF16: Int,
        width: Double,
        left: Double,
        top: Double,
        height: Double,
        ascent: Double,
        descent: Double,
        layoutEngine: String = layoutEngineIosManualTokenFallback,
        fallbackReason: String? = fallbackReasonManualHeightEstimate,
        ctLine: CTLine? = nil
    ) {
        self.textStartUTF16 = textStartUTF16
        self.textEndUTF16 = textEndUTF16
        self.width = width
        self.left = left
        self.top = top
        self.height = height
        self.ascent = ascent
        self.descent = descent
        self.layoutEngine = layoutEngine
        self.fallbackReason = fallbackReason
        self.ctLine = ctLine
    }
}

internal enum TokenMode {
    case whitespace
    case text
}

internal struct NativeLayoutRequest: Hashable {
    let width: Double
    let left: Double
    let whiteSpace: String
    let wordBreak: String
    let shapeSlices: [NativeShapeSlice]
}

internal struct NativeShapeSlice: Hashable {
    let top: Double
    let height: Double
    let left: Double
    let width: Double
}

internal struct NativeLineConstraint {
    let left: Double
    let width: Double
}

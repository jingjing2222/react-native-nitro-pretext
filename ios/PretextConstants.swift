import Foundation

internal let newlineToken = "\n"
internal let whiteSpaceNormal = "normal"
internal let whiteSpacePre = "pre"
internal let wordBreakNormal = "normal"
internal let wordBreakBreakAll = "break-all"
internal let breakBehaviorNever = "never"
internal let inlineSegmentKindBox = "box"
internal let layoutEngineIosCoreText = "ios_core_text"
internal let layoutEngineIosManualTokenFallback = "ios_manual_token_fallback"
internal let fallbackReasonManualHeightEstimate = "manual_height_estimate"
internal let heightMetricSourcePlatformTextEngineMetrics = "platform_text_engine_metrics"
internal let ruleLayerPretextNative = "pretext_native_rules"
internal let breakKindHard = "hard_break"
internal let breakKindNativeSoft = "native_soft_break"
internal let breakSourceNewline = "source_newline"
internal let driftAlgorithmRule = "algorithm_rule_drift"
internal let driftClusterBoundary = "cluster_boundary_drift"
internal let driftEmojiMetric = "emoji_metric_drift"
internal let driftEngine = "engine_drift"
internal let driftFallbackFont = "fallback_font_drift"
internal let driftHeightMetric = "height_metric_drift"
internal let driftLineBreakStrategy = "line_break_strategy_drift"
internal let driftLocaleMetric = "locale_metric_drift"
internal let driftPadding = "padding_drift"
internal let heightMetricDrivers = [
    "font_metrics",
    "explicit_line_height",
    "fallback_font",
    "emoji_fallback",
    "locale",
    "include_font_padding",
    "line_break_strategy",
]
internal let zeroWidthJoiner: UInt32 = 0x200D

internal func isCombiningMark(_ scalar: UnicodeScalar) -> Bool {
    CharacterSet.nonBaseCharacters.contains(scalar)
}

internal func isVariationSelector(_ scalar: UnicodeScalar) -> Bool {
    (0xFE00...0xFE0F).contains(scalar.value) || (0xE0100...0xE01EF).contains(scalar.value)
}

internal func isEmojiModifier(_ scalar: UnicodeScalar) -> Bool {
    (0x1F3FB...0x1F3FF).contains(scalar.value)
}

internal func isRegionalIndicator(_ scalar: UnicodeScalar) -> Bool {
    (0x1F1E6...0x1F1FF).contains(scalar.value)
}

internal func isIndicVirama(_ scalar: UnicodeScalar) -> Bool {
    [
        0x094D,
        0x09CD,
        0x0A4D,
        0x0ACD,
        0x0B4D,
        0x0BCD,
        0x0C4D,
        0x0CCD,
        0x0D4D,
        0x0DCA,
        0x0E3A,
        0x0F84,
        0x1039,
        0x103A,
        0x1714,
        0x1734,
        0x17D2,
        0x1A60,
    ].contains(scalar.value)
}

internal func isRtlScalar(_ scalar: UnicodeScalar) -> Bool {
    if CharacterSet.decimalDigits.contains(scalar) || isCombiningMark(scalar) {
        return false
    }

    return (0x05D0...0x05EA).contains(scalar.value)
        || (0x0620...0x064A).contains(scalar.value)
        || (0x066E...0x066F).contains(scalar.value)
        || (0x0671...0x06D3).contains(scalar.value)
        || scalar.value == 0x06D5
        || (0x06E5...0x06E6).contains(scalar.value)
        || (0x06EE...0x06EF).contains(scalar.value)
        || (0x06FA...0x06FC).contains(scalar.value)
        || scalar.value == 0x06FF
        || (0x0700...0x074F).contains(scalar.value)
        || (0x0750...0x077F).contains(scalar.value)
        || (0x0780...0x07BF).contains(scalar.value)
        || (0x07C0...0x07FF).contains(scalar.value)
        || (0x0800...0x083F).contains(scalar.value)
        || (0x0840...0x085F).contains(scalar.value)
        || (0x0860...0x086F).contains(scalar.value)
        || (0x0870...0x089F).contains(scalar.value)
        || (0x08A0...0x08FF).contains(scalar.value)
        || (0x10AC0...0x10AFF).contains(scalar.value)
        || (0x10D00...0x10D3F).contains(scalar.value)
        || (0xFB1D...0xFDFF).contains(scalar.value)
        || (0x1E800...0x1E8DF).contains(scalar.value)
        || (0x1E900...0x1E95F).contains(scalar.value)
        || (0xFE70...0xFEFF).contains(scalar.value)
}

internal func isLtrScalar(_ scalar: UnicodeScalar) -> Bool {
    CharacterSet.letters.contains(scalar) && !isRtlScalar(scalar)
}

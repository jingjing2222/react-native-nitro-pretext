package com.margelo.nitro.pretext

internal const val NEWLINE_TOKEN = "\n"
internal const val WHITE_SPACE_NORMAL = "normal"
internal const val WHITE_SPACE_PRE = "pre"
internal const val WORD_BREAK_NORMAL = "normal"
internal const val WORD_BREAK_BREAK_ALL = "break-all"
internal const val BREAK_BEHAVIOR_NEVER = "never"
internal const val INLINE_SEGMENT_KIND_BOX = "box"
internal const val LAYOUT_ENGINE_ANDROID_MEASURED_TEXT_LINE_BREAKER =
  "android_measured_text_line_breaker"
internal const val LAYOUT_ENGINE_ANDROID_STATIC_LAYOUT_COMPAT = "android_static_layout_compat"
internal const val LAYOUT_ENGINE_ANDROID_LEGACY_FALLBACK = "android_legacy_fallback"
internal const val FALLBACK_REASON_MANUAL_HEIGHT_ESTIMATE = "manual_height_estimate"
internal const val FALLBACK_REASON_STATIC_LAYOUT_COMPAT = "static_layout_compat"
internal const val HEIGHT_METRIC_SOURCE_PLATFORM_TEXT_ENGINE_METRICS =
  "platform_text_engine_metrics"
internal const val RULE_LAYER_PRETEXT_NATIVE = "pretext_native_rules"
internal const val BREAK_KIND_HARD = "hard_break"
internal const val BREAK_KIND_NATIVE_SOFT = "native_soft_break"
internal const val DRIFT_CLUSTER_BOUNDARY = "cluster_boundary_drift"
internal const val DRIFT_ALGORITHM_RULE = "algorithm_rule_drift"
internal const val DRIFT_EMOJI_METRIC = "emoji_metric_drift"
internal const val DRIFT_ENGINE = "engine_drift"
internal const val DRIFT_FALLBACK_FONT = "fallback_font_drift"
internal const val DRIFT_HEIGHT_METRIC = "height_metric_drift"
internal const val DRIFT_LINE_BREAK_STRATEGY = "line_break_strategy_drift"
internal const val DRIFT_LOCALE_METRIC = "locale_metric_drift"
internal const val DRIFT_PADDING = "padding_drift"
internal const val ZERO_WIDTH_JOINER = 0x200D

internal val HEIGHT_METRIC_DRIVERS =
  arrayOf(
    "font_metrics",
    "explicit_line_height",
    "fallback_font",
    "emoji_fallback",
    "locale",
    "include_font_padding",
    "line_break_strategy",
  )

internal fun isCombiningMark(codePoint: Int): Boolean {
  return when (Character.getType(codePoint)) {
    Character.NON_SPACING_MARK.toInt(),
    Character.COMBINING_SPACING_MARK.toInt(),
    Character.ENCLOSING_MARK.toInt() -> true
    else -> false
  }
}

internal fun isVariationSelector(codePoint: Int): Boolean {
  return codePoint in 0xFE00..0xFE0F || codePoint in 0xE0100..0xE01EF
}

internal fun isEmojiModifier(codePoint: Int): Boolean {
  return codePoint in 0x1F3FB..0x1F3FF
}

internal fun isRegionalIndicator(codePoint: Int): Boolean {
  return codePoint in 0x1F1E6..0x1F1FF
}

internal fun isIndicVirama(codePoint: Int): Boolean {
  return codePoint in setOf(
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
  )
}

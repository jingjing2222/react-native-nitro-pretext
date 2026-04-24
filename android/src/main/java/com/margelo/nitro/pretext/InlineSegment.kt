package com.margelo.nitro.pretext

data class InlineSegment(
  val kind: String?,
  val text: String,
  val breakBehavior: String,
  val boxId: String?,
  val width: Double?,
  val height: Double?,
  val baseline: Double?,
  val fontFamily: String?,
  val fontSize: Double?,
  val lineHeight: Double?,
  val letterSpacing: Double?,
  val locale: String?,
  val fontWeight: String?,
  val fontStyle: String?,
)

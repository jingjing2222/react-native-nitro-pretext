package com.margelo.nitro.pretext

data class InlineSegment(
  val text: String,
  val breakBehavior: String,
  val fontFamily: String?,
  val fontSize: Double?,
  val lineHeight: Double?,
  val letterSpacing: Double?,
  val locale: String?,
  val fontWeight: String?,
  val fontStyle: String?,
)

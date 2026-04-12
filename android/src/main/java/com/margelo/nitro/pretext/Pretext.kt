package com.margelo.nitro.pretext
  
import android.graphics.Paint
import android.graphics.Typeface
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Pretext : HybridPretextSpec() {
  override fun measure(text: String, fontFamily: String, fontSize: Double): Double {
    val paint = Paint().apply {
      textSize = fontSize.toFloat()
      typeface = resolveTypeface(fontFamily)
      isAntiAlias = true
    }
    return paint.measureText(text).toDouble()
  }

  override fun measureBatch(texts: Array<String>, fontFamily: String, fontSize: Double): DoubleArray {
    val paint = Paint().apply {
      textSize = fontSize.toFloat()
      typeface = resolveTypeface(fontFamily)
      isAntiAlias = true
    }
    return DoubleArray(texts.size) { index -> paint.measureText(texts[index]).toDouble() }
  }

  private fun resolveTypeface(fontFamily: String): Typeface {
    return when (fontFamily.lowercase()) {
      "system", "default", "" -> Typeface.DEFAULT
      "serif" -> Typeface.SERIF
      "monospace" -> Typeface.MONOSPACE
      else ->
        try {
          Typeface.create(fontFamily, Typeface.NORMAL)
        } catch (_: Exception) {
          Typeface.DEFAULT
        }
    }
  }
}

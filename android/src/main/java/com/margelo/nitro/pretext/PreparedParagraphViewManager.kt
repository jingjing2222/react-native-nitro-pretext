package com.margelo.nitro.pretext

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.ModuleSpec
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

internal class PreparedParagraphViewManager : SimpleViewManager<PreparedParagraphView>() {
  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): PreparedParagraphView {
    return PreparedParagraphView(reactContext)
  }

  @ReactProp(name = "preparedId")
  fun setPreparedId(view: PreparedParagraphView, preparedId: Double) {
    view.setPreparedId(preparedId)
  }

  @ReactProp(name = "paragraphIndex")
  fun setParagraphIndex(view: PreparedParagraphView, paragraphIndex: Int) {
    view.setParagraphIndex(paragraphIndex)
  }

  @ReactProp(name = "layoutWidth")
  fun setLayoutWidth(view: PreparedParagraphView, layoutWidth: Double) {
    view.setLayoutWidth(layoutWidth)
  }

  @ReactProp(name = "layoutRequest")
  fun setLayoutRequest(view: PreparedParagraphView, layoutRequest: ReadableMap?) {
    view.setLayoutRequest(parseLayoutRequest(layoutRequest))
  }

  @ReactProp(name = "fontFamily")
  fun setFontFamily(view: PreparedParagraphView, fontFamily: String?) {
    view.setFontFamily(fontFamily)
  }

  @ReactProp(name = "fontWeight")
  fun setFontWeight(view: PreparedParagraphView, fontWeight: String?) {
    view.setFontWeight(fontWeight)
  }

  @ReactProp(name = "fontStyle")
  fun setFontStyle(view: PreparedParagraphView, fontStyle: String?) {
    view.setFontStyle(fontStyle)
  }

  @ReactProp(name = "fontSize")
  fun setFontSize(view: PreparedParagraphView, fontSize: Double) {
    view.setFontSize(fontSize)
  }

  @ReactProp(name = "lineHeight")
  fun setLineHeight(view: PreparedParagraphView, lineHeight: Double) {
    view.setLineHeight(lineHeight)
  }

  @ReactProp(name = "letterSpacing")
  fun setLetterSpacing(view: PreparedParagraphView, letterSpacing: Double) {
    view.setLetterSpacing(letterSpacing)
  }

  @ReactProp(name = "textColor", customType = "Color")
  fun setTextColor(view: PreparedParagraphView, textColor: Int?) {
    view.setParagraphTextColor(textColor)
  }

  @ReactProp(name = "contentInsetLeft")
  fun setContentInsetLeft(view: PreparedParagraphView, contentInsetLeft: Double) {
    view.setContentInsetLeft(contentInsetLeft)
  }

  @ReactProp(name = "contentInsetTop")
  fun setContentInsetTop(view: PreparedParagraphView, contentInsetTop: Double) {
    view.setContentInsetTop(contentInsetTop)
  }

  companion object {
    const val REACT_CLASS = "PreparedParagraphView"

    fun createModuleSpec(): ModuleSpec {
      return ModuleSpec.viewManagerSpec {
        PreparedParagraphViewManager()
      }
    }

    private fun parseLayoutRequest(layoutRequest: ReadableMap?): NativeLayoutRequest? {
      if (layoutRequest == null) {
        return null
      }

      val shapeSlices = if (
        layoutRequest.hasKey("shapeSlices") &&
          layoutRequest.getType("shapeSlices") == ReadableType.Array
      ) {
        buildList {
          val array = layoutRequest.getArray("shapeSlices")
          if (array != null) {
            for (index in 0 until array.size()) {
              val slice = array.getMap(index) ?: continue
              add(
                NativeShapeSlice(
                  top = if (slice.hasKey("top")) slice.getDouble("top") else 0.0,
                  height = maxOf(
                    0.0,
                    if (slice.hasKey("height")) slice.getDouble("height") else 0.0,
                  ),
                  left = if (slice.hasKey("left")) slice.getDouble("left") else 0.0,
                  width = maxOf(
                    1.0,
                    if (slice.hasKey("width")) slice.getDouble("width") else 1.0,
                  ),
                ),
              )
            }
          }
        }.sortedBy { it.top }
      } else {
        emptyList()
      }

      return NativeLayoutRequest(
        width = maxOf(
          1.0,
          if (layoutRequest.hasKey("width")) layoutRequest.getDouble("width") else 1.0,
        ),
        left = if (layoutRequest.hasKey("left")) layoutRequest.getDouble("left") else 0.0,
        whiteSpace = if (
          layoutRequest.hasKey("whiteSpace") &&
            layoutRequest.getType("whiteSpace") == ReadableType.String
        ) {
          layoutRequest.getString("whiteSpace")?.lowercase() ?: WHITE_SPACE_NORMAL
        } else {
          WHITE_SPACE_NORMAL
        },
        wordBreak = if (
          layoutRequest.hasKey("wordBreak") &&
            layoutRequest.getType("wordBreak") == ReadableType.String
        ) {
          layoutRequest.getString("wordBreak")?.lowercase() ?: WORD_BREAK_NORMAL
        } else {
          WORD_BREAK_NORMAL
        },
        shapeSlices = shapeSlices,
      )
    }
  }
}

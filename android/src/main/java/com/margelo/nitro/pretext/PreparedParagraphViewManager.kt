package com.margelo.nitro.pretext

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

  @ReactProp(name = "fontFamily")
  fun setFontFamily(view: PreparedParagraphView, fontFamily: String?) {
    view.setFontFamily(fontFamily)
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
  }
}

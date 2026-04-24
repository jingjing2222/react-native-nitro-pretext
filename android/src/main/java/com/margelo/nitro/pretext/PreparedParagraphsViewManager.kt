package com.margelo.nitro.pretext

import com.facebook.react.bridge.ModuleSpec
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

internal class PreparedParagraphsViewManager : SimpleViewManager<PreparedParagraphsView>() {
  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): PreparedParagraphsView {
    return PreparedParagraphsView(reactContext)
  }

  @ReactProp(name = "preparedId")
  fun setPreparedId(view: PreparedParagraphsView, preparedId: Double) {
    view.setPreparedId(preparedId)
  }

  @ReactProp(name = "layoutWidth")
  fun setLayoutWidth(view: PreparedParagraphsView, layoutWidth: Double) {
    view.setLayoutWidth(layoutWidth)
  }

  @ReactProp(name = "layoutRequest")
  fun setLayoutRequest(view: PreparedParagraphsView, layoutRequest: ReadableMap?) {
    view.setLayoutRequest(PreparedParagraphViewManager.parseLayoutRequest(layoutRequest))
  }

  @ReactProp(name = "paragraphCount")
  fun setParagraphCount(view: PreparedParagraphsView, paragraphCount: Int) {
    view.setParagraphCount(paragraphCount)
  }

  @ReactProp(name = "paragraphGap")
  fun setParagraphGap(view: PreparedParagraphsView, paragraphGap: Double) {
    view.setParagraphGap(paragraphGap)
  }

  @ReactProp(name = "textColor", customType = "Color")
  fun setTextColor(view: PreparedParagraphsView, textColor: Int?) {
    view.setParagraphTextColor(textColor)
  }

  @ReactProp(name = "contentInsetLeft")
  fun setContentInsetLeft(view: PreparedParagraphsView, contentInsetLeft: Double) {
    view.setContentInsetLeft(contentInsetLeft)
  }

  @ReactProp(name = "contentInsetTop")
  fun setContentInsetTop(view: PreparedParagraphsView, contentInsetTop: Double) {
    view.setContentInsetTop(contentInsetTop)
  }

  companion object {
    const val REACT_CLASS = "PreparedParagraphsView"

    fun createModuleSpec(): ModuleSpec {
      return ModuleSpec.viewManagerSpec {
        PreparedParagraphsViewManager()
      }
    }
  }
}

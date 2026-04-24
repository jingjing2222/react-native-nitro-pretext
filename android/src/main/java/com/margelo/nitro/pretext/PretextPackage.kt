package com.margelo.nitro.pretext

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ModuleSpec
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

class PretextPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return null
    }

    override fun getViewManagers(reactContext: ReactApplicationContext): List<ModuleSpec> {
        return listOf(
            PreparedParagraphViewManager.createModuleSpec(),
            PreparedParagraphsViewManager.createModuleSpec(),
        )
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider { HashMap() }
    }

    companion object {
        init {
            System.loadLibrary("pretext")
        }
    }
}

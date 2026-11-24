package com.waqty.app

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ApkInstallerPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == ApkInstallerModule.NAME) ApkInstallerModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                ApkInstallerModule.NAME to ReactModuleInfo(
                    ApkInstallerModule.NAME,
                    ApkInstallerModule.NAME,
                    false,
                    false,
                    false,
                    false,
                ),
            )
        }
}

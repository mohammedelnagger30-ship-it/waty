package com.waqty.app

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/** Opens a downloaded APK with the system installer from inside the app. */
class ApkInstallerModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = NAME

    @ReactMethod
    fun install(filePath: String) {
        try {
            val path = Uri.parse(filePath).path ?: filePath
            val apk = File(path)
            if (!apk.exists()) return
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apk,
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            // The JS layer already shows a fallback link when installation fails.
        }
    }

    companion object {
        const val NAME = "ApkInstaller"
    }
}

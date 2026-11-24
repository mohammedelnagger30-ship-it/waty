package com.waqty.app

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

/** Opens a downloaded APK with the system installer from inside the app. */
class ApkInstallerModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = NAME

    @ReactMethod
    fun install(filePath: String, promise: Promise) {
        try {
            val apk = File(uriPath(filePath))
            if (!apk.exists()) {
                promise.resolve(false)
                return
            }
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.updateprovider",
                apk,
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (_: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun digest(filePath: String, promise: Promise) {
        try {
            val apk = File(uriPath(filePath))
            if (!apk.exists()) {
                promise.resolve("")
                return
            }
            val messageDigest = MessageDigest.getInstance("SHA-256")
            FileInputStream(apk).use { input ->
                val buffer = ByteArray(64 * 1024)
                while (true) {
                    val read = input.read(buffer)
                    if (read <= 0) break
                    messageDigest.update(buffer, 0, read)
                }
            }
            promise.resolve(messageDigest.digest().joinToString("") { "%02x".format(it) })
        } catch (_: Exception) {
            promise.resolve("")
        }
    }

    private fun uriPath(filePath: String): String =
        Uri.parse(filePath).path ?: filePath

    companion object {
        const val NAME = "ApkInstaller"
    }
}

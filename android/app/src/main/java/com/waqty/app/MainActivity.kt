package com.waqty.app
import expo.modules.splashscreen.SplashScreenManager

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowInsets

import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  // Force normal sizing even when the device is in MIUI/Android "Simple mode".
  // This prevents the whole UI from being enlarged/distorted.
  override fun attachBaseContext(newBase: Context?) {
    val config = Configuration(newBase?.resources?.configuration)
    config.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
    config.fontScale = 1.0f
    super.attachBaseContext(newBase?.createConfigurationContext(config) ?: newBase)
  }

  override fun applyOverrideConfiguration(overrideConfiguration: Configuration?) {
    overrideConfiguration?.let {
      it.fontScale = 1.0f
      it.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
    }
    super.applyOverrideConfiguration(overrideConfiguration)
  }

  override fun getResources(): android.content.res.Resources {
    val res = super.getResources()
    val config = res.configuration
    if (config.fontScale != 1.0f) {
      val newConfig = Configuration(config)
      newConfig.fontScale = 1.0f
      newConfig.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
      return createConfigurationContext(newConfig).resources
    }
    return res
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  override fun onResume() {
    super.onResume()
    // Some devices (MIUI with 3-button navigation) report the navigation bar as
    // hidden to the app even though it is drawn on screen, which makes window
    // insets report a bottom inset of 0 and puts bottom UI underneath the system
    // navigation bar. Ask for it explicitly so the insets are reported correctly.
    try {
      ViewCompat.getWindowInsetsController(window.decorView)
          ?.show(WindowInsetsCompat.Type.navigationBars())
      ViewCompat.requestApplyInsets(window.decorView)
    } catch (t: Throwable) {
      // Never let inset handling crash the app.
    }
    logInsets()
  }

  private fun logInsets() {
    try {
      val insets = window.decorView.rootWindowInsets ?: return
      val withCutout =
          WindowInsets.Type.statusBars() or
              WindowInsets.Type.navigationBars() or
              WindowInsets.Type.displayCutout()
      val visible =
          WindowInsets.Type.statusBars() or
              WindowInsets.Type.navigationBars() or
              WindowInsets.Type.captionBar()
      Log.i(
          "OrbitInsets",
          "visible=${insets.getInsets(withCutout)} " +
              "ignoring=${insets.getInsetsIgnoringVisibility(visible)} " +
              "decor=${window.decorView.width}x${window.decorView.height}")
    } catch (t: Throwable) {
      Log.i("OrbitInsets", "error=${t.message}")
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}

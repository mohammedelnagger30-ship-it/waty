/**
 * DISABLED: This patch used to inject `maxFontSizeMultiplier` into React
 * Native's Text/TextInput, but in RN 0.81 that variable is not in scope in
 * TextImpl, so it caused:
 *   ReferenceError: Property 'maxFontSizeMultiplier' doesn't exist
 * which crashed the app on startup.
 *
 * Font scaling is already forced to 1.0 natively in MainActivity.kt
 * (attachBaseContext / applyOverrideConfiguration / getResources all set
 * fontScale = 1.0f and densityDpi = DENSITY_DEVICE_STABLE), so this JS-level
 * patch is unnecessary. Kept as a no-op so `postinstall` does not break.
 */
console.log('[patch-text-scale] disabled (font scaling handled natively in MainActivity.kt)');

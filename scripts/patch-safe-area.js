/**
 * Re-applies the "Orbit" safe-area patch after every `npm install`.
 *
 * Some devices (MIUI with 3-button navigation) report the navigation bar as
 * hidden to the app even though it is drawn on screen, so
 * `react-native-safe-area-context` gets a bottom inset of 0 and bottom UI
 * (the tab bar) ends up underneath the system navigation bar.
 *
 * The patch makes the Android implementation read the navigation bar inset
 * regardless of its reported visibility. It is intentionally kept in
 * node_modules + re-applied here so no extra dependency is required.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-safe-area-context',
  'android',
  'src',
  'main',
  'java',
  'com',
  'th3rdwave',
  'safeareacontext',
  'SafeAreaUtils.kt'
);

const MARKER = 'ORBIT PATCH';

const REPLACEMENTS = [
  {
    find: `  val insets =
      rootView.rootWindowInsets?.getInsets(
          WindowInsets.Type.statusBars() or
              WindowInsets.Type.displayCutout() or
              WindowInsets.Type.navigationBars() or
              WindowInsets.Type.captionBar())
          ?: return null
  return EdgeInsets(
      top = insets.top.toFloat(),
      right = insets.right.toFloat(),
      bottom = insets.bottom.toFloat(),
      left = insets.left.toFloat())`,
    replace: `  val rootInsets = rootView.rootWindowInsets ?: return null
  // ORBIT PATCH: read insets regardless of the reported visibility of the
  // navigation bar so bottom layouts stay above the system navigation bar.
  val insets =
      rootInsets.getInsetsIgnoringVisibility(
          WindowInsets.Type.statusBars() or
              WindowInsets.Type.navigationBars() or
              WindowInsets.Type.captionBar())
  val cutout = rootInsets.getInsets(WindowInsets.Type.displayCutout())
  return EdgeInsets(
      top = max(insets.top, cutout.top).toFloat(),
      right = max(insets.right, cutout.right).toFloat(),
      bottom = insets.bottom.toFloat(),
      left = max(insets.left, cutout.left).toFloat())`,
  },
  {
    find: `      bottom = min(insets.systemWindowInsetBottom, insets.stableInsetBottom).toFloat(),`,
    replace: `      // ORBIT PATCH: fall back to the stable inset when the navigation bar is
      // reported as hidden but still drawn on screen.
      bottom =
          (if (insets.systemWindowInsetBottom == 0) insets.stableInsetBottom
          else min(insets.systemWindowInsetBottom, insets.stableInsetBottom))
              .toFloat(),`,
  },
];

function main() {
  if (!fs.existsSync(FILE)) {
    console.warn('[orbit-patch] safe-area source not found, skipping:', FILE);
    return;
  }

  let source = fs.readFileSync(FILE, 'utf8');
  if (source.includes(MARKER)) {
    return; // already patched
  }

  let changed = false;
  for (const { find, replace } of REPLACEMENTS) {
    if (source.includes(find)) {
      source = source.replace(find, replace);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(FILE, source, 'utf8');
    console.log('[orbit-patch] react-native-safe-area-context patched');
  } else {
    console.warn('[orbit-patch] expected source not found, patch not applied');
  }
}

main();

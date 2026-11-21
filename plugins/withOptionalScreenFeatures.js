// orientation: 'portrait' makes Android imply a *required*
// android.hardware.screen.portrait feature, and Play then blocks installs on
// tablets, ChromeOS, XR, etc. Declare the screen features optional so the app
// stays portrait-locked on phones without restricting device availability.
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURES = [
  'android.hardware.screen.portrait',
  'android.hardware.screen.landscape',
];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = (manifest['uses-feature'] ?? []).filter(
      (f) => !FEATURES.includes(f.$['android:name']),
    );
    for (const name of FEATURES) {
      manifest['uses-feature'].push({
        $: { 'android:name': name, 'android:required': 'false' },
      });
    }
    return cfg;
  });
};

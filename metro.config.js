const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const pkg = require('./package.json');

const config = getDefaultConfig(__dirname);

// The FOSS (F-Droid) build excludes the native expo-camera
// module from autolinking (see package.json `expo.autolinking.exclude`, set by
// scripts/build-android-release.mjs or the fdroiddata recipe). Importing it
// loads a native module that is absent in this build, so redirect its JS
// entrypoint to a local stub.
const fossExcludes = pkg.expo?.autolinking?.exclude ?? [];
const isFossBuild = process.env.EXPO_PUBLIC_FOSS === '1' || fossExcludes.includes('expo-camera');

if (isFossBuild) {
  const stubs = {
    'expo-camera': path.resolve(__dirname, 'lib/foss/expo-camera-stub.tsx'),
  };
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const stub = stubs[moduleName];
    if (stub) {
      return context.resolveRequest(context, stub, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;

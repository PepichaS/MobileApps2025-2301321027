const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Required for NativeWind / react-native-css-interop to handle CSS files
  isCSSEnabled: true,
});

module.exports = withNativeWind(config, {
  input: "./resources/styles/global.css",
  inlineRem: 16,
});

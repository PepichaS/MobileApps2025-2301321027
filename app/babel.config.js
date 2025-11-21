module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Needed by @rn-primitives and other worklet-based libraries
      "react-native-worklets/plugin",
      // Reanimated plugin should stay last
      "react-native-reanimated/plugin",
    ],
  };
};

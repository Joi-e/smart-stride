module.exports = {
  presets: ["babel-preset-expo"], // Use the Expo Babel preset
  plugins: [
    [
      "module:react-native-dotenv",
      {
        moduleName: "@env",
        path: ".env",
      },
    ],
    ["@babel/plugin-transform-private-methods", { loose: true }],
    ["@babel/plugin-transform-class-properties", { loose: true }],
    ["@babel/plugin-transform-private-property-in-object", { loose: true }],
    ["react-native-reanimated/plugin"],
    ["@babel/plugin-transform-flow-strip-types"],
    ["@babel/plugin-proposal-decorators", { legacy: true }],
  ],
};

const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("txt");

config.transformer.babelTransformerPath = require.resolve(
  "react-native-dotenv"
);

config.watchFolders = ["node_modules"];

module.exports = config;

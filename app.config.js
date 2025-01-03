export default {
  expo: {
    name: "FirstApp",
    slug: "your-app-slug",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.FirstApp",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app needs access to your location to show nearby walking routes.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app needs access to your location to track your walks and show nearby routes.",
        UIBackgroundModes: ["location", "fetch"],
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.anonymous.FirstApp",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
      eas: {
        projectId: "714e6c96-9c70-4aac-9ea3-97f8639450f6",
      },
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location to find walking routes near you.",
          locationAlwaysPermission:
            "Allow $(PRODUCT_NAME) to use your location to track your walks in the background.",
          locationWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location to find nearby routes.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera.",
        },
      ],
    ],
    updates: {
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/714e6c96-9c70-4aac-9ea3-97f8639450f6",
    },
    runtimeVersion: "1.0.0",
  },
};

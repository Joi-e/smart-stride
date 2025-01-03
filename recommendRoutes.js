const recommendRoutes = async (userLocation, preferences) => {
  const googleMapsApiKey = Constants.expoConfig.extra.googleMapsApiKey;
  const sceneryType = preferences.exerciseScenery;
  const difficulty = preferences.fitnessLevel || "Intermediate";
  const difficultySettings = DIFFICULTY_RANGES[difficulty];
  const radius = difficultySettings.maxDistance * 1000;
  const searchType = POI_TYPES[sceneryType]?.join("|") || "park";

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${userLocation.latitude},${userLocation.longitude}&` +
        `radius=${radius}&` +
        `type=${searchType}&` +
        `key=${googleMapsApiKey}`
    );

    const data = await response.json();
    if (!data || !data.results || data.results.length === 0) {
      console.log("No results found for nearby search.");
      return [];
    }

    const recommendedRoutes = data.results.map((point) => ({
      name: point.name,
      rating: point.rating,
      address: point.vicinity,
      type: sceneryType,
    }));

    return recommendedRoutes;
  } catch (error) {
    console.error("Error recommending routes:", error);
    return [];
  }
};

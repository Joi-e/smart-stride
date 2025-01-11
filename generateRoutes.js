import { decode } from "@googlemaps/polyline-codec";
import Constants from "expo-constants";
import { PathFinder } from "../FirstApp/Pathfinding";
import IntelligentModel from "./IntelligentModel";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

const DIFFICULTY_RANGES = {
  Beginner: {
    maxElevation: 50,
    maxDistance: 5,
    minDistance: 0.7,
    walkingSpeed: 4.0,
    complexityFactor: 1,
  },
  Intermediate: {
    maxElevation: 300,
    maxDistance: 10,
    minDistance: 5,
    walkingSpeed: 5.0,
    complexityFactor: 1.5,
  },
  Advanced: {
    maxElevation: 500,
    maxDistance: 15,
    minDistance: 5,
    walkingSpeed: 6.0,
    complexityFactor: 2,
  },
};

const POI_TYPES = {
  "Nature Walks": ["park", "natural_feature"],
  Urban: [
    "point_of_interest",
    "restaurant",
    "cafe",
    "shopping_mall",
    "library",
    "city_hall",
    "train_station",
    "pharmacy",
    "gym",
  ],
  Landmarks: [
    "museum",
    "church",
    "historic_site",
    "monument",
    "tourist_attraction",
    "stadium",
    "art_gallery",
  ],
};

const WEATHER_SCORES = {
  "clear sky": 10,
  "few clouds": 9,
  "scattered clouds": 8,
  "broken clouds": 7,
  "overcast clouds": 6,
  "light rain": 5,
  "moderate rain": 4,
  mist: 4,
  "heavy rain": 2,
  thunderstorm: 1,
  snow: 1,
  default: 5,
};

const WIND_SPEED_PENALTIES = {
  light: { maxSpeed: 5, penalty: 0 },
  moderate: { maxSpeed: 10, penalty: -2 },
  strong: { maxSpeed: 15, penalty: -4 },
  severe: { maxSpeed: Infinity, penalty: -6 },
};

const fetchWeatherData = async (latitude, longitude) => {
  const weatherApiKey = Constants.expoConfig.extra.openWeatherApiKey;
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${weatherApiKey}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch weather data.");
  }
  return await response.json();
};

const formatDuration = (minutes) => {
  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 60) {
    return `${roundedMinutes} min`;
  }
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const getWindSpeedPenalty = (windSpeed) => {
  for (const category of Object.values(WIND_SPEED_PENALTIES)) {
    if (windSpeed <= category.maxSpeed) {
      return category.penalty;
    }
  }
  return WIND_SPEED_PENALTIES.severe.penalty;
};

const getWeatherScore = (weatherDescription, windSpeed, temperature) => {
  const baseScore =
    WEATHER_SCORES[weatherDescription.toLowerCase()] || WEATHER_SCORES.default;
  const windPenalty = getWindSpeedPenalty(windSpeed);
  let tempPenalty = 0;

  if (temperature < 15) {
    tempPenalty = -(15 - temperature) / 2;
  } else if (temperature > 25) {
    tempPenalty = -(temperature - 25) / 2;
  }

  return Math.max(0, baseScore + windPenalty + tempPenalty);
};

const generateRoutes = async (userLocation, preferences) => {
  console.log("Initial preferences passed to generateRoutes:", preferences);
  console.log("Google Maps API Key present:", !!googleMapsApiKey);
  const googleMapsApiKey = Constants.expoConfig.extra.googleMapsApiKey;
  const mlSystem = new IntelligentModel();
  const user = auth.currentUser;

  try {
    // 1. Get user preferences
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    const latestPreferences = userDoc.data()?.preferences || preferences;
    console.log("Latest preferences from Firestore:", latestPreferences);

    // 2. Set up difficulty settings
    const preferredLevel = latestPreferences.fitnessLevel || "Intermediate";
    let difficultySettings = DIFFICULTY_RANGES[preferredLevel];
    console.log("User preferred difficulty level:", preferredLevel);

    // 3. Get ML performance level
    const performanceLevel = await mlSystem.calculatePerformanceLevel(user.uid);
    console.log("ML suggested performance level:", performanceLevel);

    // 4. Set up route parameters

    const sceneryType = latestPreferences.exerciseScenery;
    const isUrbanAdvanced =
      sceneryType === "Urban" &&
      (preferredLevel === "Intermediate" || preferredLevel === "Advanced");

    const searchType = POI_TYPES[sceneryType]?.join("|") || "park";

    // Function to get coordinates at a specific distance and bearing
    const getCoordinatesAtDistance = (
      startLat,
      startLng,
      distanceKm,
      bearing
    ) => {
      const R = 6371; // Earth's radius in km
      const bearingRad = (bearing * Math.PI) / 180;
      const startLatRad = (startLat * Math.PI) / 180;
      const startLngRad = (startLng * Math.PI) / 180;

      const distRatio = distanceKm / R;
      const endLatRad = Math.asin(
        Math.sin(startLatRad) * Math.cos(distRatio) +
          Math.cos(startLatRad) * Math.sin(distRatio) * Math.cos(bearingRad)
      );
      const endLngRad =
        startLngRad +
        Math.atan2(
          Math.sin(bearingRad) * Math.sin(distRatio) * Math.cos(startLatRad),
          Math.cos(distRatio) - Math.sin(startLatRad) * Math.sin(endLatRad)
        );

      return {
        latitude: (endLatRad * 180) / Math.PI,
        longitude: (endLngRad * 180) / Math.PI,
      };
    };

    let searchPoints = [userLocation];
    let searchParams = {};

    if (isUrbanAdvanced) {
      // Special handling for urban intermediate/advanced routes
      const targetDistance =
        (difficultySettings.minDistance + difficultySettings.maxDistance) / 2;
      searchPoints = [];
      // Create search points in a circle around the user
      for (let bearing = 0; bearing < 360; bearing += 60) {
        searchPoints.push(
          getCoordinatesAtDistance(
            userLocation.latitude,
            userLocation.longitude,
            targetDistance * 0.7, // Search at 70% of target distance
            bearing
          )
        );
      }
      searchParams.rankby = "distance"; // Use distance-based ranking for urban routes
    } else {
      // For all other routes, use a fixed radius
      searchParams.radius = 1000; // Fixed 1km radius for non-urban routes
    }
    // Collect POIs from all search points
    let allPoints = [];
    for (const searchPoint of searchPoints) {
      const queryParams = new URLSearchParams({
        location: `${searchPoint.latitude},${searchPoint.longitude}`,
        type: searchType,
        key: googleMapsApiKey,
        ...searchParams,
      }).toString();

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${queryParams}`
      );

      if (!response.ok) continue;

      const data = await response.json();
      if (data.results?.length) {
        allPoints = [...allPoints, ...data.results];
      }

      // Add delay between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Remove duplicates
    allPoints = [
      ...new Map(allPoints.map((point) => [point.place_id, point])).values(),
    ];

    // Calculate distances from user location
    const pointsWithDistance = allPoints.map((point) => ({
      ...point,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        point.geometry.location.lat,
        point.geometry.location.lng
      ),
    }));

    console.log(
      "Distance distribution:",
      pointsWithDistance.reduce((acc, point) => {
        const range = Math.floor(point.distance);
        acc[range] = (acc[range] || 0) + 1;
        return acc;
      }, {})
    );

    // Filter points within difficulty range
    const validPoints = pointsWithDistance
      .filter(
        (point) =>
          point.distance >= difficultySettings.minDistance &&
          point.distance <= difficultySettings.maxDistance
      )
      .sort((a, b) => {
        // Sort by distance appropriately for difficulty level
        if (
          preferredLevel === "Intermediate" ||
          preferredLevel === "Advanced"
        ) {
          return b.distance - a.distance; // Longer routes first
        }
        return a.distance - b.distance; // Shorter routes first
      })
      .slice(0, 5);

    console.log(
      `Found ${validPoints.length} valid points for ${sceneryType} ${preferredLevel} routes`
    );
    validPoints.forEach((point) => {
      console.log(
        `Selected point: ${point.name}, distance: ${point.distance.toFixed(
          2
        )}km`
      );
    });
    // 7. Get weather data for all points
    const weatherDataList = await Promise.all(
      validPoints.map((point) =>
        fetchWeatherData(
          point.geometry.location.lat,
          point.geometry.location.lng
        )
      )
    );

    // 8. Create routes
    const routes = [];
    for (let i = 0; i < validPoints.length; i++) {
      const point = validPoints[i];
      const weather = weatherDataList[i];

      const endPoint = {
        latitude: point.geometry.location.lat,
        longitude: point.geometry.location.lng,
      };

      const mainRoute = await createRoute(
        userLocation,
        endPoint,
        preferredLevel,
        difficultySettings
      );

      if (mainRoute?.coordinates?.length > 0) {
        const pathFinder = new PathFinder(mainRoute.coordinates);
        let aStarPath = await pathFinder.findPathAStar(userLocation, endPoint);
        let dijkstraPath = await pathFinder.findPathDijkstra(
          userLocation,
          endPoint
        );

        const weatherScore = getWeatherScore(
          weather.weather[0].description,
          weather.wind.speed,
          weather.main.temp
        );

        // Fallback to main route if pathfinding fails
        if (!aStarPath?.length) aStarPath = mainRoute.coordinates;
        if (!dijkstraPath?.length) dijkstraPath = mainRoute.coordinates;

        const aStarMetrics = await calculateRouteMetrics(aStarPath);
        const dijkstraMetrics = await calculateRouteMetrics(dijkstraPath);

        routes.push({
          id: point.place_id,
          name: point.name,
          type: sceneryType,
          difficulty: preferredLevel,
          userPreferredLevel: preferredLevel,
          adjustedDifficulty: performanceLevel || preferredLevel,
          weather: weather.weather[0].description,
          temperature: `${weather.main.temp}°C`,
          windSpeed: `${weather.wind.speed} m/s`,
          feelsLike: `${Math.round(weather.main.feels_like)}°C`,
          humidity: `${weather.main.humidity}%`,
          weatherScore: weatherScore.toFixed(1),
          paths: {
            main: {
              ...mainRoute,
              duration: formatDuration(mainRoute.duration),
              distance: parseFloat(mainRoute.distance).toFixed(1),
              pathType: "Google Directions",
            },
            aStar: {
              coordinates: aStarPath,
              distance: aStarMetrics.distance,
              duration: formatDuration(aStarMetrics.duration),
              elevationGain: aStarMetrics.elevationGain,
              pathType: "A*",
            },
            dijkstra: {
              coordinates: dijkstraPath,
              distance: dijkstraMetrics.distance,
              duration: formatDuration(dijkstraMetrics.duration),
              elevationGain: dijkstraMetrics.elevationGain,
              pathType: "Dijkstra",
            },
          },
          destination: {
            name: point.name,
            rating: point.rating,
            address: point.vicinity,
          },
        });
      }
    }

    // 9. Score and sort routes
    const scoredRoutes = await mlSystem.scoreRoutes(routes, user.uid, {
      preferredLevel,
      performanceLevel: performanceLevel || preferredLevel,
    });

    return scoredRoutes;
  } catch (error) {
    console.error("Error generating routes:", error);
    return [];
  }
};

const createRoute = async (
  startPoint,
  endPoint,
  difficulty,
  difficultySettings
) => {
  const googleMapsApiKey = Constants.expoConfig.extra.googleMapsApiKey;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${startPoint.latitude},${startPoint.longitude}&` +
        `destination=${endPoint.latitude},${endPoint.longitude}&` +
        `mode=walking&` +
        `departure_time=now&` +
        `traffic_model=best_guess&` +
        `key=${googleMapsApiKey}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch directions.");
    }

    const data = await response.json();
    if (!data.routes?.length) {
      console.log("No routes found.");
      return null;
    }

    const route = data.routes[0];
    const distance = route.legs[0].distance?.value / 1000 || 0;
    const duration =
      (route.legs[0].duration_in_traffic?.value ||
        route.legs[0].duration?.value ||
        0) / 60;

    const coordinates = decode(route.overview_polyline.points, 5).map(
      (point) => ({
        latitude: point[0],
        longitude: point[1],
      })
    );

    // Get elevation data
    const path = coordinates
      .map((coord) => `${coord.latitude},${coord.longitude}`)
      .join("|");

    const elevationResponse = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?` +
        `locations=${path}&` +
        `key=${googleMapsApiKey}`
    );

    if (!elevationResponse.ok) {
      throw new Error("Failed to fetch elevation data.");
    }

    const elevationData = await elevationResponse.json();
    let elevationGain = 0;

    for (let i = 1; i < elevationData.results.length; i++) {
      const elevDiff =
        elevationData.results[i].elevation -
        elevationData.results[i - 1].elevation;
      if (elevDiff > 0) {
        elevationGain += elevDiff;
      }
    }

    if (
      elevationGain > difficultySettings.maxElevation ||
      distance > difficultySettings.maxDistance ||
      distance < difficultySettings.minDistance
    ) {
      console.log(
        `Route rejected for ${endPoint.latitude},${endPoint.longitude}:`,
        `Elevation Gain: ${elevationGain}, Distance: ${distance}`
      );
      return null;
    }

    return {
      distance,
      coordinates,
      duration,
      elevationGain,
      instructions: route.legs[0].steps.map((step) => step.html_instructions),
    };
  } catch (error) {
    console.error("Error creating route:", error);
    return null;
  }
};

const calculateRouteMetrics = async (coordinates) => {
  if (!coordinates?.length || coordinates.length < 2) {
    return {
      distance: "0.0",
      duration: 0,
      elevationGain: 0,
    };
  }

  let distance = 0;
  let elevationGain = 0;

  for (let i = 1; i < coordinates.length; i++) {
    if (coordinates[i] && coordinates[i - 1]) {
      distance += calculateDistance(
        coordinates[i - 1].latitude,
        coordinates[i - 1].longitude,
        coordinates[i].latitude,
        coordinates[i].longitude
      );
    }
  }

  try {
    const path = coordinates
      .filter((coord) => coord?.latitude && coord?.longitude)
      .map((coord) => `${coord.latitude},${coord.longitude}`)
      .join("|");

    const elevationResponse = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?` +
        `locations=${path}&` +
        `key=${Constants.expoConfig.extra.googleMapsApiKey}`
    );

    if (elevationResponse.ok) {
      const elevationData = await elevationResponse.json();
      if (elevationData.results) {
        for (let i = 1; i < elevationData.results.length; i++) {
          const elevDiff =
            elevationData.results[i].elevation -
            elevationData.results[i - 1].elevation;
          if (elevDiff > 0) {
            elevationGain += elevDiff;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error getting elevation data:", error);
  }

  const duration = (distance / 5.0) * 60;

  return {
    distance: parseFloat(distance).toFixed(1),
    duration,
    elevationGain,
  };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default generateRoutes;

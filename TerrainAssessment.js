import Constants from "expo-constants";

export class TerrainAssessment {
  /**
   * Assess terrain passage between two geographic points
   * @param {Object} point1 - First point with lat and lng
   * @param {Object} point2 - Second point with lat and lng
   * @param {string} difficulty - Difficulty level (Beginner, Intermediate, Advanced)
   * @returns {Promise<Object>} Terrain assessment result
   */
  static async assessTerrain(point1, point2, difficulty = "Intermediate") {
    // Difficulty-based terrain constraints
    const DIFFICULTY_CONSTRAINTS = {
      Beginner: {
        maxSlope: 5, // 5% max slope
        maxElevationChange: 30, // 30m max elevation change
        terrainTypes: ["flat", "gentle_slope"],
      },
      Intermediate: {
        maxSlope: 10, // 10% max slope
        maxElevationChange: 100, // 100m max elevation change
        terrainTypes: ["flat", "gentle_slope", "moderate_slope"],
      },
      Advanced: {
        maxSlope: 20, // 20% max slope
        maxElevationChange: 300, // 300m max elevation change
        terrainTypes: ["flat", "gentle_slope", "moderate_slope", "steep_slope"],
      },
    };

    try {
      // Construct path for elevation API
      const path = `${point1.lat},${point1.lng}|${point2.lat},${point2.lng}`;
      const googleMapsApiKey = Constants.expoConfig.extra.googleMapsApiKey;

      // Fetch elevation data
      const elevationResponse = await fetch(
        `https://maps.googleapis.com/maps/api/elevation/json?` +
          `locations=${path}&` +
          `key=${googleMapsApiKey}`
      );

      const elevationData = await elevationResponse.json();

      // Validate elevation data
      if (!elevationData.results || elevationData.results.length < 2) {
        return {
          passable: false,
          reason: "Insufficient elevation data",
          details: elevationData,
        };
      }

      // Calculate elevation details
      const elevations = elevationData.results.map(
        (result) => result.elevation
      );
      const elevationChange = Math.abs(elevations[1] - elevations[0]);

      // Calculate distance between points (using Haversine formula)
      const R = 6371; // Earth's radius in kilometers
      const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
      const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((point1.lat * Math.PI) / 180) *
          Math.cos((point2.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c * 1000; // Convert to meters

      // Calculate slope
      const slope = (elevationChange / distance) * 100;

      // Get terrain constraints for the specified difficulty
      const constraints =
        DIFFICULTY_CONSTRAINTS[difficulty] ||
        DIFFICULTY_CONSTRAINTS.Intermediate;

      // Assess terrain passability
      const passable =
        slope <= constraints.maxSlope &&
        elevationChange <= constraints.maxElevationChange;

      return {
        passable,
        slope: parseFloat(slope.toFixed(2)),
        elevationChange: parseFloat(elevationChange.toFixed(2)),
        distance: parseFloat(distance.toFixed(2)),
        reason: passable
          ? "Terrain is suitable"
          : slope > constraints.maxSlope
          ? "Slope too steep"
          : "Elevation change too high",
        details: {
          point1Elevation: elevations[0],
          point2Elevation: elevations[1],
          constraints,
        },
      };
    } catch (error) {
      console.error("Terrain Assessment Error:", error);
      return {
        passable: false,
        reason: "Assessment failed",
        error: error.message,
      };
    }
  }

  /**
   * Categorize terrain type based on slope
   * @param {number} slope - Slope percentage
   * @returns {string} Terrain type category
   */
  static categorizeTerrain(slope) {
    if (slope <= 2) return "flat";
    if (slope <= 5) return "gentle_slope";
    if (slope <= 10) return "moderate_slope";
    return "steep_slope";
  }
}

export default TerrainAssessment;

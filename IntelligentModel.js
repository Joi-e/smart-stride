import {
  getFirestore,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

class IntelligentModel {
  constructor() {
    this.db = getFirestore();
    this.weights = {
      completionRate: 0.4,
      averageSpeed: 0.2,
      weatherPreference: 0.15,
      terrainPreference: 0.15,
      userFeedback: 0.1,
    };

    // New constants for progression control
    this.MIN_ROUTES_FOR_PROGRESSION = 3;
    this.MAX_DIFFICULTY_JUMP = 1;
    this.DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];
  }

  async calculatePerformanceLevel(userId) {
    try {
      const routesRef = collection(this.db, `users/${userId}/completedRoutes`);
      const routesSnap = await getDocs(routesRef);

      if (routesSnap.empty) {
        return null;
      }

      // Get current user preferences
      const userPrefs = await this.getUserPreferences(userId);
      const currentLevel = userPrefs?.preferredDifficulty || "Beginner";

      let totalRoutes = 0;
      let completedRoutes = 0;
      let avgSpeedScore = 0;
      let weatherScoreSum = 0;
      let terrainScoreSum = 0;
      let feedbackSum = 0;

      // Only consider recent routes (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      routesSnap.forEach((doc) => {
        const data = doc.data();
        const routeDate = data.completionDate?.toDate() || new Date();

        if (routeDate >= thirtyDaysAgo) {
          totalRoutes++;

          if (data.completed) {
            completedRoutes++;
            const speedScore = data.actualSpeed / data.expectedSpeed;
            avgSpeedScore += speedScore;
            weatherScoreSum += data.weatherScore || 0;
            terrainScoreSum += data.terrainScore || 0;
            feedbackSum += data.userRating || 3;
          }
        }
      });

      // Don't suggest changes if user hasn't completed enough routes
      if (totalRoutes < this.MIN_ROUTES_FOR_PROGRESSION) {
        return currentLevel;
      }

      // Calculate weighted scores
      const completionScore =
        (completedRoutes / totalRoutes) * this.weights.completionRate;
      const speedScore =
        (avgSpeedScore / completedRoutes) * this.weights.averageSpeed;
      const weatherScore =
        (weatherScoreSum / completedRoutes) * this.weights.weatherPreference;
      const terrainScore =
        (terrainScoreSum / completedRoutes) * this.weights.terrainPreference;
      const feedbackScore =
        (feedbackSum / completedRoutes) * this.weights.userFeedback;

      const totalScore =
        completionScore +
        speedScore +
        weatherScore +
        terrainScore +
        feedbackScore;

      // Get suggested level based on score
      const suggestedLevel = this.mapScoreToDifficulty(totalScore);

      // Constrain the suggestion to maximum one level difference
      return this.constrainDifficultyJump(currentLevel, suggestedLevel);
    } catch (error) {
      console.error("Error calculating performance level:", error);
      return null;
    }
  }

  constrainDifficultyJump(currentLevel, suggestedLevel) {
    const currentIndex = this.DIFFICULTY_LEVELS.indexOf(currentLevel);
    const suggestedIndex = this.DIFFICULTY_LEVELS.indexOf(suggestedLevel);

    if (suggestedIndex > currentIndex) {
      return this.DIFFICULTY_LEVELS[
        Math.min(
          currentIndex + this.MAX_DIFFICULTY_JUMP,
          this.DIFFICULTY_LEVELS.length - 1
        )
      ];
    } else if (suggestedIndex < currentIndex) {
      return this.DIFFICULTY_LEVELS[
        Math.max(currentIndex - this.MAX_DIFFICULTY_JUMP, 0)
      ];
    }

    return currentLevel;
  }

  mapScoreToDifficulty(score) {
    // More conservative thresholds
    if (score < 0.5) return "Beginner";
    if (score < 0.8) return "Intermediate";
    return "Advanced";
  }

  adjustRouteParameters(baseParams, userPerformance) {
    // More conservative adjustment factor
    const adjustmentFactor = 0.05; // Reduced from 0.1 to 0.05 (5% adjustment per level)

    return {
      maxElevation:
        baseParams.maxElevation *
        (1 + (userPerformance - 1) * adjustmentFactor),
      maxDistance:
        baseParams.maxDistance * (1 + (userPerformance - 1) * adjustmentFactor),
      walkingSpeed:
        baseParams.walkingSpeed *
        (1 + (userPerformance - 1) * adjustmentFactor),
      complexityFactor:
        baseParams.complexityFactor *
        (1 + (userPerformance - 1) * adjustmentFactor),
    };
  }

  async scoreRoutes(routes, userId, difficultyInfo) {
    const userPreferences = await this.getUserPreferences(userId);

    return routes
      .map((route) => {
        let score = 0;

        // Weather score (0-1)
        const weatherScore = (parseFloat(route.weatherScore) || 0) / 10;
        score += weatherScore * this.weights.weatherPreference;

        // Difficulty match score (0-1)
        const preferredDifficultyMatch = this.calculateDifficultyMatch(
          route.difficulty,
          difficultyInfo.preferredLevel
        );
        const performanceDifficultyMatch = this.calculateDifficultyMatch(
          route.difficulty,
          difficultyInfo.performanceLevel
        );

        const difficultyScore =
          preferredDifficultyMatch * 0.7 + performanceDifficultyMatch * 0.3;
        score += difficultyScore * this.weights.completionRate;

        // Distance preference match (0-1)
        const distanceMatch = this.calculateDistanceMatch(
          parseFloat(route.paths.main.distance),
          userPreferences.preferredDistance || 5
        );
        score += distanceMatch * this.weights.terrainPreference;

        // Ensure score is properly formatted
        const finalScore = Math.min(Math.max(score, 0), 1);

        return {
          ...route,
          mlScore: finalScore.toFixed(2),
        };
      })
      .sort((a, b) => parseFloat(b.mlScore) - parseFloat(a.mlScore));
  }
  calculateDifficultyMatch(routeDifficulty, userLevel) {
    const difficultyLevels = ["Beginner", "Intermediate", "Advanced"];
    const routeIndex = difficultyLevels.indexOf(routeDifficulty);
    const userIndex = difficultyLevels.indexOf(userLevel);

    return 1 - Math.abs(routeIndex - userIndex) / difficultyLevels.length;
  }

  calculateDistanceMatch(routeDistance, preferredDistance) {
    const difference = Math.abs(routeDistance - preferredDistance);
    return Math.max(0, 1 - difference / preferredDistance);
  }

  async getUserPreferences(userId) {
    try {
      const userDocRef = doc(this.db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        return (
          userDocSnap.data()?.preferences || {
            preferredDistance: 5,
            preferredDifficulty: "Beginner",
          }
        );
      } else {
        console.error("User document not found.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return null;
    }
  }
}

export default IntelligentModel;

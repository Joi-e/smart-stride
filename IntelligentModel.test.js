import { jest } from "@jest/globals";
import IntelligentModel from "./IntelligentModel";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

describe("IntelligentModel", () => {
  let model;
  let mockFirestore;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    model = new IntelligentModel();
    mockFirestore = {};
  });

  describe("Performance Level Calculation Tests", () => {
    it("should return null when user has no completed routes", async () => {
      // Mock empty routes collection
      const mockRoutesSnap = { empty: true };
      require("firebase/firestore").getDocs.mockResolvedValue(mockRoutesSnap);

      const result = await model.calculatePerformanceLevel("testUserId");
      expect(result).toBeNull();
    });

    it("should maintain current level when not enough routes completed", async () => {
      // Mock user preferences
      require("firebase/firestore").getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            preferredDifficulty: "Beginner",
          },
        }),
      });

      // Mock only 2 completed routes (below MIN_ROUTES_FOR_PROGRESSION)
      const mockRoutesSnap = {
        empty: false,
        forEach: (callback) => {
          callback({
            data: () => ({ completed: true, completionDate: new Date() }),
          });
          callback({
            data: () => ({ completed: true, completionDate: new Date() }),
          });
        },
      };
      require("firebase/firestore").getDocs.mockResolvedValue(mockRoutesSnap);

      const result = await model.calculatePerformanceLevel("testUserId");
      expect(result).toBe("Beginner");
    });
  });

  describe("Route Parameter Adjustment Tests", () => {
    it("should correctly adjust route parameters based on performance", () => {
      const baseParams = {
        maxElevation: 100,
        maxDistance: 5,
        walkingSpeed: 5,
        complexityFactor: 1,
      };

      const result = model.adjustRouteParameters(baseParams, 2);

      expect(result.maxElevation).toBeGreaterThan(baseParams.maxElevation);
      expect(result.maxDistance).toBeGreaterThan(baseParams.maxDistance);
      expect(result.walkingSpeed).toBeGreaterThan(baseParams.walkingSpeed);
      expect(result.complexityFactor).toBeGreaterThan(
        baseParams.complexityFactor
      );
    });
  });

  describe("Route Scoring Tests", () => {
    it("should correctly score and sort routes based on user preferences", async () => {
      // Mock user preferences
      require("firebase/firestore").getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            preferredDistance: 5,
            preferredDifficulty: "Intermediate",
          },
        }),
      });

      const mockRoutes = [
        {
          difficulty: "Intermediate",
          weatherScore: "8",
          paths: { main: { distance: 5 } },
        },
        {
          difficulty: "Beginner",
          weatherScore: "6",
          paths: { main: { distance: 3 } },
        },
      ];

      const difficultyInfo = {
        preferredLevel: "Intermediate",
        performanceLevel: "Intermediate",
      };

      const scoredRoutes = await model.scoreRoutes(
        mockRoutes,
        "testUserId",
        difficultyInfo
      );

      // First route should have higher score as it better matches preferences
      expect(parseFloat(scoredRoutes[0].mlScore)).toBeGreaterThan(
        parseFloat(scoredRoutes[1].mlScore)
      );
    });
  });

  describe("Difficulty Match Calculation Tests", () => {
    it("should return perfect match score for same difficulty levels", () => {
      const score = model.calculateDifficultyMatch(
        "Intermediate",
        "Intermediate"
      );
      expect(score).toBe(1);
    });

    it("should return lower score for adjacent difficulty levels", () => {
      const score = model.calculateDifficultyMatch("Beginner", "Intermediate");
      expect(score).toBeLessThan(1);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe("Distance Match Calculation Tests", () => {
    it("should return perfect match for same distances", () => {
      const score = model.calculateDistanceMatch(5, 5);
      expect(score).toBe(1);
    });

    it("should return lower score for different distances", () => {
      const score = model.calculateDistanceMatch(3, 5);
      expect(score).toBeLessThan(1);
      expect(score).toBeGreaterThan(0);
    });
  });
});

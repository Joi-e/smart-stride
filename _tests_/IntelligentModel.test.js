// __tests__/IntelligentModel.test.js

// Basic test to verify Jest is working
test("sanity check", () => {
  expect(true).toBe(true);
});

// Import your IntelligentModel
const IntelligentModel = require("../IntelligentModel");

describe("IntelligentModel", () => {
  let model;

  beforeEach(() => {
    model = new IntelligentModel();
  });

  // Test calculating difficulty match
  test("calculateDifficultyMatch returns 1 for same difficulty", () => {
    const result = model.calculateDifficultyMatch(
      "Intermediate",
      "Intermediate"
    );
    expect(result).toBe(1);
  });

  // Test calculating distance match
  test("calculateDistanceMatch returns 1 for same distance", () => {
    const result = model.calculateDistanceMatch(5, 5);
    expect(result).toBe(1);
  });

  // Test route parameter adjustments
  test("adjustRouteParameters increases parameters for higher performance", () => {
    const baseParams = {
      maxElevation: 100,
      maxDistance: 5,
      walkingSpeed: 5,
      complexityFactor: 1,
    };

    const result = model.adjustRouteParameters(baseParams, 2);

    expect(result.maxElevation).toBeGreaterThan(baseParams.maxElevation);
    expect(result.maxDistance).toBeGreaterThan(baseParams.maxDistance);
  });
});

import React, { useState, useEffect, useRef } from "react";
import RouteFeedbackForm from "../RouteFeedback";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Vibration,
  Modal,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, doc, updateDoc, setDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { ProgressBar } from "react-native-paper";

// Utility: Haversine formula for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const toRadians = (deg) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Distance in km
};

const simulateMovement = (routeCoordinates, steps = 100) => {
  const coords = [];
  const totalSegments = routeCoordinates.length - 1;
  const pointsPerSegment = Math.ceil(steps / totalSegments);

  for (let i = 0; i < totalSegments; i++) {
    const start = routeCoordinates[i];
    const end = routeCoordinates[i + 1];

    for (let j = 0; j <= pointsPerSegment; j++) {
      const fraction = j / pointsPerSegment;
      const latitude =
        start.latitude + (end.latitude - start.latitude) * fraction;
      const longitude =
        start.longitude + (end.longitude - start.longitude) * fraction;

      // Simulate realistic speed variations (between 1.2 and 1.6 m/s)
      const speed = 1.2 + Math.random() * 0.4;

      coords.push({
        latitude,
        longitude,
        altitude: start.altitude || 0,
        accuracy: 5,
        speed,
        timestamp: Date.now() + coords.length * 1000,
      });
    }
  }

  return coords;
};

const RouteTrackingScreen = ({ route, navigation }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationStateRef = useRef({
    currentIndex: 0,
    simulatedCoords: [],
    intervalId: null,
    isPaused: false,
  });
  const [lastMilestoneReached, setLastMilestoneReached] = useState(0);
  const [location, setLocation] = useState(null);
  const [stats, setStats] = useState({
    speed: 0,
    distance: 0,
    duration: 0,
    elevationGain: 0,
    xp: 0,
    progress: 0,
  });
  const [isTracking, setIsTracking] = useState(true);
  const [routeDeviationCount, setRouteDeviationCount] = useState(0);
  const [userPath, setUserPath] = useState([]);

  const mapRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lastLocationRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  const selectedRoute = route.params?.route;
  const selectedPathType = route.params?.selectedPathType || "main";
  const routeCoordinates =
    selectedRoute?.paths?.[selectedPathType]?.coordinates || [];

  const ROUTE_DEVIATION_THRESHOLD = 50;
  const MILESTONE_INTERVALS = [25, 50, 75, 100];

  const simulatedDistanceRef = useRef(0);

  const simulationTimeRef = useRef({
    startTime: null,
    pausedTime: 0,
    lastPauseTime: null,
  });

  const accumulatedStatsRef = useRef({
    xp: 0,
    distance: 0,
    lastProcessedIndex: 0,
    processedMilestones: new Set(),
  });

  // Helper function to safely convert float to integer
  const safeFloatToInt = (value) => {
    // Ensure we have a number
    const num = Number(value) || 0;
    // Round to nearest integer to avoid floating point issues
    return Math.round(num);
  };

  const progressValue = () => {
    try {
      // Normalize progress to a value between 0 and 1 for ProgressBar
      const progress = Math.min(100, Math.max(0, stats.progress || 0));
      return progress / 100; // Value between 0 and 1
    } catch (error) {
      console.warn("Progress calculation error:", error);
      return 0;
    }
  };

  useEffect(() => {
    if (isSimulating && routeCoordinates.length > 0) {
      // Only generate coordinates if not already generated
      if (simulationStateRef.current.simulatedCoords.length === 0) {
        simulationStateRef.current.simulatedCoords =
          simulateMovement(routeCoordinates);
        accumulatedStatsRef.current = {
          xp: 0,
          distance: 0,
          lastProcessedIndex: 0,
          processedMilestones: new Set(),
        };
      }

      const startSimulation = () => {
        const interval = setInterval(() => {
          const { currentIndex, simulatedCoords, isPaused } =
            simulationStateRef.current;

          if (!isPaused && currentIndex < simulatedCoords.length) {
            handleLocationUpdate({ coords: simulatedCoords[currentIndex] });
            simulationStateRef.current.currentIndex++;
          } else if (currentIndex >= simulatedCoords.length) {
            clearInterval(interval);
            setIsSimulating(false);
            handleFinishRoute();
          }
        }, 1000);

        simulationStateRef.current.intervalId = interval;
        return interval;
      };

      const interval = startSimulation();
      return () => clearInterval(interval);
    }
  }, [isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      accumulatedXPRef.current = 0;
    }
  }, [isSimulating]);

  useEffect(() => {
    if (isSimulating) {
      if (!simulationTimeRef.current.startTime) {
        simulationTimeRef.current.startTime = Date.now();
      } else if (simulationTimeRef.current.lastPauseTime) {
        // If resuming from pause, adjust the start time
        simulationTimeRef.current.pausedTime +=
          Date.now() - simulationTimeRef.current.lastPauseTime;
        simulationTimeRef.current.lastPauseTime = null;
      }
    } else if (simulationTimeRef.current.startTime) {
      // Record pause time
      simulationTimeRef.current.lastPauseTime = Date.now();
    }
  }, [isSimulating]);

  const startTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for route tracking."
        );
        return;
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        handleLocationUpdate
      );
    } catch (error) {
      console.error("Error starting tracking:", error);
      Alert.alert("Error", "Failed to start route tracking.");
    }
  };

  const stopTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
    }
    setIsTracking(false);
  };

  const handleLocationUpdate = (newLocation) => {
    try {
      const coords = newLocation.coords;
      setLocation(coords);
      setUserPath((prev) => [...prev, coords]);

      const newStats = calculateStats(coords);
      setStats(newStats);

      checkRouteDeviation(coords);
      checkMilestones(newStats.progress);
      centerMapOnUser(coords);

      lastLocationRef.current = {
        ...coords,
        timestamp: newLocation.timestamp || Date.now(),
      };
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };
  const toggleSimulation = () => {
    if (isSimulating) {
      // If stopping simulation, clear the interval
      if (simulationStateRef.current.intervalId) {
        clearInterval(simulationStateRef.current.intervalId);
      }
      simulationStateRef.current.isPaused = true;
    } else {
      // If starting simulation, resume from last position
      simulationStateRef.current.isPaused = false;
    }
    setIsSimulating(!isSimulating);
  };

  const accumulatedXPRef = useRef(0);
  const lastProcessedIndexRef = useRef(0);

  const calculateXP = (distance, speed, elevationGain) => {
    // Calculate XP for this segment only
    const segmentDistance = Math.max(
      0,
      distance - accumulatedStatsRef.current.distance
    );

    // Base XP from distance (10 XP per km)
    const baseXP = segmentDistance * 10;

    // Steps XP (1 XP per 100 steps)
    const newSteps = Math.round(segmentDistance * 1312);
    const stepsXP = Math.floor(newSteps / 100);

    // Speed bonus (5 XP per km if speed > 6 km/h)
    const speedBonus = speed > 6 ? segmentDistance * 5 : 0;

    // Elevation bonus (1 XP per 10m gained)
    const elevationBonus = Math.floor(elevationGain / 10);

    // Calculate segment XP
    const segmentXP = baseXP + stepsXP + speedBonus + elevationBonus;

    // Add to accumulated XP
    accumulatedStatsRef.current.xp += segmentXP;
    accumulatedStatsRef.current.distance = distance;

    // Return total accumulated XP rounded to 1 decimal place
    return Math.round(accumulatedStatsRef.current.xp * 10) / 10;
  };

  const calculateTotalRouteDistance = () => {
    let totalDistance = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      totalDistance += calculateDistance(
        routeCoordinates[i - 1].latitude,
        routeCoordinates[i - 1].longitude,
        routeCoordinates[i].latitude,
        routeCoordinates[i].longitude
      );
    }
    return totalDistance;
  };

  const calculateStats = (coords) => {
    const currentTime = Date.now();
    const duration = Math.floor((currentTime - startTimeRef.current) / 1000);

    let newDistance = 0;
    let speed = 0;
    let elevationGain = stats.elevationGain;

    if (lastLocationRef.current) {
      if (isSimulating) {
        // For simulation, calculate distance between consecutive points
        const segmentDistance = calculateDistance(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          coords.latitude,
          coords.longitude
        );
        simulatedDistanceRef.current += segmentDistance;
        newDistance = simulatedDistanceRef.current;
      } else {
        // For real tracking, use accumulated distance
        newDistance =
          stats.distance +
          calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            coords.latitude,
            coords.longitude
          );
      }
      // Calculate speed in km/h
      const timeDiff =
        (currentTime - lastLocationRef.current.timestamp) / 1000 / 3600;
      speed = timeDiff > 0 ? (newDistance - stats.distance) / timeDiff : 0;

      const elevationChange =
        coords.altitude - (lastLocationRef.current.altitude || 0);
      if (elevationChange > 0) elevationGain += elevationChange;
    }

    const newXP = calculateXP(newDistance, speed, elevationGain);
    const progress = calculateRouteProgress(coords);

    return {
      speed: Math.round(speed * 10) / 10,
      distance: Math.round(newDistance * 1000) / 1000,
      duration,
      elevationGain: Math.round(elevationGain * 100) / 100,
      xp: newXP,
      progress: Math.round(progress),
    };
  };

  useEffect(() => {
    if (isSimulating) {
      simulatedDistanceRef.current = 0;
    }
  }, [isSimulating]);

  // Clean up function
  useEffect(() => {
    return () => {
      if (simulationStateRef.current.intervalId) {
        clearInterval(simulationStateRef.current.intervalId);
      }
    };
  }, []);

  const calculateRouteProgress = (coords) => {
    if (!routeCoordinates?.length) return stats.progress || 0;

    let closestPointDistance = Infinity;
    let progressIndex = 0;

    routeCoordinates.forEach((point, index) => {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        point.latitude,
        point.longitude
      );
      if (distance < closestPointDistance) {
        closestPointDistance = distance;
        progressIndex = index;
      }
    });

    const newProgress = (progressIndex / (routeCoordinates.length - 1)) * 100;
    return Math.max(stats.progress, Math.round(newProgress)); // Ensure progress doesn't go backward
  };

  const checkRouteDeviation = (coords) => {
    if (!routeCoordinates?.length) return;

    // Find the closest point and its distance
    const closestPointDistance = routeCoordinates.reduce(
      (minDistance, point) => {
        const distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          point.latitude,
          point.longitude
        );
        return Math.min(minDistance, distance);
      },
      Infinity
    );

    // Increase threshold for initial route start
    const INITIAL_DEVIATION_THRESHOLD = 0.2; // 200 meters
    const LATER_DEVIATION_THRESHOLD = 0.05; // 50 meters

    // Use a larger threshold at the beginning and smaller later
    const currentThreshold =
      stats.progress < 10
        ? INITIAL_DEVIATION_THRESHOLD
        : ROUTE_DEVIATION_THRESHOLD / 1000;

    if (closestPointDistance > currentThreshold) {
      setRouteDeviationCount((prev) => prev + 1);
      Vibration.vibrate(500);
      Alert.alert(
        "Route Deviation",
        "You have deviated from the planned route."
      );
    }
  };

  const milestoneAlertShownRef = useRef(false);

  const checkMilestones = (progress) => {
    const milestone = MILESTONE_INTERVALS.find(
      (milestone) =>
        progress >= milestone &&
        milestone > lastMilestoneReached &&
        !accumulatedStatsRef.current.processedMilestones.has(milestone)
    );

    if (milestone) {
      accumulatedStatsRef.current.processedMilestones.add(milestone);
      setLastMilestoneReached(milestone);

      Vibration.vibrate(1000);

      if (milestone === 100) {
        Alert.alert(
          "Route Completed!",
          "Congratulations! You've completed the route!",
          [
            {
              text: "OK",
              onPress: async () => {
                await handleFinishRoute();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Milestone Reached",
          `You've completed ${milestone}% of the route!`,
          [
            {
              text: "OK",
              onPress: () => {
                simulationStateRef.current.isPaused = false;
              },
            },
          ]
        );
      }
    }
  };

  const handleRouteCompletion = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const finalStats = {
        distance: isSimulating ? simulatedDistanceRef.current : stats.distance,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        elevationGain: stats.elevationGain,
        xp: Math.round(accumulatedStatsRef.current.xp),
        deviations: routeDeviationCount,
        progress: stats.progress,
        timestamp: new Date().toISOString(),
      };

      // Save completion data to Firestore
      const db = getFirestore();
      const completionRef = doc(
        db,
        "users",
        user.uid,
        "completedRoutes",
        selectedRoute.id
      );

      const completionData = {
        routeId: selectedRoute.id,
        userId: user.uid,
        pathType: selectedPathType,
        stats: finalStats,
      };

      // Save to completedRoutes collection
      await setDoc(completionRef, completionData);

      // Save to route history collection with unique timestamp-based ID
      const historyRef = doc(
        db,
        "users",
        user.uid,
        "routeHistory",
        `${selectedRoute.id}_${Date.now()}`
      );
      await setDoc(historyRef, {
        ...completionData,
        timestamp: new Date().toISOString(),
      });

      console.log("Navigation stats:", {
        distance: finalStats.distance,
        duration: finalStats.duration,
        xp: finalStats.xp,
        progress: finalStats.progress,
      });

      // Navigate to completion screen with all necessary data
      navigation.navigate("RouteCompleteScreen", {
        distance: finalStats.distance,
        duration: finalStats.duration,
        xp: finalStats.xp,
        progress: finalStats.progress,
        userId: user.uid,
        routeId: selectedRoute.id,
        elevationGain: finalStats.elevationGain,
        deviations: finalStats.deviations,
      });
    } catch (error) {
      console.error("Error saving completion data:", error);
      Alert.alert(
        "Error",
        "Failed to save route completion data. Please try again."
      );
    }
  };

  const handleFinishRoute = async () => {
    // Stop tracking/simulation
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
    }
    setIsTracking(false);
    setIsSimulating(false);

    // Clear any running intervals
    if (simulationStateRef.current.intervalId) {
      clearInterval(simulationStateRef.current.intervalId);
    }

    // Ensure we have final stats before completion
    const finalCoords = userPath[userPath.length - 1];
    if (finalCoords) {
      handleLocationUpdate({ coords: finalCoords });
    }

    // Handle route completion
    setTimeout(async () => {
      await handleRouteCompletion();
    }, 100);
  };

  const centerMapOnUser = (coords) => {
    mapRef.current?.animateToRegion({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={!isSimulating} // Only show real location when not simulating
        followsUserLocation={!isSimulating}
      >
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF0000"
            strokeWidth={3}
          />
        )}
        {userPath.length > 0 && (
          <Polyline
            coordinates={userPath}
            strokeColor="#FF4081"
            strokeWidth={3}
          />
        )}
        {isSimulating && userPath.length > 0 && (
          <Marker
            coordinate={userPath[userPath.length - 1]}
            title="Current Position"
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerDot} />
              <View style={styles.markerHalo} />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Ionicons name="speedometer" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{stats.speed.toFixed(1)} km/h</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="walk" size={24} color="#FF4081" />
          <Text style={styles.statValue}>{stats.distance.toFixed(2)} km</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="ribbon" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.xp} xp</Text>
        </View>
      </View>

      <ProgressBar
        animatedValue={progressValue()}
        color="#2196F3"
        style={styles.progressBar}
      />

      <TouchableOpacity
        style={[styles.stopButton, { backgroundColor: "#4CAF50" }]}
        onPress={toggleSimulation}
      >
        <Text style={styles.stopButtonText}>
          {isSimulating ? "Pause Simulation" : "Start Simulation"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.stopButton} onPress={handleFinishRoute}>
        <Text style={styles.stopButtonText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 3,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  progressBar: {
    height: 10,
    margin: 10,
  },
  stopButton: {
    margin: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#FF4081",
    alignItems: "center",
  },
  stopButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  simulateButton: {
    margin: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    alignItems: "center",
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2196F3",
    borderWidth: 2,
    borderColor: "white",
  },
  markerHalo: {
    position: "absolute",
    backgroundColor: "rgba(33, 150, 243, 0.2)",
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export default RouteTrackingScreen;

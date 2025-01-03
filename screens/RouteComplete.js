import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

const RouteCompleteScreen = ({ route, navigation }) => {
  const {
    distance = 0, // Total distance covered
    duration = 0, // Time taken for the route (in seconds)
    xp = 0, // XP earned for this route
    progress = 0, // Overall progress percentage
    userId, // User's ID passed as a route param
  } = route.params || {};

  const [level, setLevel] = useState(1);
  const [totalXP, setTotalXP] = useState(0);
  const [nextLevelXP, setNextLevelXP] = useState(100);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, "users", userId, "profile", "details");
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const { totalXP: userXP = 0 } = userDoc.data();
          const userLevel = calculateLevel(userXP);
          setTotalXP(userXP);
          setLevel(userLevel);
          setNextLevelXP(calculateNextLevelXP(userLevel));
        } else {
          // Initialise user data if not existing
          const defaultData = { totalXP: 0, level: 1 };
          await setDoc(userDocRef, defaultData);
          setTotalXP(defaultData.totalXP);
          setLevel(defaultData.level);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  useEffect(() => {
    if (!loading) {
      const updatedXP = totalXP + xp;
      const updatedLevel = calculateLevel(updatedXP);
      const newNextLevelXP = calculateNextLevelXP(updatedLevel);

      setTotalXP(updatedXP);
      setLevel(updatedLevel);
      setNextLevelXP(newNextLevelXP);

      updateUserData(updatedXP, updatedLevel);

      // Badge unlocking logic
      const badges = [];
      if (distance >= 5) badges.push("Explorer Badge");
      if (progress >= 100) badges.push("Route Master Badge");
      if (duration <= 1800 && distance >= 3) badges.push("Speedster Badge");
      setEarnedBadges(badges);
    }
  }, [loading, xp, distance, progress, duration]);

  const completeRoute = async () => {
    try {
      const userId = auth.currentUser?.uid; // Ensure the user is authenticated
      if (!userId) {
        console.error("User not logged in");
        return;
      }

      // Fetch user's weekly progress
      const progressRef = doc(db, "users", userId, "progress", "weekly");
      const progressDoc = await getDoc(progressRef);
      const progressData = progressDoc.exists() ? progressDoc.data() : {};

      const updatedCompletedDates = [
        ...(progressData.completedDates || []),
        new Date().toISOString(),
      ];
      const updatedDaysCompleted = updatedCompletedDates.length;

      // Update progress in Firestore
      await setDoc(progressRef, {
        ...progressData,
        daysCompleted: updatedDaysCompleted,
        completedDates: updatedCompletedDates,
      });

      // Update total distance in the 'completedroutes' document
      const routesRef = doc(db, "users", userId, "stats", "completedroutes");
      const routesDoc = await getDoc(routesRef);
      const routesData = routesDoc.exists() ? routesDoc.data() : {};

      const updatedTotalDistance = (routesData.totalDistance || 0) + distance; // Add the current route's distance

      await setDoc(
        routesRef,
        {
          ...routesData,
          totalDistance: updatedTotalDistance,
        },
        { merge: true }
      );

      Alert.alert("Route Completed", `You covered ${distance.toFixed(2)} km!`);
    } catch (error) {
      console.error("Error completing route:", error);
      Alert.alert("Error", "Unable to complete route. Please try again later.");
    }
  };
  const updateUserData = async (updatedXP, updatedLevel) => {
    try {
      const userDocRef = doc(db, "users", userId, "profile", "details");
      await setDoc(
        userDocRef,
        { totalXP: updatedXP, level: updatedLevel },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  const calculateLevel = (xp) => {
    let level = 1;
    let xpThreshold = 100;
    while (xp >= xpThreshold) {
      level++;
      xp -= xpThreshold;
      xpThreshold += 50;
    }
    return level;
  };

  const calculateNextLevelXP = (level) => {
    let xpThreshold = 100;
    for (let i = 1; i < level; i++) {
      xpThreshold += 50;
    }
    return xpThreshold;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Congratulations!</Text>
      <Text style={styles.text}>You've completed your route!</Text>

      <Text style={styles.stats}>Distance: {distance.toFixed(2)} km</Text>
      <Text style={styles.stats}>Time: {Math.round(duration / 60)} mins</Text>
      <Text style={styles.stats}>XP Earned: {xp}</Text>
      <Text style={styles.stats}>Total XP: {totalXP}</Text>
      <Text style={styles.stats}>Current Level: {level}</Text>
      <Text style={styles.stats}>
        XP for Next Level: {nextLevelXP - (totalXP % nextLevelXP)} remaining
      </Text>

      {earnedBadges.length > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeTitle}>You unlocked new badges:</Text>
          {earnedBadges.map((badge, index) => (
            <Text key={index} style={styles.badge}>
              {badge}
            </Text>
          ))}
        </View>
      )}

      {/* Round Green Button */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={async () => {
          await completeRoute();
          navigation.navigate("Main");
        }}
      >
        <Text style={styles.homeButtonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#4CAF50",
  },
  text: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  stats: {
    fontSize: 16,
    marginBottom: 10,
  },
  badgeContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2196F3",
    marginBottom: 10,
  },
  badge: {
    fontSize: 16,
    fontWeight: "bold",
    color: "green",
  },
  homeButton: {
    marginTop: 20,
    backgroundColor: "#4CAF50", // Green background
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50, // Makes the button round
    alignItems: "center",
    justifyContent: "center",
    width: 200, // Adjust width if necessary
  },
});

export default RouteCompleteScreen;

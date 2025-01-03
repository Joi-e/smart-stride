import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { fetchXPAndLevel } from "./levelLogic";
import { auth, db } from "../firebase";
import { doc, getDocs, setDoc, collection, getDoc } from "firebase/firestore";
import RouteMap from "../components/RouteMap";
import {
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
} from "expo-location";

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    return "Good evening";
  } else {
    return "Good night";
  }
};

const fetchTotalDistance = async (userId) => {
  try {
    const completedRoutesRef = collection(
      db,
      "users",
      userId,
      "completedRoutes"
    );
    const querySnapshot = await getDocs(completedRoutesRef);

    let totalDistance = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.stats && data.stats.distance) {
        totalDistance += data.stats.distance;
      }
    });

    return totalDistance;
  } catch (error) {
    console.error("Error fetching completed routes:", error);
    return 0;
  }
};

const HomeScreen = () => {
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [preferredName, setPreferredName] = useState("");
  const [greeting, setGreeting] = useState(getTimeBasedGreeting());
  const [weeklyProgress, setWeeklyProgress] = useState({
    daysCompleted: 0,
    exerciseDays: 0, // Initialize to 0 instead of hardcoded 5
    totalDistance: 0,
    lastResetDate: new Date().toISOString(),
    completedDates: [],
  });
  const [userPreferences, setUserPreferences] = useState({
    exerciseDays: 0,
  });

  // Update greeting every minute to handle time changes
  useEffect(() => {
    const greetingInterval = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60000);

    return () => clearInterval(greetingInterval);
  }, []);

  const getLocation = async () => {
    const { status } = await requestForegroundPermissionsAsync();
    if (status === "granted") {
      const currentLocation = await getCurrentPositionAsync({});
      console.log("Current location:", currentLocation);
    } else {
      Alert.alert("Permission denied", "Unable to access location.");
    }
  };

  const initializeProgressSchema = async (userId, exerciseDays) => {
    const progressRef = doc(db, "users", userId, "progress", "weekly");
    const progressDoc = await getDoc(progressRef);

    if (!progressDoc.exists()) {
      await setDoc(progressRef, {
        daysCompleted: 0,
        exerciseDays: exerciseDays, // Use the user's preferred exercise days
        totalDistance: 0,
        lastResetDate: new Date().toISOString(),
        completedDates: [],
      });
    }
  };

  const fetchUserPreferences = async (userId) => {
    try {
      const preferencesDoc = await getDoc(doc(db, "users", userId));
      if (preferencesDoc.exists()) {
        const preferences = preferencesDoc.data().preferences || {};
        setUserPreferences({
          exerciseDays: preferences.exerciseDays || 0,
        });
        return preferences.exerciseDays || 0;
      }
      return 0;
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return 0;
    }
  };

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        // Fetch user preferences first
        const exerciseDays = await fetchUserPreferences(user.uid);

        // Fetch user profile data
        const userDoc = await getDoc(
          doc(db, "users", user.uid, "profile", "details")
        );
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPreferredName(data.preferredName || "User");
        }

        // Fetch XP and level
        const { xp, level } = await fetchXPAndLevel(user.uid);
        setPoints(xp);
        setLevel(level);

        // Fetch total distance using the fetchTotalDistance function
        const totalDistance = await fetchTotalDistance(user.uid);

        // Initialize and fetch weekly progress
        await initializeProgressSchema(user.uid, exerciseDays);
        const progressDoc = await getDoc(
          doc(db, "users", user.uid, "progress", "weekly")
        );
        if (progressDoc.exists()) {
          const progress = progressDoc.data();
          setWeeklyProgress({
            daysCompleted: progress.daysCompleted || 0,
            exerciseDays: exerciseDays, // Use the fetched exercise days
            totalDistance: totalDistance, // Update with calculated totalDistance
            lastResetDate: progress.lastResetDate || new Date().toISOString(),
            completedDates: progress.completedDates || [],
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert(
          "Error",
          "Unable to load your profile data. Please try again later."
        );
      }
    }
  };

  const checkAndResetProgress = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const progressRef = doc(db, "users", user.uid, "progress", "weekly");
      const progressDoc = await getDoc(progressRef);
      const progress = progressDoc.data();

      if (!progress) return;

      const lastReset = new Date(progress.lastResetDate);
      const now = new Date();
      const daysSinceReset = Math.floor(
        (now - lastReset) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceReset >= 7) {
        const resetProgress = {
          daysCompleted: 0,
          exerciseDays: userPreferences.exerciseDays, // Use the stored preference
          totalDistance: 0,
          lastResetDate: now.toISOString(),
          completedDates: [],
        };

        await setDoc(progressRef, resetProgress);
        setWeeklyProgress(resetProgress);
      }
    } catch (error) {
      console.error("Error checking/resetting progress:", error);
    }
  };

  const calculateProgress = () => {
    const targetDays =
      weeklyProgress.exerciseDays || userPreferences.exerciseDays || 1;
    return Math.min((weeklyProgress.daysCompleted / targetDays) * 100, 100);
  };

  useEffect(() => {
    fetchUserData();
    checkAndResetProgress();
    getLocation();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>
              {greeting}, {preferredName}!
            </Text>
            <View style={styles.tilesContainer}>
              <View style={styles.tile}>
                <Image
                  source={require("../assets/level_shield.png")}
                  style={styles.icon}
                />
                <Text style={styles.tileText}>Lvl {level}</Text>
              </View>
              <View style={styles.tile}>
                <Image
                  source={require("../assets/xp_icon.png")}
                  style={styles.icon}
                />
                <Text style={styles.tileText}>{points} XP</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>This Week's Progress</Text>
          <View style={styles.progressTile}>
            <View style={styles.progressInfo}>
              <Text style={styles.kmText}>
                {(weeklyProgress.totalDistance || 0).toFixed(1)} KM
              </Text>
              <Text style={styles.subText}>Total Distance</Text>
            </View>
            <View style={styles.circularProgressContainer}>
              <AnimatedCircularProgress
                size={100}
                width={12}
                fill={calculateProgress()}
                tintColor="#FFA500"
                backgroundColor="#d3d3d3"
                rotation={0}
                lineCap="round"
              >
                {(fill) => (
                  <Text style={styles.circularProgressText}>
                    {Math.round(fill)}%
                  </Text>
                )}
              </AnimatedCircularProgress>
              <Text style={styles.weeklyGoalText}>
                {weeklyProgress?.daysCompleted || 0}/
                {weeklyProgress?.exerciseDays ||
                  userPreferences.exerciseDays ||
                  0}{" "}
                days
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.mapSection}>
          <RouteMap
            preferences={{ distance: 5, scenery: "park", difficulty: "easy" }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  scrollContainer: { flexGrow: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: { width: 161, height: 142, marginTop: 50, resizeMode: "contain" },
  userInfo: { alignItems: "flex-end" },
  greeting: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  tilesContainer: { flexDirection: "row", alignItems: "center" },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  tileText: { marginLeft: 5, fontWeight: "bold" },
  icon: { width: 20, height: 20 },
  progressSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  progressTile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#5bb2b9",
    borderRadius: 16,
    padding: 20,
  },
  progressInfo: {
    flex: 1,
  },
  circularProgressContainer: {
    alignItems: "center",
  },
  circularProgressText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  kmText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  subText: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
  },
  weeklyGoalText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  mapSection: { flex: 1, marginTop: 20 },
});

export default HomeScreen;

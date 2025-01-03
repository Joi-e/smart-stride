import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const WeeklyProgressTracker = () => {
  const [weeklyProgress, setWeeklyProgress] = useState({
    daysCompleted: 0,
    targetDays: 5,
    totalDistance: 0,
    lastResetDate: null,
  });

  const initializeProgressSchema = async (userId) => {
    const progressRef = doc(db, "users", userId, "progress", "weekly");
    const progressDoc = await getDoc(progressRef);

    if (!progressDoc.exists()) {
      await setDoc(progressRef, {
        daysCompleted: 0,
        totalDistance: 0,
        lastResetDate: new Date().toISOString(),
        completedDates: [],
      });
    }
  };

  const fetchProgress = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await initializeProgressSchema(user.uid);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const targetDays = userData?.preferences?.exerciseDays || 5;

      const progressDoc = await getDoc(
        doc(db, "users", user.uid, "progress", "weekly")
      );
      let progress = progressDoc.data() || {
        daysCompleted: 0,
        totalDistance: 0,
        lastResetDate: new Date().toISOString(),
        completedDates: [],
      };

      setWeeklyProgress({
        ...progress,
        targetDays,
      });
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  const checkAndResetProgress = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

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
          totalDistance: 0,
          lastResetDate: now.toISOString(),
          completedDates: [],
        };

        await setDoc(progressRef, resetProgress);
        setWeeklyProgress((prev) => ({
          ...resetProgress,
          targetDays: prev.targetDays,
        }));
      }
    } catch (error) {
      console.error("Error checking/resetting progress:", error);
    }
  };

  const calculateProgress = () => {
    const percentage =
      (weeklyProgress.daysCompleted / weeklyProgress.targetDays) * 100;
    return Math.min(percentage, 100);
  };

  useEffect(() => {
    fetchProgress();
    checkAndResetProgress();
  }, []);

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          padding: 20,
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#fff" }}>
            {weeklyProgress.totalDistance.toFixed(1)} KM
          </Text>
          <Text style={{ fontSize: 14, color: "#fff", marginTop: 4 }}>
            Total Distance
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
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
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}>
                {Math.round(fill)}%
              </Text>
            )}
          </AnimatedCircularProgress>
          <Text style={{ color: "#fff", marginTop: 8 }}>
            {weeklyProgress.daysCompleted}/{weeklyProgress.targetDays} days
          </Text>
        </View>
      </View>
    </View>
  );
};

export default WeeklyProgressTracker;

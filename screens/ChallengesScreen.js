import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  onSnapshot,
  updateDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import * as Progress from "react-native-progress";

const defaultChallenges = [
  {
    id: "1",
    name: "Complete a Nature Walk",
    goal: "nature_walk",
    target: 1,
    progress: 0,
    completed: false,
    icon: "nature",
  },
  {
    id: "2",
    name: "Walk 5km",
    goal: "walk_5km",
    target: 5000,
    progress: 0,
    completed: false,
    icon: "directions-walk",
  },
  {
    id: "3",
    name: "Explore New Routes",
    goal: "explore_routes",
    target: 3,
    progress: 0,
    completed: false,
    icon: "place",
  },
];

const ChallengesScreen = ({ userId }) => {
  const [challenges, setChallenges] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize default challenges in Firestore
  useEffect(() => {
    const initializeChallenges = async () => {
      try {
        for (const challenge of defaultChallenges) {
          const challengeDoc = await getDoc(
            doc(db, "challenges", challenge.id)
          );
          if (!challengeDoc.exists()) {
            await setDoc(doc(db, "challenges", challenge.id), challenge);
          }
        }
        setInitialized(true);
      } catch (error) {
        console.error("Error initializing challenges:", error);
        setInitialized(true); // Prevent infinite loading
      }
    };

    initializeChallenges();
  }, []);

  // Fetch completed routes and calculate total distance and routes
  const fetchUserCompletedRoutes = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const completedRoutesQuery = query(
      collection(db, "completedRoutes"),
      where("userId", "==", user.uid)
    );

    const querySnapshot = await getDocs(completedRoutesQuery);
    let totalDistanceCovered = 0;
    let totalRoutesCovered = 0;

    querySnapshot.forEach((doc) => {
      const routeData = doc.data();
      console.log("Route Data:", routeData); // Debugging the fetched route data

      // Ensure that `distance` is numeric and valid
      if (
        typeof routeData.distance === "number" &&
        !isNaN(routeData.distance)
      ) {
        totalDistanceCovered += routeData.distance; // Add distance from each route
      } else {
        console.warn("Invalid or missing distance in route data", routeData);
      }

      totalRoutesCovered += 1; // Increment the route count
    });

    // Log total distance and routes
    console.log("Total Distance Covered:", totalDistanceCovered);
    console.log("Total Routes Covered:", totalRoutesCovered);

    setTotalDistance(totalDistanceCovered); // Set total distance
    setTotalRoutes(totalRoutesCovered); // Set total routes
  };

  // Track challenge progress and mark completed if the goal is reached
  const handleChallengeCompletion = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const challengesQuery = query(collection(db, "challenges"));
      const snapshot = await getDocs(challengesQuery);
      snapshot.forEach((challengeDoc) => {
        const challengeData = challengeDoc.data();
        const challengeRef = doc(db, "challenges", challengeDoc.id);

        // Update progress based on the goal
        if (
          challengeData.goal === "walk_5km" &&
          totalDistance >= 5000 &&
          !challengeData.completed
        ) {
          updateDoc(challengeRef, {
            completed: true,
            progress: totalDistance, // Set the completed challenge progress
          });
        }

        if (
          challengeData.goal === "nature_walk" &&
          totalRoutes >= 1 &&
          !challengeData.completed
        ) {
          updateDoc(challengeRef, {
            completed: true,
            progress: totalRoutes, // Mark the challenge as completed
          });
        }
      });
    } catch (error) {
      console.error("Error completing challenge:", error);
    }
  };

  // Setup listener to monitor challenge updates
  useEffect(() => {
    const setupChallengesListener = async () => {
      try {
        if (!initialized) return;

        // Fetch user completed routes and total distance
        await fetchUserCompletedRoutes();

        // Listen for changes to challenges and update UI
        const challengesQuery = query(collection(db, "challenges"));
        const unsubscribe = onSnapshot(challengesQuery, (snapshot) => {
          const challengesData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              unlocked: data.progress >= 1, // Mark as unlocked if progress >= 1
            };
          });

          setChallenges(challengesData);
          setLoading(false);
          handleChallengeCompletion(); // Check if the user has completed any challenges
        });

        return () => unsubscribe(); // Cleanup the listener
      } catch (error) {
        console.error("Error fetching challenges:", error);
        setLoading(false);
      }
    };

    setupChallengesListener();
  }, [userId, totalDistance, totalRoutes, initialized]);

  const renderChallengeItem = ({ item }) => {
    let progressText = "";
    let progress = 0;

    // Handle progress text and progress bar depending on the goal
    if (item.goal === "walk_5km") {
      progressText = `${item.target - totalDistance} meters left to walk`;
      progress = totalDistance / item.target;
    } else if (item.goal === "nature_walk") {
      progressText = `${item.target - totalRoutes} walks left`;
      progress = totalRoutes / item.target;
    } else if (item.goal === "explore_routes") {
      progressText = `${item.target - totalRoutes} routes left to explore`;
      progress = totalRoutes / item.target;
    }

    const iconColor = item.completed ? "#4caf50" : "#cccccc";

    return (
      <View
        style={[
          styles.challengeItem,
          !item.completed && styles.lockedChallenge,
        ]}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons name={item.icon} size={32} color={iconColor} />
        </View>
        <View style={styles.challengeContent}>
          <Text
            style={[styles.challengeName, !item.completed && styles.lockedText]}
          >
            {item.name}
          </Text>
          {item.completed ? (
            <Text style={styles.challengeStatus}>Completed!</Text>
          ) : (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{progressText}</Text>
              <Progress.Bar
                progress={progress}
                width={200}
                height={8}
                color="#4caf50"
                unfilledColor="#e0e0e0"
                borderWidth={0}
                style={styles.progressBar}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Your Challenges</Text>
          <Text style={styles.totalDistance}>
            Total Distance: {totalDistance} meters
          </Text>
        </View>
        <FlatList
          data={challenges}
          renderItem={renderChallengeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: Platform.OS === "android" ? 25 : 0, // Add padding for Android status bar
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8, // Add spacing between header and total distance
  },
  totalDistance: {
    fontSize: 18,
    color: "#4caf50",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    paddingBottom: 20,
  },
  challengeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  lockedChallenge: {
    backgroundColor: "#f8f8f8",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  challengeContent: {
    flex: 1,
  },
  challengeName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  challengeStatus: {
    color: "#4caf50",
    fontWeight: "bold",
    fontSize: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  progressBar: {
    marginTop: 5,
  },
});

export default ChallengesScreen;

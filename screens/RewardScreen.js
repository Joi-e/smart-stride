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
} from "firebase/firestore";
import { db, auth } from "../firebase";
import * as Progress from "react-native-progress";

const defaultRewards = [
  {
    id: "1",
    name: "Beginner Walker",
    xpNeeded: 100,
    icon: "directions-walk",
    unlocked: false,
  },
  {
    id: "2",
    name: "Nature Explorer",
    xpNeeded: 200,
    icon: "nature",
    unlocked: false,
  },
  {
    id: "3",
    name: "Neighbourhood Watch",
    xpNeeded: 500,
    icon: "security",
    unlocked: false,
  },
  {
    id: "4",
    name: "Landmark Master",
    xpNeeded: 1000,
    icon: "place",
    unlocked: false,
  },
];

const RewardsScreen = ({ userId }) => {
  const [rewards, setRewards] = useState([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Separate useEffect for initialization
  useEffect(() => {
    const initializeRewards = async () => {
      try {
        for (const reward of defaultRewards) {
          const rewardDoc = await getDoc(doc(db, "rewards", reward.id));
          if (!rewardDoc.exists()) {
            await setDoc(doc(db, "rewards", reward.id), reward);
          }
        }
        setInitialized(true);
      } catch (error) {
        console.error("Error initializing rewards:", error);
        setInitialized(true); // Still set initialized to prevent infinite loading
      }
    };

    initializeRewards();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    userId = user.uid;
    if (!userId || !initialized) return;

    let unsubscribe;

    const setupRewardsListener = async () => {
      try {
        // Fetch user's total XP first
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setTotalXp(userDoc.data().totalXP || 0);
        }

        // Then set up rewards listener
        const rewardsQuery = query(collection(db, "rewards"));
        unsubscribe = onSnapshot(rewardsQuery, (snapshot) => {
          const rewardsData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              unlocked: data.xpNeeded <= totalXp,
              xpCurrent: Math.min(totalXp, data.xpNeeded),
            };
          });

          // Sort rewards by XP needed
          rewardsData.sort((a, b) => a.xpNeeded - b.xpNeeded);
          setRewards(rewardsData);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error setting up rewards:", error);
        setLoading(false);
      }
    };

    setupRewardsListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, totalXp, initialized]);

  const renderRewardItem = ({ item }) => {
    const progress = item.xpCurrent / item.xpNeeded;
    const iconColor = item.unlocked ? "#4caf50" : "#cccccc";

    return (
      <View style={[styles.rewardItem, !item.unlocked && styles.lockedReward]}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={item.icon} size={32} color={iconColor} />
        </View>
        <View style={styles.rewardContent}>
          <Text
            style={[styles.rewardName, !item.unlocked && styles.lockedText]}
          >
            {item.name}
          </Text>
          {item.unlocked ? (
            <Text style={styles.rewardStatus}>Unlocked!</Text>
          ) : (
            <View style={styles.progressContainer}>
              <Text style={styles.xpNeeded}>
                {item.xpNeeded - item.xpCurrent} XP to unlock
              </Text>
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
          <Text style={styles.header}>Your Rewards</Text>
          <Text style={styles.totalXp}>Total XP: {totalXp}</Text>
        </View>
        <FlatList
          data={rewards}
          renderItem={renderRewardItem}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
  },
  totalXp: {
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
  rewardItem: {
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
  lockedReward: {
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
  rewardContent: {
    flex: 1,
  },
  rewardName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  lockedText: {
    color: "#999",
  },
  rewardStatus: {
    color: "#4caf50",
    fontWeight: "bold",
    fontSize: 16,
  },
  progressContainer: {
    flex: 1,
  },
  xpNeeded: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  progressBar: {
    marginTop: 5,
  },
});

export default RewardsScreen;

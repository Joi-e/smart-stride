import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth, updatePassword, signOut } from "firebase/auth";

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [preferredName, setPreferredName] = useState("");
  const [password, setPassword] = useState("");
  const [exerciseDays, setExerciseDays] = useState(3);
  const [exerciseScenery, setExerciseScenery] = useState("Urban");
  const [exerciseTime, setExerciseTime] = useState("Morning");
  const [fitnessLevel, setFitnessLevel] = useState("Beginner");
  const [fitnessGoal, setFitnessGoal] = useState("Weight Loss");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "You must be logged in to view settings.");
        return;
      }

      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.preferences) {
          setFitnessLevel(data.preferences.fitnessLevel || "Beginner");
          setExerciseDays(data.preferences.exerciseDays || 3);
          setExerciseScenery(data.preferences.exerciseScenery || "Urban");
          setExerciseTime(data.preferences.exerciseTime || "Morning");
          setFitnessGoal(data.preferences.fitnessGoal || "Weight Loss");
        }
        setPreferredName(data.preferredName || "");
        setNotificationsEnabled(data.notificationsEnabled || false);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      Alert.alert("Error", "Failed to load settings. Please try again.");
    }
  };

  const handleSave = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "You must be logged in to update settings.");
        return;
      }

      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);

      // Ensure fitnessLevel is included in the preferences object
      const preferences = {
        exerciseDays,
        exerciseScenery,
        exerciseTime,
        fitnessGoal,
        fitnessLevel, // Make sure fitnessLevel is included here
      };

      // Log the preferences being saved for debugging
      console.log("Saving preferences:", preferences);

      // Update the user document with all preferences
      await updateDoc(userRef, {
        preferences,
        preferredName,
        notificationsEnabled,
        updatedAt: new Date(),
      });

      if (password) {
        await updatePassword(user, password);
        setPassword("");
        Alert.alert("Success", "Settings and password updated successfully!");
      } else {
        Alert.alert("Success", "Settings updated successfully!");
      }

      // Log the updated document for verification
      const updatedDoc = await getDoc(userRef);
      console.log("Updated document:", updatedDoc.data());
    } catch (error) {
      console.error("Error updating settings:", error);
      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Error",
          "You need to reauthenticate to update your password. Please log in again."
        );
      } else {
        Alert.alert("Error", "Failed to update settings. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigation.replace("Start");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Settings</Text>

      {/* Account Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Preferred Name"
          value={preferredName}
          onChangeText={setPreferredName}
        />
        <TextInput
          style={styles.input}
          placeholder="Change Password"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Days per Week:</Text>
          <Picker
            style={styles.picker}
            selectedValue={String(exerciseDays)}
            onValueChange={(value) => setExerciseDays(Number(value))}
          >
            {[...Array(7).keys()].map((day) => (
              <Picker.Item
                label={`${day + 1}`}
                value={`${day + 1}`}
                key={day}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Scenery:</Text>
          <Picker
            style={styles.picker}
            selectedValue={exerciseScenery}
            onValueChange={setExerciseScenery}
          >
            {["Urban", "Landmarks", "Nature Walks"].map((scenery) => (
              <Picker.Item label={scenery} value={scenery} key={scenery} />
            ))}
          </Picker>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Time of Day:</Text>
          <Picker
            style={styles.picker}
            selectedValue={exerciseTime}
            onValueChange={setExerciseTime}
          >
            {["Morning", "Afternoon", "Evening/Night"].map((time) => (
              <Picker.Item label={time} value={time} key={time} />
            ))}
          </Picker>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Fitness Level:</Text>
          <Picker
            style={styles.picker}
            selectedValue={fitnessLevel}
            onValueChange={setFitnessLevel}
          >
            {["Beginner", "Intermediate", "Advanced"].map((level) => (
              <Picker.Item label={level} value={level} key={level} />
            ))}
          </Picker>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Goal:</Text>
          <Picker
            style={styles.picker}
            selectedValue={fitnessGoal}
            onValueChange={setFitnessGoal}
          >
            {["Weight Loss", "Improving Fitness Level", "Reducing Stress"].map(
              (goal) => (
                <Picker.Item label={goal} value={goal} key={goal} />
              )
            )}
          </Picker>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#d3d3d3", true: "#4CAF50" }}
            thumbColor={notificationsEnabled ? "#4CAF50" : "#f4f4f4"}
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.saveButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8f9fa",
    flexGrow: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#333",
    marginBottom: 10,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  preferenceLabel: {
    fontSize: 16,
    color: "#555",
  },
  picker: {
    flex: 1,
    marginLeft: 10,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 16,
    color: "#555",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
});

export default SettingsScreen;

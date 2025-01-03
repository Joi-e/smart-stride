import React, { useContext, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ProgressContext } from "../context/ProgressContext";
import { ProgressBar } from "react-native-paper";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const SecondQuestions = ({ navigation }) => {
  const { progress, setProgress } = useContext(ProgressContext);
  const [exerciseDays, setExerciseDays] = useState("");
  const [error, setError] = useState("");

  const handleNextQuestion = async () => {
    const days = parseInt(exerciseDays, 10);

    // Validate input to be within range
    if (isNaN(days) || days < 1 || days > 7) {
      setError("Please enter a number between 1 and 7.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        // Reference to the user's document in Firestore
        const userDocRef = doc(db, "users", user.uid);

        // Save the entered exercise days in the user's document
        await setDoc(
          userDocRef,
          { preferences: { exerciseDays: days } },
          { merge: true } // This option updates the document without overwriting other fields
        );

        console.log("User's exercise days saved successfully");
      } else {
        console.log("User is not logged in");
      }

      // Increment progress and navigate to the next question
      setProgress(progress + 0.2);
      navigation.navigate("ThirdQuestion");
    } catch (error) {
      console.error("Error saving user's exercise days:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Progress Bar */}
        <ProgressBar
          progress={progress}
          color="#4CAF50"
          style={styles.progressBar}
        />

        {/* Important Question Section */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>
            How many days a week are you looking to exercise?
          </Text>

          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={exerciseDays}
            onChangeText={(text) => {
              setExerciseDays(text);
              setError(""); // Clear error on input change
            }}
            placeholder="Enter a number from 1 to 7"
          />

          {/* Error message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextQuestion}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  progressBar: {
    width: "80%",
    height: 10,
    alignSelf: "center",
    marginBottom: 30,
    borderRadius: 5,
  },
  questionContainer: {
    alignItems: "center",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "80%",
    padding: 15,
    borderRadius: 8,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    textAlign: "center",
    fontSize: 16,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginBottom: 10,
  },
  nextButton: {
    marginTop: 30,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SecondQuestions;

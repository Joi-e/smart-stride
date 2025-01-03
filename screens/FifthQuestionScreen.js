import React, { useContext, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ProgressContext } from "../context/ProgressContext";
import { ProgressBar } from "react-native-paper";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const FifthQuestion = ({ navigation }) => {
  const { progress, setProgress } = useContext(ProgressContext);
  const [selectedOption, setSelectedOption] = useState(null);

  const options = ["Urban", "Landmarks", "Nature Walks"];

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    Haptics.selectionAsync(); // Trigger haptic feedback on selection
  };

  const handleNextQuestion = async () => {
    if (selectedOption !== null) {
      try {
        const user = auth.currentUser;
        if (user) {
          // Reference to the user's document in Firestore
          const userDocRef = doc(db, "users", user.uid);

          // Save the selected exercise scenery in the user's document
          await setDoc(
            userDocRef,
            { preferences: { exerciseScenery: selectedOption } },
            { merge: true } // This option updates the document without overwriting other fields
          );

          console.log("User's exercise scenery saved successfully");
        } else {
          console.log("User is not logged in");
        }

        // Increment progress and navigate to the Main screen
        setProgress(progress + 0.2);
        navigation.navigate("Main"); // Navigate to the bottom tab navigator
      } catch (error) {
        console.error("Error saving exercise scenery:", error);
      }
    } else {
      alert("Please select an option to proceed.");
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
            What type of scenery do you enjoy walking in the most?
          </Text>

          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  selectedOption === option && styles.selectedOption,
                ]}
                onPress={() => handleSelectOption(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
  optionsContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  option: {
    width: "80%",
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    borderColor: "#ccc",
    borderWidth: 1,
    alignItems: "center",
  },
  selectedOption: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
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

export default FifthQuestion;

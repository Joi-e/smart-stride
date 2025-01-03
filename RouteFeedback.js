import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const RouteFeedbackForm = ({ onSubmit, onClose }) => {
  const [rating, setRating] = useState(0);
  const [difficulty, setDifficulty] = useState(null);
  const [enjoyed, setEnjoyed] = useState(null);

  const handleSubmit = () => {
    onSubmit({
      rating,
      difficulty,
      enjoyed,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>How was your route?</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rate your experience</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={rating >= star ? "star" : "star-outline"}
                    size={32}
                    color={rating >= star ? "#FFB800" : "#CCCCCC"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was the difficulty?</Text>
            <View style={styles.difficultyContainer}>
              <TouchableOpacity
                onPress={() => setDifficulty("too_easy")}
                style={[
                  styles.difficultyButton,
                  difficulty === "too_easy" && styles.selectedButton,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    difficulty === "too_easy" && styles.selectedButtonText,
                  ]}
                >
                  Too Easy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDifficulty("just_right")}
                style={[
                  styles.difficultyButton,
                  difficulty === "just_right" && styles.selectedButton,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    difficulty === "just_right" && styles.selectedButtonText,
                  ]}
                >
                  Just Right
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDifficulty("too_hard")}
                style={[
                  styles.difficultyButton,
                  difficulty === "too_hard" && styles.selectedButton,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    difficulty === "too_hard" && styles.selectedButtonText,
                  ]}
                >
                  Too Hard
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Did you enjoy the route?</Text>
            <View style={styles.enjoyedContainer}>
              <TouchableOpacity
                onPress={() => setEnjoyed(true)}
                style={[
                  styles.enjoyedButton,
                  enjoyed === true && styles.selectedButton,
                ]}
              >
                <Ionicons
                  name="thumbs-up"
                  size={24}
                  color={enjoyed === true ? "#2196F3" : "#666666"}
                />
                <Text
                  style={[
                    styles.buttonText,
                    enjoyed === true && styles.selectedButtonText,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEnjoyed(false)}
                style={[
                  styles.enjoyedButton,
                  enjoyed === false && styles.selectedButton,
                ]}
              >
                <Ionicons
                  name="thumbs-down"
                  size={24}
                  color={enjoyed === false ? "#2196F3" : "#666666"}
                />
                <Text
                  style={[
                    styles.buttonText,
                    enjoyed === false && styles.selectedButtonText,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!rating || !difficulty || enjoyed === null}
            style={[
              styles.submitButton,
              (!rating || !difficulty || enjoyed === null) &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  content: {
    gap: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  difficultyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    alignItems: "center",
  },
  enjoyedContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  enjoyedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  selectedButton: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2196F3",
  },
  buttonText: {
    color: "#666666",
    fontSize: 14,
  },
  selectedButtonText: {
    color: "#2196F3",
  },
  footer: {
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RouteFeedbackForm;

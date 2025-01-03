import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  TextInput,
  Button,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "smartstride-b3817.firebaseapp.com",
  projectId: "smartstride-b3817",
  storageBucket: "smartstride-b3817.appspot.com",
  messagingSenderId: "254965533618",
  appId: "1:254965533618:web:0023a1190373e7c47f72ab",
  measurementId: "G-K74QKCKNT3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [preferredName, setPreferredName] = useState(""); // Renamed from username to preferredName
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Password validation criteria functions
  const hasMinimumLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  const isPasswordStrong =
    hasMinimumLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar;

  const handleRegister = () => {
    setError("");

    // Ensure preferred name is not empty
    if (!preferredName.trim()) {
      setError("Preferred Name is required!");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // Ensure the password meets all criteria
    if (!isPasswordStrong) {
      setError("Password must meet all criteria.");
      return;
    }

    // Firebase registration logic
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        // Save preferredName in the user's subcollection "profile"
        const userDocRef = doc(db, "users", user.uid, "profile", "details");
        await setDoc(userDocRef, { preferredName });

        console.log("User Registered:", { email, preferredName });
        setTimeout(() => {
          navigation.navigate("FirstQuestionScreen");
        }, 500); // Add a delay of 500ms
      })
      .catch((error) => {
        setError(error.message);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ImageBackground
          source={require("../assets/BCK.png")}
          style={styles.background}
        >
          <Image source={require("../assets/logo.png")} style={styles.logo} />

          <View style={styles.textContainer}>
            <Text style={styles.text}>Discover your perfect route</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Text Inputs for Email, Preferred Name, Password, Confirm Password */}
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Preferred Name"
              value={preferredName}
              onChangeText={setPreferredName}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Password Requirements Checklist - Only shows when user starts typing password */}
            {password.length > 0 && (
              <View style={styles.passwordCriteria}>
                {!hasMinimumLength && (
                  <Text style={styles.error}>
                    ❌ Password must be at least 8 characters
                  </Text>
                )}
                {!hasUppercase && (
                  <Text style={styles.error}>
                    ❌ Password must have at least 1 uppercase letter
                  </Text>
                )}
                {!hasLowercase && (
                  <Text style={styles.error}>
                    ❌ Password must have at least 1 lowercase letter
                  </Text>
                )}
                {!hasNumber && (
                  <Text style={styles.error}>
                    ❌ Password must have at least 1 number
                  </Text>
                )}
                {!hasSpecialChar && (
                  <Text style={styles.error}>
                    ❌ Password must have at least 1 special character (@$!%*?&)
                  </Text>
                )}
              </View>
            )}

            {/* Error Message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Register Button */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  logo: {
    width: 161,
    height: 142,
    marginTop: 50,
    resizeMode: "contain",
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  text: {
    color: "black",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "transparent",
    fontFamily: "Avenir",
  },
  formContainer: {
    width: "90%",
    marginTop: 30,
    alignItems: "center",
  },
  textInput: {
    width: "100%",
    height: 50,
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#C4C4C4",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    fontSize: 16,
  },
  passwordCriteria: {
    marginTop: 10,
    alignItems: "flex-start",
    width: "100%",
  },
  error: {
    color: "red",
    fontSize: 14,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  registerButton: {
    width: 250,
    height: 45,
    backgroundColor: "#57c5a0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    marginTop: 20,
  },
  registerButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default RegisterScreen;

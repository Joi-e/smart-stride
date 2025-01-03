import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Successful login
        navigation.navigate("Main"); // Navigate to HomeScreen
      })
      .catch((error) => {
        Alert.alert("Login Error", error.message); // Show an alert for login error
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../assets/BCK.png")}
        style={styles.background}
      >
        {/* App logo */}
        <Image source={require("../assets/logo.png")} style={styles.logo} />

        {/* App title */}
        <View style={styles.textContainer}>
          <Text style={styles.text}>Precision Fitness, Tailored Routes</Text>
        </View>

        {/* Email Input */}
        <TextInput
          style={styles.textInput}
          onChangeText={setEmail}
          value={email}
          placeholder="Email"
          placeholderTextColor="#C4C4C4"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password Input */}
        <TextInput
          style={styles.textInput}
          onChangeText={setPassword}
          value={password}
          placeholder="Password"
          placeholderTextColor="#C4C4C4"
          secureTextEntry={true}
        />

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
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
  textInput: {
    height: 40,
    width: 250,
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#C4C4C4",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    fontSize: 16,
  },
  loginButton: {
    width: 250,
    height: 45,
    backgroundColor: "#57c5a0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    marginTop: 20,
  },
  loginButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default LoginScreen;

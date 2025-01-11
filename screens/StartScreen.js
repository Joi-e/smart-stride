import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  ImageBackground,
  StyleSheet,
} from "react-native";

const StartScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../assets/background.png")} 
        style={styles.background}
      >
        {/* The text and other content go inside ImageBackground */}
        <View style={styles.textContainer}>
          <Text style={styles.text}>Navigate Your Way to Wellness</Text>
        </View>

        <SafeAreaView
          style={styles.loginContainer}
          onTouchEnd={() => navigation.navigate("Login")} // Navigate to Login screen on touch
        >
          <Text style={styles.accountText}>Login</Text>
        </SafeAreaView>

        <SafeAreaView
          style={styles.registerContainer}
          onTouchEnd={() => navigation.navigate("Register")} // Navigate to Register screen on touch
        >
          <Text style={styles.accountText}>Register</Text>
        </SafeAreaView>
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
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  text: {
    color: "black",
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "transparent",
    fontFamily: "Avenir",
  },
  loginContainer: {
    backgroundColor: "#2DA8A1",
    width: "100%",
    height: 75,
    position: "absolute",
    bottom: 75,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  registerContainer: {
    backgroundColor: "grey",
    width: "100%",
    height: 75,
    position: "absolute",
    bottom: 0,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  accountText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default StartScreen;

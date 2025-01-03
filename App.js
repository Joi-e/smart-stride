import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import { ProgressProvider } from "./context/ProgressContext";
import StartScreen from "./screens/StartScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import FirstQuestionScreen from "./screens/FirstQuestionScreen";
import SecondQuestionScreen from "./screens/SecondQuestionScreen";
import ThirdQuestionScreen from "./screens/ThirdQuestionScreen";
import FourthQuestionScreen from "./screens/FourthQuestionScreen";
import FifthQuestionScreen from "./screens/FifthQuestionScreen";
import HomeScreen from "./screens/HomeScreen";
import RouteScreen from "./screens/RouteScreen";
import ChallengesScreen from "./screens/ChallengesScreen";
import RewardScreen from "./screens/RewardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import RouteCompleteScreen from "./screens/RouteComplete";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const BottomTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => {
      return {
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home")
            iconName = focused ? "home" : "home-outline";
          else if (route.name === "Challenges")
            iconName = focused ? "trophy" : "trophy-outline";
          else if (route.name === "Rewards")
            iconName = focused ? "gift" : "gift-outline";
          else if (route.name === "Settings")
            iconName = focused ? "settings" : "settings-outline";
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      };
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Challenges" component={ChallengesScreen} />
    <Tab.Screen name="Rewards" component={RewardScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const App = () => {
  return (
    <ProgressProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Start">
          <Stack.Screen
            name="Start"
            component={StartScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="FirstQuestionScreen"
            component={FirstQuestionScreen}
          />
          <Stack.Screen
            name="SecondQuestions"
            component={SecondQuestionScreen}
          />
          <Stack.Screen name="ThirdQuestion" component={ThirdQuestionScreen} />
          <Stack.Screen
            name="FourthQuestion"
            component={FourthQuestionScreen}
          />
          <Stack.Screen name="FifthQuestion" component={FifthQuestionScreen} />
          <Stack.Screen
            name="Main"
            component={BottomTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="RouteScreen" component={RouteScreen} />
          <Stack.Screen
            name="RouteCompleteScreen"
            component={RouteCompleteScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ProgressProvider>
  );
};

export default App;

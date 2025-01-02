import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import generateRoutes from "../generateRoutes";
import { ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";

const RouteMap = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [suggestedRoutes, setSuggestedRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedPathType, setSelectedPathType] = useState("main");
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in.");
          return;
        }
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData && userData.preferences) {
            setPreferences(userData.preferences);
            console.log("Updated preferences:", userData.preferences);

            // Refetch routes with new preferences if location exists
            if (location) {
              fetchNearbyRoutes(location.coords);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
        setPreferences(null);
      }
    };

    fetchPreferences();
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(location);

      if (location && preferences) {
        fetchNearbyRoutes(location.coords);
      }
    };

    fetchLocation();
  }, [preferences]); // Only depends on preferences changes

  useEffect(() => {
    if (!preferences) return;

    const fetchLocationAndRoutes = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(location);

      if (location) {
        fetchNearbyRoutes(location.coords);
      }
    };

    fetchLocationAndRoutes();
  }, [preferences]);

  const fetchNearbyRoutes = async (coords) => {
    if (!preferences) return;

    try {
      setLoading(true);
      console.log("Fetching Routes with Coords:", coords);
      console.log("User Preferences:", preferences);

      const routes = await generateRoutes(coords, preferences);

      console.log("Fetched Routes:", routes);
      console.log("Number of Routes:", routes.length);

      setSuggestedRoutes(routes);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Error fetching routes:", error);
    }
  };

  const getDifficultyColour = (difficultySettings) => {
    switch (difficultySettings) {
      case "Beginner":
        return "green";
      case "Intermediate":
        return "yellow";
      case "Advanced":
        return "red";
      default:
        return "gray";
    }
  };

  const getPathTypeColor = (pathType) => {
    switch (pathType) {
      case "main":
        return "#2196F3";
      case "aStar":
        return "#4CAF50";
      case "dijkstra":
        return "#9C27B0";
      default:
        return "#2196F3";
    }
  };

  const handleRouteSelection = (route) => {
    setSelectedRoute(route);
    setSelectedPathType("main"); // Reset to main path when selecting new route
  };

  const saveSelectedRoute = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !selectedRoute) {
        console.log("No user or selected route.");
        return;
      }

      const routeData = {
        id: selectedRoute.id,
        destination: selectedRoute.destination,
        pathType: selectedPathType,
        coordinates: selectedRoute.paths[selectedPathType].coordinates,
        timestamp: new Date().toISOString(),
      };

      const userRef = doc(db, "users", user.uid);
      await setDoc(doc(userRef, "selectedRoutes", selectedRoute.id), routeData);
      console.log("Route saved successfully:", routeData);
    } catch (error) {
      console.error("Error saving route:", error);
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!location || !preferences) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.coords?.latitude || 0,
          longitude: location?.coords?.longitude || 0,
          latitudeDelta: 0.0122,
          longitudeDelta: 0.0121,
        }}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons name="location" size={24} color="#2196F3" />
            </View>
          </Marker>
        )}

        {selectedRoute && (
          <Polyline
            coordinates={selectedRoute.paths[selectedPathType].coordinates}
            strokeColor={getPathTypeColor(selectedPathType)}
            strokeWidth={4}
            onPress={() => {
              console.log(
                "Polyline Coordinates:",
                selectedRoute.paths[selectedPathType].coordinates
              );
            }}
          />
        )}
      </MapView>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#2196F3"
          style={styles.loadingSpinner}
        />
      )}

      {selectedRoute && (
        <View style={styles.pathTypeSelector}>
          <TouchableOpacity
            style={[
              styles.pathTypeButton,
              selectedPathType === "main" && styles.selectedPathType,
            ]}
            onPress={() => setSelectedPathType("main")}
          >
            <Text style={styles.pathTypeText}>Main</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pathTypeButton,
              selectedPathType === "aStar" && styles.selectedPathType,
            ]}
            onPress={() => setSelectedPathType("aStar")}
          >
            <Text style={styles.pathTypeText}>A*</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pathTypeButton,
              selectedPathType === "dijkstra" && styles.selectedPathType,
            ]}
            onPress={() => setSelectedPathType("dijkstra")}
          >
            <Text style={styles.pathTypeText}>Dijkstra</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.routeListContainer}>
        <Text style={styles.routeListTitle}>Suggested Routes</Text>
        <View style={styles.routeList}>
          {suggestedRoutes.length === 0 ? (
            <Text>No routes available</Text>
          ) : (
            suggestedRoutes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeCard,
                  selectedRoute?.id === route.id && styles.selectedRouteCard,
                ]}
                onPress={() => handleRouteSelection(route)}
              >
                <View style={styles.routeCardContent}>
                  <Text style={styles.routeName}>{route.destination.name}</Text>

                  {/* Add Weather Section */}
                  <View style={styles.weatherContainer}>
                    <View style={styles.weatherMain}>
                      <Ionicons name="partly-sunny" size={20} color="#666" />
                      <Text style={styles.weatherText}>{route.weather}</Text>
                    </View>
                    <View style={styles.weatherDetails}>
                      <Text style={styles.weatherStat}>
                        <Ionicons
                          name="thermometer-outline"
                          size={14}
                          color="#666"
                        />{" "}
                        {route.temperature}≈
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeStats}>
                    <Text style={styles.routeStat}>
                      <Ionicons name="fitness" size={16} />
                      {route.paths[selectedPathType].distance}km
                    </Text>
                    <Text style={styles.routeStat}>
                      <Ionicons name="time" size={16} />
                      {route.paths[selectedPathType].duration}
                    </Text>
                    <Text
                      style={[
                        styles.routeDifficulty,
                        { color: getDifficultyColour(route.difficulty) },
                      ]}
                    >
                      {route.difficulty}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {selectedRoute && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={async () => {
            await saveSelectedRoute(); // Save the selected route to Firestore

            // Log the selected route and path type before navigating
            console.log("Selected Route Data:", selectedRoute);
            console.log("Selected Path Type:", selectedPathType);
            console.log(
              "Coordinates:",
              selectedRoute.paths[selectedPathType].coordinates
            );

            // Navigate to RouteScreen with the selected data
            navigation.navigate("RouteScreen", {
              route: selectedRoute,
              selectedPathType: selectedPathType,
              coordinates: selectedRoute.paths[selectedPathType].coordinates, // Explicitly pass coordinates
            });
          }}
        >
          <Ionicons name="play" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.6,
  },
  currentLocationMarker: {
    padding: 5,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  pathTypeSelector: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 10,
    backgroundColor: "#fff",
  },
  pathTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  selectedPathType: {
    backgroundColor: "#2196F3",
  },
  pathTypeText: {
    color: "#333",
    fontWeight: "bold",
  },
  routeListContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    flex: 1,
  },
  routeListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  routeList: {
    paddingBottom: 10,
  },
  routeCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  selectedRouteCard: {
    backgroundColor: "#e3f2fd",
  },
  routeCardContent: {
    marginBottom: 10,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  routeStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  routeStat: {
    fontSize: 12,
    color: "#666",
  },
  routeDifficulty: {
    fontSize: 12,
    fontWeight: "bold",
  },
  rating: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  startButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#2196F3",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  loadingText: {
    textAlign: "center",
    fontSize: 18,
    marginTop: 20,
  },
  errorText: {
    textAlign: "center",
    fontSize: 18,
    marginTop: 20,
    color: "red",
  },
  loadingSpinner: {
    marginTop: 20,
  },
  weatherContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  weatherMain: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  weatherText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  weatherDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  weatherStat: {
    fontSize: 12,
    color: "#666",
    flexDirection: "row",
    alignItems: "center",
  },
  weatherScore: {
    marginTop: 4,
    alignItems: "flex-end",
  },
  weatherScoreText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default RouteMap;

import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
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

// Check if Auth has already been initialized to prevent re-initialization
let auth;
if (!initializeAuth) {
  // Initialize Firebase Auth with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  auth = initializeAuth(app); // Just use the existing instance
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Export the initialized instances
export { auth, app, db, storage };

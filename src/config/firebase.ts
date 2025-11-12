import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_r1GicYrO0Zwn98hd5xLTYL4dfBiNzL0",
  authDomain: "travel-expense-tracker-9de91.firebaseapp.com",
  projectId: "travel-expense-tracker-9de91",
  storageBucket: "travel-expense-tracker-9de91.firebasestorage.app",
  messagingSenderId: "476433030379",
  appId: "1:476433030379:web:6d97e35c222281153cb2ae",
  measurementId: "G-Y7S1X8N59R", // For Analytics
};

// Initialize Firebase App
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with AsyncStorage persistence for React Native
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
  
  // Initialize Firestore
  db = getFirestore(app);
  
  // Initialize Firebase Storage
  storage = getStorage(app);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { app, auth, db, storage };
export default app;


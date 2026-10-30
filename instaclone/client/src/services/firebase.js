import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Read the Firebase config from the .env file (values start with VITE_).
// If a value is empty we use a harmless placeholder so the app does not
// crash before the user has set it up.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "not-configured",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "not-configured",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "not-configured",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "not-configured",
};

// True once the user has pasted their real Firebase values into client/.env.
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

if (!isFirebaseConfigured) {
  console.error(
    "InstaClone: Firebase is not configured yet. Open client/.env and paste your Firebase values."
  );
}

const app = initializeApp(firebaseConfig);

// The Firebase services used everywhere in the app.
// (Storage is not used: images are taken from URLs, so the project
// stays on the free Spark plan.)
export const auth = getAuth(app);
export const db = getFirestore(app);
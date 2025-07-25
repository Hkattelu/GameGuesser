import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCrx6sQHfz-pVyeD-OqyjIZaOvXWrmGb-A",
  authDomain: "game-boy-gemini.firebaseapp.com",
  projectId: "game-boy-gemini",
  storageBucket: "game-boy-gemini.firebasestorage.app",
  messagingSenderId: "772569913717",
  appId: "1:772569913717:web:3a5f438a8402ec60ef1b3c",
  measurementId: "G-YXFYKW8237"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

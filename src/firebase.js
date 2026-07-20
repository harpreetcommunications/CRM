import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tuhade Harpreet Communications CRM di Firebase keys
const firebaseConfig = {
  apiKey: "AIzaSyDZRb1Kb2jqDGCAUoHf1ZT-07fHibhYbZI",
  authDomain: "hc-crm-4446c.firebaseapp.com",
  projectId: "hc-crm-4446c",
  storageBucket: "hc-crm-4446c.firebasestorage.app",
  messagingSenderId: "853170290328",
  appId: "1:853170290328:web:8768c62e2c56c6c6f8daed"
};

// Initialize Firebase and Firestore Database
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
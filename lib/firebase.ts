// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCkE9rbQyKIxDJpCjmBTDoBJattCJeV8t8",
  authDomain: "digi-wall-e599c.firebaseapp.com",
  databaseURL: "https://digi-wall-e599c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "digi-wall-e599c",
  storageBucket: "digi-wall-e599c.appspot.com",
  messagingSenderId: "180291257002",
  appId: "1:180291257002:web:219335816f9527068546d3",
  measurementId: "G-MQFFT35HB6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

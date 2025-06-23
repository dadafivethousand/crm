// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDezCwB_bbP7v3MyOgUqkWPuLAacifCTQY",
  authDomain: "jiujitsu-crm.firebaseapp.com",
  projectId: "jiujitsu-crm",
  storageBucket: "jiujitsu-crm.firebasestorage.app",
  messagingSenderId: "782246628598",
  appId: "1:782246628598:web:77a89dd3d09aab791ff0d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfcDDnWue-vjLoB5ZGiX1pPz8mdPsjRK8",
  authDomain: "deal-architect-95835.firebaseapp.com",
  projectId: "deal-architect-95835",
  storageBucket: "deal-architect-95835.firebasestorage.app",
  messagingSenderId: "875675138980",
  appId: "1:875675138980:web:5691dc19500989e9bb9f31",
  measurementId: "G-GQKPWKCHW9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

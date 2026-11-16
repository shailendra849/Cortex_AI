// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "rajwada-crm-fe2dc.firebaseapp.com",
  projectId: "rajwada-crm-fe2dc",
  storageBucket: "rajwada-crm-fe2dc.firebasestorage.app",
  messagingSenderId: "47849386341",
  appId: "1:47849386341:web:2cb78b84dc6e1c29e3f18c",
  measurementId: "G-GXREWHYD1S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const githubProvider = new GithubAuthProvider();

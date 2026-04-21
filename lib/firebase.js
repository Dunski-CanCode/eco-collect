
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBIsCotDIZ1lgvxVqZX3s-iEeNYFhUPy8",
  authDomain: "dunerbase.firebaseapp.com",
  projectId: "dunerbase",
  storageBucket: "dunerbase.firebasestorage.app",
  messagingSenderId: "717516189692",
  appId: "1:717516189692:web:1c3ba6b323e23b5f89cc79"
};

// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
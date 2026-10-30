import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // Firebase auth user (has uid, email)
  const [userData, setUserData] = useState(null);       // The matching users/{uid} doc
  const [loading, setLoading] = useState(true);         // True while checking login status

  // Listen to the auth state: runs once when the user logs in/out.
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // While logged in, keep users/{uid} up to date in real time.
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      setUserData(null);
      return;
    }
    const ref = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setUserData({ uid: snap.id, ...snap.data() });
      } else {
        // Auto-create profile for accounts that bypassed the Register flow.
        const email = currentUser.email || "";
        const username = email.split("@")[0] || "user";
        setDoc(ref, {
          uid: currentUser.uid,
          name: username,
          username,
          usernameLower: username.toLowerCase(),
          nameLower: username.toLowerCase(),
          email,
          bio: "",
          profilePicture: "",
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: serverTimestamp(),
        }).catch(() => {});
        setUserData(null);
      }
    });
    return unsubscribe;
  }, [currentUser]);

  const logout = () => signOut(auth);

  const value = { currentUser, userData, loading, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
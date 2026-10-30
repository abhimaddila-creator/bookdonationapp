import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";

const config = {
  apiKey: "AIzaSyBrmhFcqPsPOADIvJ5x4DuGhJbkZ1IHOgo",
  projectId: "instaclone-28033",
  authDomain: "instaclone-28033.firebaseapp.com",
  messagingSenderId: "370630149049",
  appId: "1:370630149049:web:ca75556711fa2bc3d12c68",
};
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "searchprobe" + Date.now() + "@instaclone.test";
const pass = "SearchProbe123!";

let user;
try {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  user = cred.user;
  console.log("signed in as", user.uid);

  const t = "a";
  async function run(name, useId) {
    try {
      const q = useId
        ? query(
            collection(db, "users"),
            where(documentId(), ">=", t),
            where(documentId(), "<=", t + "\uf8ff"),
            limit(10)
          )
        : query(
            collection(db, "users"),
            where(name, ">=", t),
            where(name, "<=", t + "\uf8ff"),
            limit(10)
          );
      const snap = await getDocs(q);
      console.log((useId ? "DOCID" : name.toUpperCase()) + " OK ->", snap.docs.length, "docs");
    } catch (err) {
      console.log((useId ? "DOCID" : name.toUpperCase()) + " ERROR ->", err.code, "|", err.message.split("\n")[0]);
    }
  }
  await run("usernameLower", false);
  await run("nameLower", false);
  await run("", true);
} finally {
  if (user) await deleteUser(user).catch(() => {});
  console.log("cleanup done");
  process.exit(0);
}
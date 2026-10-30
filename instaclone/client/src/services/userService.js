import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  writeBatch,
  documentId,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notificationService";

// Splits an array into small groups of 10 (Firestore "in" queries allow max 10).
function chunk(arr, size = 10) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// Creates the users/{uid} document right after a new account is registered.
export async function createUserProfile(uid, { name, username, email }) {
  await setDoc(doc(db, "users", uid), {
    uid,
    name,
    username,
    usernameLower: username.toLowerCase(),
    nameLower: name.toLowerCase(),
    email,
    bio: "",
    profilePicture: "",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function usernameExists(username) {
  const q = query(
    collection(db, "users"),
    where("usernameLower", "==", username.toLowerCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function emailExists(email) {
  const q = query(
    collection(db, "users"),
    where("email", "==", email.toLowerCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function getUserById(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
}

export async function getUserByUsername(username) {
  const q = query(
    collection(db, "users"),
    where("usernameLower", "==", username.toLowerCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

// Turns an array of user ids into an array of user documents.
export async function getUsersByIds(ids) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const groups = chunk(unique);
  const results = [];
  for (const group of groups) {
    const q = query(collection(db, "users"), where(documentId(), "in", group));
    const snap = await getDocs(q);
    snap.forEach((d) => results.push({ uid: d.id, ...d.data() }));
  }
  return results;
}

export async function getFollowingIds(uid) {
  const snap = await getDocs(collection(db, `users/${uid}/following`));
  return snap.docs.map((d) => d.id);
}

export async function getFollowersIds(uid) {
  const snap = await getDocs(collection(db, `users/${uid}/followers`));
  return snap.docs.map((d) => d.id);
}

// Returns full user documents for a "followers" or "following" list.
export async function getFollowList(uid, type) {
  const ids =
    type === "following" ? await getFollowingIds(uid) : await getFollowersIds(uid);
  return getUsersByIds(ids);
}

export async function isFollowing(myUid, targetId) {
  const snap = await getDoc(doc(db, `users/${myUid}/following`, targetId));
  return snap.exists();
}

// Follow: writes both sides in one batch and updates the counts.
export async function followUser(myUid, targetId) {
  if (myUid === targetId) throw new Error("You cannot follow yourself.");

  const batch = writeBatch(db);
  batch.set(doc(db, `users/${myUid}/following`, targetId), {
    uid: targetId,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, `users/${targetId}/followers`, myUid), {
    uid: myUid,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", myUid), { followingCount: increment(1) });
  batch.update(doc(db, "users", targetId), { followersCount: increment(1) });
  await batch.commit();

  // Tell the followed person.
  await createNotification({ type: "follow", senderId: myUid, recipientId: targetId });
}

export async function unfollowUser(myUid, targetId) {
  if (myUid === targetId) throw new Error("You cannot unfollow yourself.");

  const batch = writeBatch(db);
  batch.delete(doc(db, `users/${myUid}/following`, targetId));
  batch.delete(doc(db, `users/${targetId}/followers`, myUid));
  batch.update(doc(db, "users", myUid), { followingCount: increment(-1) });
  batch.update(doc(db, "users", targetId), { followersCount: increment(-1) });
  await batch.commit();
}

// Searches users by username OR name (case-insensitive prefix search).
export async function searchUsers(term) {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  const usernameQ = query(
    collection(db, "users"),
    where("usernameLower", ">=", t),
    where("usernameLower", "<=", t + "\uf8ff"),
    limit(10)
  );
  const nameQ = query(
    collection(db, "users"),
    where("nameLower", ">=", t),
    where("nameLower", "<=", t + "\uf8ff"),
    limit(10)
  );
  const [userSnap, nameSnap] = await Promise.all([getDocs(usernameQ), getDocs(nameQ)]);
  const seen = new Set();
  const results = [];
  [...userSnap.docs, ...nameSnap.docs].forEach((d) => {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      results.push({ uid: d.id, ...d.data() });
    }
  });
  return results;
}

export async function updateUserProfile(uid, data) {
  const update = { ...data };
  if (data.username) update.usernameLower = data.username.toLowerCase();
  if (data.name) update.nameLower = data.name.toLowerCase();
  await updateDoc(doc(db, "users", uid), update);
}
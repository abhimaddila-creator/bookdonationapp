import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notificationService";

function chunk(arr, size = 10) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

const byNewest = (a, b) =>
  (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);

// Attach a `userInfo` snapshot to each post (used by Reels overlay).
async function enrichWithUserInfo(posts) {
  if (!posts.length) return posts;
  const ids = [...new Set(posts.map((p) => p.userId))];
  const snaps = await Promise.all(
    chunk(ids).map((g) =>
      getDocs(query(collection(db, "users"), where("uid", "in", g)))
    )
  );
  const map = {};
  snaps.forEach((s) => s.forEach((d) => (map[d.id] = d.data())));
  return posts.map((p) => ({
    ...p,
    userInfo: map[p.userId] || { username: "user", name: "", profilePicture: "" },
  }));
}

// Creates a post document and bumps the author's post count.
// type: "image" (default) or "video" (Reels).
export async function createPost({ userId, imageUrl, type, caption, userInfo }) {
  const ref = doc(collection(db, "posts"));
  await setDoc(ref, {
    userId,
    imageUrl,
    type: type || "image",
    caption,
    userInfo,
    likes: [],
    saves: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", userId), { postsCount: increment(1) });
  return ref.id;
}

// Home feed: posts from the logged-in user plus everyone they follow.
export async function getFeedPosts(myUid, followingIds) {
  const ids = [...new Set([myUid, ...followingIds])];
  if (ids.length === 0) return [];
  const queries = chunk(ids).map((group) =>
    getDocs(query(collection(db, "posts"), where("userId", "in", group)))
  );
  const snaps = await Promise.all(queries);
  const posts = [];
  snaps.forEach((snap) => snap.forEach((d) => posts.push({ id: d.id, ...d.data() })));
  posts.sort(byNewest);
  return posts.slice(0, 40);
}

// Explore page: the latest posts from everyone.
export async function getExplorePosts() {
  const snap = await getDocs(query(collection(db, "posts"), limit(60)));
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  posts.sort(byNewest);
  return posts;
}

// Reels page: only video posts, newest first.
export async function getReelsPosts() {
  const snap = await getDocs(
    query(collection(db, "posts"), where("type", "==", "video"), limit(60))
  );
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  posts.sort(byNewest);
  return enrichWithUserInfo(posts);
}

export async function getUserPosts(uid) {
  const snap = await getDocs(query(collection(db, "posts"), where("userId", "==", uid)));
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  posts.sort(byNewest);
  return posts;
}

// Every post the user saved with the bookmark button.
export async function getSavedPosts(uid) {
  const snap = await getDocs(
    query(collection(db, "posts"), where("saves", "array-contains", uid))
  );
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  posts.sort(byNewest);
  return posts;
}

export async function getPostById(postId) {
  const snap = await getDoc(doc(db, "posts", postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deletePost(postId, myUid) {
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Post not found.");
  if (snap.data().userId !== myUid)
    throw new Error("You can only delete your own posts.");

  await deleteDoc(ref);
  await updateDoc(doc(db, "users", myUid), { postsCount: increment(-1) });
}

export async function likePost(postId, uid, postAuthorId) {
  await updateDoc(doc(db, "posts", postId), { likes: arrayUnion(uid) });
  await createNotification({ type: "like", senderId: uid, recipientId: postAuthorId, postId });
}

export async function unlikePost(postId, uid) {
  await updateDoc(doc(db, "posts", postId), { likes: arrayRemove(uid) });
}

export async function savePost(postId, uid) {
  await updateDoc(doc(db, "posts", postId), { saves: arrayUnion(uid) });
}

export async function unsavePost(postId, uid) {
  await updateDoc(doc(db, "posts", postId), { saves: arrayRemove(uid) });
}

// ---- Comments (stored under posts/{postId}/comments) ----

export function watchComments(postId, callback) {
  return onSnapshot(collection(db, `posts/${postId}/comments`), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    callback(items);
  });
}

export async function addComment(postId, { userId, userInfo, text }) {
  const ref = await addDoc(collection(db, `posts/${postId}/comments`), {
    userId,
    userInfo,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });

  // Notify the author (skip if it's your own post handled inside the function).
  const post = await getDoc(doc(db, "posts", postId));
  const authorId = post.data()?.userId;
  await createNotification({
    type: "comment",
    senderId: userId,
    recipientId: authorId,
    postId,
    commentText: text,
  });
  return ref.id;
}

export async function deleteComment(postId, commentId, myUid) {
  const ref = doc(db, `posts/${postId}/comments`, commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Comment not found.");
  if (snap.data().userId !== myUid)
    throw new Error("You can only delete your own comments.");

  await deleteDoc(ref);
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(-1) });
}
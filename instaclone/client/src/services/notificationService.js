import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Adds a "someone did something" entry to the recipient's notifications.
export async function createNotification({
  type,        // "follow" | "like" | "comment"
  senderId,
  recipientId, // the user who should receive it
  postId = null,
  commentText = "",
}) {
  // Do not notify yourself.
  if (senderId === recipientId) return;

  const senderSnap = await getDoc(doc(db, "users", senderId));
  if (!senderSnap.exists()) return;
  const sender = senderSnap.data();

  await addDoc(collection(db, "notifications"), {
    recipientId,
    senderId,
    senderInfo: {
      name: sender.name,
      username: sender.username,
      profilePicture: sender.profilePicture,
    },
    type,
    postId,
    commentText,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// Updates live every time a notification is added/changed.
export function watchNotifications(uid, callback) {
  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("recipientId", "==", uid),
      limit(50)
    ),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort(
        (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
      callback(items);
    }
  );
}

// Gives the number of unread notifications (used for the red badge).
export function watchUnreadCount(uid, callback) {
  return onSnapshot(
    query(collection(db, "notifications"), where("recipientId", "==", uid)),
    (snap) => {
      const unread = snap.docs.filter((d) => !d.data().read).length;
      callback(unread);
    }
  );
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

export async function markAllNotificationsRead(uid) {
  const q = query(collection(db, "notifications"), where("recipientId", "==", uid));
  const snap = await getDocs(q);
  const unread = snap.docs.filter((d) => !d.data().read);
  await Promise.all(unread.map((d) => updateDoc(d.ref, { read: true })));
}
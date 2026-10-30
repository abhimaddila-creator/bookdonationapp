import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// A conversation between two users is identified by sorting both ids.
// "abc" + "xyz" and "xyz" + "abc" both become "abc__xyz".
export function conversationId(uidA, uidB) {
  return [uidA, uidB].sort().join("__");
}

// Watches the list of conversations a user is part of (for the Messages page).
export function watchConversations(uid, callback) {
  return onSnapshot(
    query(collection(db, "conversations"), where("participants", "array-contains", uid)),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort(
        (a, b) => (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0)
      );
      callback(items);
    }
  );
}

// Watches all messages inside one conversation (for the chat screen).
export function watchMessages(convoId, callback) {
  return onSnapshot(collection(db, `conversations/${convoId}/messages`), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    callback(items);
  });
}

export async function getConversation(convoId) {
  const snap = await getDoc(doc(db, "conversations", convoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Creates the conversation document if it does not exist yet.
// participantInfo maps uid -> { username, profilePicture } for the list screen.
export async function ensureConversation(convoId, participantInfo) {
  const existing = await getConversation(convoId);
  if (existing) return existing;
  const ids = convoId.split("__");
  await setDoc(doc(db, "conversations", convoId), {
    participants: ids,
    participantInfo,
    lastMessage: "",
    lastSenderId: "",
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return getConversation(convoId);
}

// Sends one message and updates the conversation preview.
export async function sendMessage({ convoId, senderId, receiverId, text, participantInfo }) {
  if (!text.trim()) return;

  const convo = await ensureConversation(convoId, participantInfo);

  await addDoc(collection(db, `conversations/${convoId}/messages`), {
    senderId,
    receiverId,
    text,
    read: false,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "conversations", convoId), {
    lastMessage: text,
    lastSenderId: senderId,
    lastMessageAt: serverTimestamp(),
  });

  return convo.id;
}
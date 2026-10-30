// Turns common Firebase error codes into friendly sentences.
export function formatError(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a minute and try again.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase. Console -> Authentication -> Sign-in method.",
    "auth/configuration-not-found": "Firebase auth is not set up correctly. Check your project.",
    "permission-denied":
      "Permission denied. Check the Firestore rules in the Firebase Console (see README).",
  };
  return map[code] || err?.message || "Something went wrong. Please try again.";
}

// Turns a Firestore timestamp into a short text like "5m" or "2d".
export function timeAgo(timestamp) {
  if (!timestamp) return "";
  const ms = timestamp.seconds ? timestamp.seconds * 1000 : timestamp.toMillis();
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(ms).toLocaleDateString();
}
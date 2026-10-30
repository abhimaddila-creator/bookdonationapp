import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase";

const IG_APP_ID = import.meta.env.VITE_IG_APP_ID || "";
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";

// The URL of our serverless function (same Firebase project).
const IG_FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/exchangeIgCode`;

export const isInstagramConfigured = Boolean(IG_APP_ID && PROJECT_ID);

// The address users are sent to so they can log in on Instagram's own page.
export function instagramLoginUrl(redirectUri) {
  const params = new URLSearchParams({
    client_id: IG_APP_ID,
    redirect_uri: redirectUri,
    scope: "instagram_business_basic",
    response_type: "code",
  });
  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

// Extracts the one-time code Instagram adds to the callback URL.
// Throws a friendly error if the user cancelled.
export function getInstagramCallbackCode(search) {
  const q = new URLSearchParams(search);
  if (q.get("error")) {
    throw new Error(
      q.get("error_description") || "Instagram login failed or was cancelled."
    );
  }
  return q.get("code");
}

// Sends the code to our function and signs the user in with the token it returns.
export async function finishInstagramLogin(code, redirectUri) {
  const res = await fetch(IG_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Instagram login failed. Try again.");
  await signInWithCustomToken(auth, data.token);
  return data; // { uid, username }
}
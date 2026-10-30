import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createUserProfile, getUserById, usernameExists } from "../services/userService";
import { finishInstagramLogin, getInstagramCallbackCode } from "../services/instagramAuth";
import Spinner from "../components/Spinner";

export default function InstaAuthCallback() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // If already signed in, nothing to do.
        if (currentUser) return;

        const code = getInstagramCallbackCode(location.search);
        if (!code) {
          setError("Instagram login could not start. Please try again.");
          return;
        }

        const redirectUri = `${window.location.origin}/auth/instagram`;
        const data = await finishInstagramLogin(code, redirectUri);

        // Make sure a users/{uid} profile exists for the Instagram account.
        const existing = await getUserById(data.uid);
        if (!existing) {
          let username = data.username;
          // Give the username a small numeric suffix if it's already taken.
          if (await usernameExists(username)) {
            username = `${username}${String(data.uid).replace("ig_", "").slice(-4)}`;
          }
          await createUserProfile(data.uid, {
            name: data.username,
            username,
            email: `${data.uid}@instagram.local`,
          });
        }
      } catch (err) {
        setError(err.message || "Instagram login failed. Please try again.");
      }
    })();
  }, [currentUser, location.search]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo">InstaClone</h1>
          <p className="form-error">{error}</p>
          <p className="auth-switch">
            <Link to="/login">Back to log in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card center-loading">
        <Spinner size={40} />
        <p className="auth-subtitle">Signing you in via Instagram...</p>
      </div>
    </div>
  );
}
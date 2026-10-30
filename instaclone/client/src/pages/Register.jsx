import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import {
  usernameExists,
  createUserProfile,
} from "../services/userService";
import { formatError } from "../utils";
import Spinner from "../components/Spinner";
import InstagramLoginButton from "../components/InstagramLoginButton";

const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,30}$/;

export default function Register() {
  const { currentUser, loading } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Go straight to the home feed.
  if (!loading && currentUser) return <Navigate to="/" replace />;

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Client-side checks first (friendly feedback before calling Firebase).
    const name = form.name.trim();
    const username = form.username.trim();
    const email = form.email.trim();

    if (name.length < 2) return setError("Full name must be at least 2 characters.");
    if (!USERNAME_PATTERN.test(username))
      return setError(
        "Username must be 3-30 characters using letters, numbers, dots or underscores."
      );
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError("Please enter a valid email address.");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      // Create the Firebase account first. Firebase itself rejects a
      // duplicate email, so no pre-login Firestore query is needed.
      // (The uniqueness checks must run AFTER login because the
      // Firestore rules only let signed-in users read the database.)
      const cred = await createUserWithEmailAndPassword(auth, email, form.password);

      try {
        if (await usernameExists(username))
          throw new Error("That username is already taken.");
        await createUserProfile(cred.user.uid, { name, username, email });
      } catch (err) {
        // The account was made but the profile step failed.
        // Roll it back so the username/email stays free.
        await cred.user.delete().catch(() => {});
        throw err;
      }
      // On success, AuthContext logs the user in and we redirect automatically.
    } catch (err) {
      setError(formatError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="logo">InstaClone</h1>
        <p className="auth-subtitle">Sign up to share moments</p>

        <InstagramLoginButton />

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
          <input
            className="input"
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            required
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm password"
            value={form.confirm}
            onChange={(e) => setField("confirm", e.target.value)}
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? <Spinner size={16} /> : "Sign Up"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
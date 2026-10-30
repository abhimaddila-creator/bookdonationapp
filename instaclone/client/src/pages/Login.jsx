import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import { formatError } from "../utils";
import { getUserByUsername } from "../services/userService";
import Spinner from "../components/Spinner";
import InstagramLoginButton from "../components/InstagramLoginButton";

export default function Login() {
  const { currentUser, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  async function handleForgotPassword(e) {
    e.preventDefault();
    setResetMsg("");
    setError("");
    const identifier = email.trim();
    if (!identifier) {
      setResetMsg("Enter your email above first, then click Forgot password.");
      return;
    }
    setSubmitting(true);
    try {
      let loginEmail = identifier;
      if (!identifier.includes("@")) {
        const user = await getUserByUsername(identifier);
        if (!user) {
          setError("No account found for that username.");
          return;
        }
        loginEmail = user.email;
      }
      await sendPasswordResetEmail(auth, loginEmail);
      setResetMsg("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Already logged in? Go straight to the home feed.
  if (!loading && currentUser) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const identifier = email.trim();
      // If the user typed a username (not an email), resolve it to the
      // matching account email stored in Firestore.
      let loginEmail = identifier;
      if (!identifier.includes("@")) {
        const user = await getUserByUsername(identifier);
        if (!user) throw new Error("No account found for that username.");
        loginEmail = user.email;
      }
      await signInWithEmailAndPassword(auth, loginEmail, password);
      // Once signed in, AuthContext updates and this page redirects automatically.
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="logo">InstaClone</h1>
        <p className="auth-subtitle">Log in to see your feed</p>

        <InstagramLoginButton />

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Username or Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="form-error">{error}</p>}
          {resetMsg && <p className="form-success">{resetMsg}</p>}
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? <Spinner size={16} /> : "Log In"}
          </button>
        </form>

        <button className="forgot-password" onClick={handleForgotPassword} disabled={submitting}>
          Forgot password?
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
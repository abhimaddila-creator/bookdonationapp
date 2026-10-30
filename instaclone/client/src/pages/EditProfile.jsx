import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import Avatar from "../components/Avatar";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";
import { usernameExists, updateUserProfile } from "../services/userService";
import { formatError } from "../utils";

export default function EditProfile() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: userData?.name || "",
    username: userData?.username || "",
    bio: userData?.bio || "",
    profilePicture: userData?.profilePicture || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const name = form.name.trim();
      const username = form.username.trim();

      if (name.length < 2) throw new Error("Full name must be at least 2 characters.");

      // If the username changed, make sure nobody else has it.
      if (username && username.toLowerCase() !== userData.username.toLowerCase()) {
        if (await usernameExists(username)) throw new Error("That username is taken.");
      }

      let profilePicture = form.profilePicture.trim();
      if (profilePicture) {
        try {
          const url = new URL(profilePicture);
          if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
        } catch {
          throw new Error("Profile picture must be a valid URL starting with https://");
        }
      }

      await updateUserProfile(currentUser.uid, {
        name,
        username,
        bio: form.bio.trim(),
        profilePicture,
      });

      setMessage("Profile updated!");
      setTimeout(() => navigate(`/profile/${username}`), 800);
    } catch (err) {
      setError(formatError(err));
      setSaving(false);
    }
  }

  // Password change: prove who you are first, then set the new one.
  async function handlePassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const { current, next, confirm } = passwordForm;
      if (next.length < 6) throw new Error("New password must be at least 6 characters.");
      if (next !== confirm) throw new Error("New passwords do not match.");

      const credential = EmailAuthProvider.credential(currentUser.email, current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, next);

      setPasswordForm({ current: "", next: "", confirm: "" });
      setMessage("Password changed!");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!userData) {
    return (
      <div className="center-loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page narrow">
      <h1 className="page-title">Edit Profile</h1>

      <form className="card" onSubmit={handleSave}>
        <div className="edit-avatar">
          <Avatar src={form.profilePicture} name={form.name} size={72} />
        </div>

        <input
          className="input"
          type="text"
          placeholder="Profile picture URL (https://...)"
          value={form.profilePicture}
          onChange={(e) => setField("profilePicture", e.target.value)}
        />

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
        <textarea
          className="input textarea"
          placeholder="Bio"
          rows="3"
          value={form.bio}
          onChange={(e) => setField("bio", e.target.value)}
        />

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <h2 className="section-title">Change Password</h2>
      <form className="card" onSubmit={handlePassword}>
        <input
          className="input"
          type="password"
          placeholder="Current password"
          value={passwordForm.current}
          onChange={(e) =>
            setPasswordForm((f) => ({ ...f, current: e.target.value }))
          }
          required
        />
        <input
          className="input"
          type="password"
          placeholder="New password"
          value={passwordForm.next}
          onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Confirm new password"
          value={passwordForm.confirm}
          onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
          required
        />
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Working..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
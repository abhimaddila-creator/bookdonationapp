import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { createPost } from "../services/postService";
import { formatError } from "../utils";

// Simple check that the value looks like an http(s) URL.
function looksLikeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const SAMPLE_VIDEOS = [
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
];

export default function CreatePost() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("image"); // "image" | "video"
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function loadSample() {
    if (mode === "video") {
      const url = SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)];
      setMediaUrl(url);
    } else {
      setMediaUrl(`https://picsum.photos/seed/insta${Date.now()}/900/900`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const url = mediaUrl.trim();
    if (!looksLikeUrl(url)) {
      return setError(
        "Please paste a valid URL. It must start with https://"
      );
    }
    if (!userData) return setError("Your profile is not ready yet.");

    setSaving(true);
    try {
      await createPost({
        userId: currentUser.uid,
        imageUrl: url,
        type: mode,
        caption: caption.trim(),
        userInfo: {
          username: userData.username,
          name: userData.name,
          profilePicture: userData.profilePicture,
        },
      });

      setMessage("Post published!");
      setTimeout(() => navigate("/reels"), 700);
    } catch (err) {
      setError(formatError(err));
      setSaving(false);
    }
  }

  const showPreview = looksLikeUrl(mediaUrl);

  return (
    <div className="page">
      <h1 className="page-title">New Post</h1>

      <form className="create-card" onSubmit={handleSubmit}>
        {/* Image / Video toggle */}
        <div className="upload-toggle">
          <button
            type="button"
            className={`toggle-btn${mode === "image" ? " active" : ""}`}
            onClick={() => setMode("image")}
          >
            <Icon name="compass" size={18} /> Photo
          </button>
          <button
            type="button"
            className={`toggle-btn${mode === "video" ? " active" : ""}`}
            onClick={() => setMode("video")}
          >
            <Icon name="play" size={18} /> Reel
          </button>
        </div>

        {/* Media preview box */}
        <div className="upload-box">
          {showPreview ? (
            mode === "video" ? (
              <video
                className="preview-img"
                src={mediaUrl}
                controls
                playsInline
                loop
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <img
                className="preview-img"
                src={mediaUrl}
                alt="Preview"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )
          ) : (
            <div className="upload-placeholder">
              <Icon name="plus" size={40} />
              <p>
                {mode === "video"
                  ? "Paste a video URL (.mp4) to preview it"
                  : "Paste an image URL to preview it"}
              </p>
            </div>
          )}
        </div>

        {/* Media URL input */}
        <input
          className="input"
          type="text"
          placeholder={
            mode === "video"
              ? "Paste video URL... (https://...mp4)"
              : "Paste image URL... (https://...)"
          }
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
        />
        <button type="button" className="btn-outline small" onClick={loadSample}>
          {mode === "video" ? "Use a sample video" : "Use a sample image"}
        </button>

        {/* Caption */}
        <textarea
          className="input textarea"
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows="3"
        />

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}

        <button
          className="btn-primary"
          type="submit"
          disabled={saving || !showPreview}
        >
          {saving ? <Spinner size={16} /> : "Share Post"}
        </button>
      </form>
    </div>
  );
}
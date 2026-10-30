import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import Icon from "./Icons";
import { useAuth } from "../context/AuthContext";
import { watchComments, addComment, deleteComment } from "../services/postService";
import { formatError, timeAgo } from "../utils";

export default function Comments({ postId }) {
  const { currentUser, userData } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postId) return;
    return watchComments(postId, setComments);
  }, [postId]);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError("");
    try {
      await addComment(postId, {
        userId: currentUser.uid,
        userInfo: {
          username: userData.username,
          name: userData.name,
          profilePicture: userData.profilePicture,
        },
        text: trimmed,
      });
      setText("");
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(postId, commentId, currentUser.uid);
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <div className="comments">
      {comments.length === 0 && <p className="no-comments">No comments yet.</p>}

      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <Link to={`/profile/${c.userInfo.username}`} className="comment-avatar">
            <Avatar
              src={c.userInfo.profilePicture}
              name={c.userInfo.name || c.userInfo.username}
              size={28}
            />
          </Link>
          <div className="comment-body">
            <Link to={`/profile/${c.userInfo.username}`} className="comment-username">
              {c.userInfo.username}
            </Link>{" "}
            <span className="comment-text">{c.text}</span>
            <div className="comment-meta">
              <span>{timeAgo(c.createdAt)}</span>
              {c.userId === currentUser?.uid && (
                <button className="text-link" onClick={() => handleDelete(c.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {error && <p className="form-error">{error}</p>}

      <form className="comment-form" onSubmit={handleAdd}>
        <input
          className="input"
          type="text"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-text" type="submit" disabled={!text.trim()}>
          Post
        </button>
      </form>
    </div>
  );
}
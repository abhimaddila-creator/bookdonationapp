import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import Icon from "./Icons";
import Comments from "./Comments";
import PostMedia from "./PostMedia";
import { useAuth } from "../context/AuthContext";
import {
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  deletePost,
} from "../services/postService";
import { formatError, timeAgo } from "../utils";

export default function PostCard({ post, onDeleted }) {
  const { currentUser } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [saves, setSaves] = useState(post.saves || []);
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const liked = likes.includes(currentUser.uid);
  const saved = saves.includes(currentUser.uid);
  const isOwner = post.userId === currentUser.uid;

  async function handleLike() {
    setLikes((prev) =>
      liked ? prev.filter((x) => x !== currentUser.uid) : [...prev, currentUser.uid]
    );
    try {
      if (liked) await unlikePost(post.id, currentUser.uid);
      else await likePost(post.id, currentUser.uid, post.userId);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleSave() {
    setSaves((prev) =>
      saved ? prev.filter((x) => x !== currentUser.uid) : [...prev, currentUser.uid]
    );
    try {
      if (saved) await unsavePost(post.id, currentUser.uid);
      else await savePost(post.id, currentUser.uid);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError("Could not copy the link.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost(post.id, currentUser.uid);
      if (onDeleted) onDeleted(post.id);
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <div className="post-card">
      <div className="post-header">
        <Link to={`/profile/${post.userInfo.username}`} className="post-header-user">
          <Avatar
            src={post.userInfo.profilePicture}
            name={post.userInfo.name || post.userInfo.username}
            size={36}
          />
          <span className="post-username">{post.userInfo.username}</span>
        </Link>
        {isOwner && (
          <button className="icon-btn" onClick={handleDelete} title="Delete post">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <Link to={`/p/${post.id}`}>
        <PostMedia post={post} />
      </Link>

      <div className="post-actions">
        <div className="post-actions-left">
          <button
            className={`icon-btn${liked ? " active" : ""}`}
            onClick={handleLike}
            title={liked ? "Unlike" : "Like"}
          >
            <Icon name="heart" size={26} filled={liked} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowComments((s) => !s)}
            title="Comments"
          >
            <Icon name="comment" size={25} />
          </button>
          <button className="icon-btn" onClick={handleShare} title="Share">
            <Icon name="send" size={25} />
          </button>
        </div>
        <button
          className={`icon-btn${saved ? " active" : ""}`}
          onClick={handleSave}
          title={saved ? "Unsave" : "Save"}
        >
          <Icon name="bookmark" size={25} filled={saved} />
        </button>
      </div>

      <div className="post-body">
        <p className="likes-count">{likes.length} likes</p>
        {post.caption && (
          <p className="caption">
            <Link to={`/profile/${post.userInfo.username}`} className="username-inline">
              {post.userInfo.username}
            </Link>{" "}
            {post.caption}
          </p>
        )}
        <button
          className="text-link"
          onClick={() => setShowComments((s) => !s)}
        >
          View all {post.commentCount || 0} comments
        </button>
        <p className="post-time">{timeAgo(post.createdAt)}</p>
        {error && <p className="form-error">{error}</p>}
        {copied && <span className="toast">Link copied to clipboard!</span>}

        {showComments && <Comments postId={post.id} />}
      </div>
    </div>
  );
}
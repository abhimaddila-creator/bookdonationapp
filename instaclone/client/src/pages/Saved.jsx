import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons";
import Spinner from "../components/Spinner";
import PostMedia from "../components/PostMedia";
import { useAuth } from "../context/AuthContext";
import { getSavedPosts } from "../services/postService";

export default function Saved() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    getSavedPosts(currentUser.uid)
      .then((data) => active && setPosts(data))
      .catch(() => active && setPosts([]));
    return () => (active = false);
  }, [currentUser]);

  if (posts === null) {
    return (
      <div className="center-loading">
        <Spinner size={40} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="empty">
        <Icon name="bookmark" size={48} />
        <h2 className="empty-title">No saved posts yet</h2>
        <p>Tap the bookmark on any post to keep it here.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Saved</h1>
      <div className="explore-grid">
        {posts.map((post) => (
          <Link to={`/p/${post.id}`} key={post.id} className="explore-item">
            <PostMedia post={post} grid />
            {post.type === "video" && (
              <span className="play-badge">
                <Icon name="play" size={16} />
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
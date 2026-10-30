import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExplorePosts } from "../services/postService";
import Spinner from "../components/Spinner";
import PostMedia from "../components/PostMedia";
import Icon from "../components/Icons";

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await getExplorePosts();
        if (active) setPosts(all);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => (active = false);
  }, []);

  if (loading) {
    return (
      <div className="center-loading">
        <Spinner size={40} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="empty">
        <h2 className="empty-title">Nothing here yet</h2>
        <p>Be the first to share a photo.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Explore</h1>
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
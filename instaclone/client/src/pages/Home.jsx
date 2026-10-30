import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, limit, getDocs } from "firebase/firestore";
import PostCard from "../components/PostCard";
import UserCard from "../components/UserCard";
import Spinner from "../components/Spinner";
import Stories from "../components/Stories";
import Icon from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebase";
import { getFeedPosts } from "../services/postService";
import { getFollowingIds } from "../services/userService";

export default function Home() {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);

  // Load the feed: my own posts + posts from people I follow.
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    (async () => {
      try {
        const following = await getFollowingIds(currentUser.uid);
        const feed = await getFeedPosts(currentUser.uid, following);
        if (active) setPosts(feed);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => (active = false);
  }, [currentUser]);

  // Suggest a few users to follow (newest accounts first).
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    (async () => {
      try {
        const q = query(collection(db, "users"), limit(40));
        const snap = await getDocs(q);
        const users = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((u) => u.uid !== currentUser.uid)
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
          )
          .slice(0, 5);
        if (active) setSuggestions(users);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => (active = false);
  }, [currentUser]);

  // The user's profile may not exist yet (e.g. they registered but profile failed).
  if (userData === null) {
    return (
      <div className="empty">
        <h2 className="empty-title">Set up your profile</h2>
        <p>Your profile is missing some details.</p>
        <Link to="/edit-profile" className="btn-primary">
          Set up profile
        </Link>
      </div>
    );
  }

  function removePost(id) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="home">
      <Stories />
      <div className="feed">
        {loading ? (
          <div className="center-loading">
            <Spinner size={40} />
          </div>
        ) : posts.length === 0 ? (
          <div className="empty">
            <Icon name="compass" size={48} />
            <h2 className="empty-title">Your feed is empty</h2>
            <p>Follow people or post your first photo to get started.</p>
            <div className="empty-actions">
              <Link to="/explore" className="btn-outline">
                Explore
              </Link>
              <Link to="/create" className="btn-primary">
                Create post
              </Link>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={removePost} />
          ))
        )}
      </div>

      <aside className="sidebar">
        <h3 className="sidebar-title">Suggested for you</h3>
        {suggestions.length === 0 ? (
          <p className="muted">No suggestions yet.</p>
        ) : (
          suggestions.map((user) => <UserCard key={user.uid} user={user} />)
        )}
      </aside>
    </div>
  );
}
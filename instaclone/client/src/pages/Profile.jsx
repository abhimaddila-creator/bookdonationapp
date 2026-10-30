import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import FollowButton from "../components/FollowButton";
import Spinner from "../components/Spinner";
import Icon from "../components/Icons";
import PostMedia from "../components/PostMedia";
import UserListModal from "../components/UserListModal";
import { useAuth } from "../context/AuthContext";
import { getUserByUsername, getFollowList } from "../services/userService";
import { getUserPosts } from "../services/postService";
import { formatError } from "../utils";

export default function Profile() {
  const { username } = useParams();
  const { currentUser } = useAuth();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [listModal, setListModal] = useState(null); // "followers" | "following"
  const [listUsers, setListUsers] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setUser(null);
    setPosts([]);
    setLoading(true);
    (async () => {
      try {
        const u = await getUserByUsername(username);
        if (active && u) {
          setUser(u);
          const p = await getUserPosts(u.uid);
          if (active) setPosts(p);
        } else if (active) {
          setError("User not found.");
        }
      } catch (err) {
        if (active) setError(formatError(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => (active = false);
  }, [username]);

  async function openList(type) {
    if (!user) return;
    setListModal(type);
    setListLoading(true);
    try {
      setListUsers(await getFollowList(user.uid, type));
    } catch (err) {
      alert(formatError(err));
    } finally {
      setListLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="center-loading">
        <Spinner size={40} />
      </div>
    );
  }

  const isOwnProfile = user?.uid === currentUser?.uid;

  return (
    <div className="page narrow">
      {!user ? (
        <div className="empty">
          <h2 className="empty-title">User not found</h2>
          <p>{error || "This account does not exist."}</p>
        </div>
      ) : (
        <>
          <div className="profile-header">
            <Avatar src={user.profilePicture} name={user.name} size={88} />
            <div className="profile-info">
              <div className="profile-username-row">
                <h2 className="profile-username">{user.username}</h2>
                {isOwnProfile ? (
                  <Link to="/edit-profile" className="btn-outline small">
                    Edit Profile
                  </Link>
                ) : (
                  <FollowButton myUid={currentUser?.uid} targetId={user.uid} />
                )}
              </div>

              <div className="profile-stats">
                <span className="stat">
                  <strong>{posts.length}</strong> Posts
                </span>
                <button className="stat-btn" onClick={() => openList("followers")}>
                  <strong>{user.followersCount || 0}</strong> Followers
                </button>
                <button className="stat-btn" onClick={() => openList("following")}>
                  <strong>{user.followingCount || 0}</strong> Following
                </button>
              </div>

              {isOwnProfile && (
                <Link to="/saved" className="saved-shortcut">
                  <Icon name="bookmark" size={16} /> Saved posts
                </Link>
              )}

              <div className="profile-name">{user.name}</div>
              {user.bio && <p className="profile-bio">{user.bio}</p>}
            </div>
          </div>

          <div className="posts-grid">
            {posts.length === 0 ? (
              <div className="empty grid-empty">
                <h3 className="empty-title">No posts yet</h3>
                {isOwnProfile && (
                  <Link to="/create" className="btn-primary">
                    Share your first photo
                  </Link>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <Link to={`/p/${post.id}`} key={post.id} className="profile-post">
                  <PostMedia post={post} grid />
                  {post.type === "video" && (
                    <span className="play-badge">
                      <Icon name="play" size={16} />
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </>
      )}

      {listModal && (
        <UserListModal
          title={listModal === "followers" ? "Followers" : "Following"}
          users={listUsers}
          loading={listLoading}
          onClose={() => setListModal(null)}
        />
      )}
    </div>
  );
}
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { useAuth } from "../context/AuthContext";

export default function UserCard({ user }) {
  const { currentUser } = useAuth();

  return (
    <div className="user-card">
      <Link to={`/profile/${user.username}`} className="user-card-avatar">
        <Avatar src={user.profilePicture} name={user.name} size={48} />
      </Link>
      <div className="user-card-info">
        <Link to={`/profile/${user.username}`} className="user-card-username">
          {user.username}
        </Link>
        <span className="user-card-name">{user.name}</span>
        {user.bio && <span className="user-card-bio">{user.bio}</span>}
      </div>
      <FollowButton myUid={currentUser?.uid} targetId={user.uid} />
    </div>
  );
}
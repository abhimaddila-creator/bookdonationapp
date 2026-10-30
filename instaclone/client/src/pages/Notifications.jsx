import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icons";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import {
  watchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";
import { timeAgo } from "../utils";

export default function Notifications() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    markAllNotificationsRead(currentUser.uid);
    return watchNotifications(currentUser.uid, setItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  if (items === null) {
    return (
      <div className="center-loading">
        <Spinner size={40} />
      </div>
    );
  }

  function iconFor(type) {
    if (type === "follow") return <Icon name="user" size={22} />;
    if (type === "comment") return <Icon name="comment" size={22} />;
    return <Icon name="heart" size={22} />;
  }

  function buildText(n) {
    if (n.type === "follow") return "started following you.";
    if (n.type === "comment")
      return `commented: "${n.commentText || ""}"`;
    return "liked your post.";
  }

  function handleOpen(n) {
    markNotificationRead(n.id);
    if (n.type === "follow") navigate(`/profile/${n.senderInfo.username}`);
    else if (n.postId) navigate(`/p/${n.postId}`);
  }

  return (
    <div className="page narrow">
      <h1 className="page-title">Notifications</h1>

      {items.length === 0 ? (
        <div className="empty">
          <Icon name="heart" size={48} />
          <h2 className="empty-title">No notifications yet</h2>
          <p>When someone follows, likes, or comments, you'll see it here.</p>
        </div>
      ) : (
        <div className="card">
          {items.map((n) => (
            <button
              key={n.id}
              className={`notification-item${n.read ? "" : " unread"}`}
              onClick={() => handleOpen(n)}
            >
              <Avatar
                src={n.senderInfo.profilePicture}
                name={n.senderInfo.name || n.senderInfo.username}
                size={40}
              />
              <div className="notification-body">
                <span>
                  <Link
                    to={`/profile/${n.senderInfo.username}`}
                    className="username-inline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {n.senderInfo.username}
                  </Link>{" "}
                  {buildText(n)}
                </span>
                <span className="muted">{timeAgo(n.createdAt)}</span>
              </div>
              {!n.read && <span className="dot" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
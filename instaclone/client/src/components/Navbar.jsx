import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Icon from "./Icons";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { watchUnreadCount } from "../services/notificationService";

export default function Navbar() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    return watchUnreadCount(currentUser.uid, setUnread);
  }, [currentUser]);

  const username = userData?.username;

  const nav = ({ isActive }) => `nav-icon${isActive ? " active" : ""}`;

  return (
    <>
      {/* Desktop top bar */}
      <header className="navbar">
        <Link to="/" className="navbar-logo">
          InstaClone
        </Link>

        <nav className="navbar-links">
          <NavLink to="/" end className={nav} title="Home">
            <Icon name="home" />
          </NavLink>
          <NavLink to="/search" className={nav} title="Search">
            <Icon name="search" />
          </NavLink>
          <NavLink to="/explore" className={nav} title="Explore">
            <Icon name="compass" />
          </NavLink>
          <NavLink to="/reels" className={nav} title="Reels">
            <Icon name="play" />
          </NavLink>
          <NavLink to="/create" className={nav} title="Create">
            <Icon name="plus" />
          </NavLink>
          <NavLink to="/saved" className={nav} title="Saved">
            <Icon name="bookmark" />
          </NavLink>
          <NavLink to="/notifications" className={nav} title="Notifications">
            <Icon name="heart" />
            {unread > 0 && <span className="nav-badge">{unread}</span>}
          </NavLink>
          <NavLink to="/messages" className={nav} title="Messages">
            <Icon name="send" />
          </NavLink>
          <NavLink to={`/profile/${username}`} className={nav} title="Profile">
            <Avatar
              src={userData?.profilePicture}
              name={userData?.name || currentUser?.email || "?"}
              size={26}
            />
          </NavLink>
          <button
            className="icon-btn logout-btn"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title="Log out"
          >
            <Icon name="logout" size={22} />
          </button>
        </nav>
      </header>

      {/* Mobile bottom bar */}
      <nav className="mobile-nav">
        <NavLink to="/" end className={nav} title="Home">
          <Icon name="home" size={26} />
        </NavLink>
        <NavLink to="/search" className={nav} title="Search">
          <Icon name="search" size={26} />
        </NavLink>
        <NavLink to="/reels" className={nav} title="Reels">
          <Icon name="play" size={26} />
        </NavLink>
        <NavLink to="/create" className={nav} title="Create">
          <Icon name="plus" size={30} />
        </NavLink>
        <NavLink to="/notifications" className={nav} title="Notifications">
          <Icon name="heart" size={26} />
          {unread > 0 && <span className="nav-badge">{unread}</span>}
        </NavLink>
        <NavLink to={`/profile/${username}`} className={nav} title="Profile">
          <Avatar
            src={userData?.profilePicture}
            name={userData?.name || currentUser?.email || "?"}
            size={26}
          />
        </NavLink>
      </nav>
    </>
  );
}
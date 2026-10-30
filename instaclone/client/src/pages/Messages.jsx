import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icons";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { watchConversations } from "../services/messageService";
import { searchUsers } from "../services/userService";
import { formatError, timeAgo } from "../utils";

export default function Messages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState(null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Live list of my conversations.
  useEffect(() => {
    if (!currentUser) return;
    return watchConversations(currentUser.uid, setConversations);
  }, [currentUser]);

  const otherUser = (convo) => {
    const otherId = convo.participants.find((id) => id !== currentUser.uid);
    return convo.participantInfo?.[otherId] || { username: "unknown", profilePicture: "" };
  };

  async function handleSearch(e) {
    e.preventDefault();
    if (!term.trim()) return;
    setSearching(true);
    setError("");
    try {
      const users = await searchUsers(term);
      setResults(users.filter((u) => u.uid !== currentUser.uid));
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="page narrow">
      <h1 className="page-title">Messages</h1>

      {error && <p className="form-error">{error}</p>}

      {/* Find someone to message */}
      <form className="search-box" onSubmit={handleSearch}>
        <Icon name="search" size={18} />
        <input
          className="input"
          type="text"
          placeholder="Start a new conversation..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn-primary" type="submit">
          Search
        </button>
      </form>

      {searching && (
        <div className="center-loading">
          <Spinner />
        </div>
      )}

      {results.length > 0 && (
        <div className="card message-results">
          {results.map((u) => (
            <button
              key={u.uid}
              className="conversation-item"
              onClick={() => navigate(`/messages/${u.uid}`)}
            >
              <Avatar src={u.profilePicture} name={u.name} size={44} />
              <div className="conversation-info">
                <span className="username-inline">{u.username}</span>
                <span className="muted">{u.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <h2 className="section-title">Inbox</h2>
      {conversations === null ? (
        <div className="center-loading">
          <Spinner />
        </div>
      ) : conversations.length === 0 ? (
        <div className="empty">
          <Icon name="send" size={48} />
          <h2 className="empty-title">No messages yet</h2>
          <p>Search for a user above to start a conversation.</p>
        </div>
      ) : (
        <div className="card">
          {conversations.map((c) => {
            const other = otherUser(c);
            return (
              <Link
                key={c.id}
                to={`/messages/${other.uid}`}
                className="conversation-item"
              >
                <Avatar src={other.profilePicture} name={other.username} size={44} />
                <div className="conversation-info">
                  <span className="username-inline">{other.username}</span>
                  <span className="muted">
                    {c.lastSenderId === currentUser.uid ? "You: " : ""}
                    {c.lastMessage || "No messages yet"}
                  </span>
                </div>
                <span className="muted">{timeAgo(c.lastMessageAt)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
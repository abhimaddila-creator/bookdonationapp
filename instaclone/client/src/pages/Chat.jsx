import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icons";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { getUserById } from "../services/userService";
import {
  conversationId,
  watchMessages,
  sendMessage,
} from "../services/messageService";
import { formatError, timeAgo } from "../utils";

export default function Chat() {
  const { userId } = useParams();
  const { currentUser, userData } = useAuth();

  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const convoId = conversationId(currentUser.uid, userId);

  // Load the other user and start watching the conversation live.
  useEffect(() => {
    let active = true;
    getUserById(userId).then((u) => active && setOther(u));
    const unsubscribe = watchMessages(convoId, (items) => {
      setMessages(items);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [convoId, userId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !other || !userData) return;
    setError("");
    try {
      const participantInfo = {
        [currentUser.uid]: {
          username: userData.username,
          profilePicture: userData.profilePicture,
        },
        [other.uid]: {
          username: other.username,
          profilePicture: other.profilePicture,
        },
      };
      await sendMessage({
        convoId,
        senderId: currentUser.uid,
        receiverId: userId,
        text,
        participantInfo,
      });
      setText("");
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <Link to="/messages" className="icon-btn" title="Back">
          <Icon name="close" size={20} />
        </Link>
        {other ? (
          <>
            <Avatar src={other.profilePicture} name={other.name} size={32} />
            <Link to={`/profile/${other.username}`} className="username-inline">
              {other.username}
            </Link>
          </>
        ) : (
          <span>Loading...</span>
        )}
      </div>

      <div className="chat-body">
        {messages === null ? (
          <div className="center-loading">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty">
            <p className="muted">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`bubble${m.senderId === currentUser.uid ? " mine" : ""}`}
            >
              <span className="bubble-text">{m.text}</span>
              <span className="bubble-time">{timeAgo(m.createdAt)}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={handleSend}>
        <input
          className="input"
          type="text"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
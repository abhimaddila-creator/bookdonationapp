import { useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../services/firebase";
import Avatar from "./Avatar";
import Icon from "./Icons";
import { useAuth } from "../context/AuthContext";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function groupStories(stories) {
  const map = new Map();
  stories.forEach((s) => {
    if (!map.has(s.userId)) map.set(s.userId, []);
    map.get(s.userId).push(s);
  });
  return [...map.entries()].map(([userId, items]) => ({
    userId,
    userInfo:
      items[0].userInfo || { username: "user", name: "", profilePicture: "" },
    items,
  }));
}

export default function Stories() {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [viewIdx, setViewIdx] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "stories"),
            orderBy("expiresAt"),
            limit(100)
          )
        );
        const now = Date.now();
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => {
            const exp = s.expiresAt?.toMillis?.() ?? 0;
            return exp > now;
          });
        const ids = [...new Set(list.map((s) => s.userId))];
        const userSnap = await getDocs(query(collection(db, "users"), limit(100)));
        const userMap = new Map();
        userSnap.forEach((d) => userMap.set(d.data().uid || d.id, { ...d.data(), uid: d.id }));
        list.forEach((s) => {
          s.userInfo =
            userMap.get(s.userId) || { username: "user", name: "", profilePicture: "" };
        });
        if (active) setGroups(groupStories(list));
      } catch (err) {
        console.error(err);
      }
    })();
    return () => (active = false);
  }, [currentUser]);

  // Auto-advance the open story every 6 seconds.
  useEffect(() => {
    if (!viewer) return;
    const timer = setTimeout(() => {
      if (viewIdx < viewer.items.length - 1) setViewIdx(viewIdx + 1);
      else setViewer(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [viewer, viewIdx]);

  function openStory(g) {
    setViewer(g);
    setViewIdx(0);
  }

  return (
    <>
      <div className="stories-bar">
        {groups.map((g) => (
          <button
            key={g.userId}
            className="story-btn"
            onClick={() => openStory(g)}
            title={`@${g.userInfo.username}`}
          >
            <span className="story-ring">
              <Avatar
                src={g.userInfo.profilePicture}
                name={g.userInfo.name || g.userInfo.username}
                size={56}
              />
            </span>
            <span className="story-name">
              {g.userInfo.username.slice(0, 10)}
              {g.userInfo.username.length > 10 ? "…" : ""}
            </span>
          </button>
        ))}
      </div>

      {viewer && (
        <div className="story-viewer" onClick={() => setViewer(null)}>
          <div className="story-card">
            <div className="story-progress">
              <span style={{ width: `${((viewIdx + 1) / viewer.items.length) * 100}%` }} />
            </div>
            <div className="story-header">
              <Avatar
                src={viewer.userInfo.profilePicture}
                name={viewer.userInfo.name || viewer.userInfo.username}
                size={30}
              />
              <span className="story-username">{viewer.userInfo.username}</span>
            </div>
            <img
              className="story-image"
              src={viewer.items[viewIdx].imageUrl}
              alt={viewer.items[viewIdx].caption || "story"}
            />
            {viewer.items[viewIdx].caption && (
              <p className="story-caption">{viewer.items[viewIdx].caption}</p>
            )}
          </div>
          <button
            className="story-close"
            onClick={(e) => {
              e.stopPropagation();
              setViewer(null);
            }}
          >
            <Icon name="close" size={26} />
          </button>
        </div>
      )}
    </>
  );
}
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icons";
import Comments from "../components/Comments";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import {
  getReelsPosts,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
} from "../services/postService";
import { formatError } from "../utils";

// Sample videos so the Reels feed is never empty, even before anyone
// posts a real one. `demo: true` marks these so likes work on-device
// and comments are politely skipped.
const DEMO_REELS = [
  {
    id: "demo-1",
    type: "video",
    demo: true,
    imageUrl: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    caption: "Big Buck Bunny riding again 🐰 (sample reel)",
    likes: [],
    commentCount: 0,
    userInfo: { username: "instaclone", name: "InstaClone", profilePicture: "" },
  },
  {
    id: "demo-2",
    type: "video",
    demo: true,
    imageUrl: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
    caption: "Jellyfish drifting 🎐 (sample reel)",
    likes: [],
    commentCount: 0,
    userInfo: { username: "instaclone", name: "InstaClone", profilePicture: "" },
  },
  {
    id: "demo-3",
    type: "video",
    demo: true,
    imageUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
    caption: "Sintel trailer — cinematic 🎬 (sample reel)",
    likes: [],
    commentCount: 0,
    userInfo: { username: "instaclone", name: "InstaClone", profilePicture: "" },
  },
  {
    id: "demo-4",
    type: "video",
    demo: true,
    imageUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    caption: "A flower, up close 🌸 (sample reel)",
    likes: [],
    commentCount: 0,
    userInfo: { username: "instaclone", name: "InstaClone", profilePicture: "" },
  },
  {
    id: "demo-5",
    type: "video",
    demo: true,
    imageUrl: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_2MB.mp4",
    caption: "One more Big Buck Bunny run 🧡 (sample reel)",
    likes: [],
    commentCount: 0,
    userInfo: { username: "instaclone", name: "InstaClone", profilePicture: "" },
  },
];

// A single Reel: full-screen video with an action rail on the right
// and the caption/likes at the bottom.
function Reel({ post, active }) {
  const { currentUser } = useAuth();
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [likes, setLikes] = useState(post.likes || []);
  const [saves, setSaves] = useState(post.saves || []);
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState("");

  const liked = likes.includes(currentUser.uid);
  const saved = saves.includes(currentUser.uid);
  const demo = !!post.demo;

  // Play/pause the video depending on whether this Reel is on screen.
  // Starts UNMUTED (audio on) so movie songs are heard right away.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.muted = muted;
      const p = video.play();
      if (p) {
        p.catch(() => {
          if (!muted) {
            video.muted = true;
            setMuted(true);
          }
        });
      }
    } else {
      video.pause();
    }
  }, [active, muted]);

  async function toggleLike() {
    setLikes((prev) =>
      liked ? prev.filter((x) => x !== currentUser.uid) : [...prev, currentUser.uid]
    );
    if (demo) return; // sample reels: like only shows on your device
    try {
      if (liked) await unlikePost(post.id, currentUser.uid);
      else await likePost(post.id, currentUser.uid, post.userId);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function toggleSave() {
    setSaves((prev) =>
      saved ? prev.filter((x) => x !== currentUser.uid) : [...prev, currentUser.uid]
    );
    if (demo) return;
    try {
      if (saved) await unsavePost(post.id, currentUser.uid);
      else await savePost(post.id, currentUser.uid);
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <section className="reel">
      <video
        ref={videoRef}
        className="reel-video"
        src={post.imageUrl}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        autoPlay
      />

      {/* Right action rail */}
      <div className="reel-actions">
        <button
          className={`icon-btn reel-action${liked ? " active" : ""}`}
          onClick={toggleLike}
          title={liked ? "Unlike" : "Like"}
        >
          <Icon name="heart" size={32} filled={liked} />
          <span className="reel-action-count">{likes.length}</span>
        </button>

        {!demo && (
          <button
            className="icon-btn reel-action"
            onClick={() => setShowComments((s) => !s)}
            title="Comments"
          >
            <Icon name="comment" size={30} />
            <span className="reel-action-count">{post.commentCount || 0}</span>
          </button>
        )}

        <button
          className="icon-btn reel-action"
          onClick={() =>
            navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`)
          }
          title="Share"
        >
          <Icon name="send" size={30} />
        </button>

        <button
          className={`icon-btn reel-action${saved ? " active" : ""}`}
          onClick={toggleSave}
          title={saved ? "Unsave" : "Save"}
        >
          <Icon name="bookmark" size={30} filled={saved} />
        </button>

        <button
          className="icon-btn reel-action"
          onClick={() => setMuted((m) => !m)}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <Icon name="muted" size={30} /> : <Icon name="volume" size={30} />}
        </button>
      </div>

      {/* Bottom info */}
      <div className="reel-info">
        <Link
          to={demo ? "/reels" : `/profile/${post.userInfo.username}`}
          className="reel-user"
        >
          <Avatar
            src={post.userInfo.profilePicture}
            name={post.userInfo.name || post.userInfo.username}
            size={32}
          />
          <span className="post-username">{post.userInfo.username}</span>
        </Link>
        {post.caption && <p className="reel-caption">{post.caption}</p>}
        {demo && <p className="reel-demo-note">Sample reel — post your own to grow this feed!</p>}
        {error && <p className="form-error">{error}</p>}
      </div>

      {showComments && (
        <div className="reel-comments">
          <button
            className="icon-btn reel-comments-close"
            onClick={() => setShowComments(false)}
            title="Close comments"
          >
            <Icon name="close" size={22} />
          </button>
          <Comments postId={post.id} />
        </div>
      )}
    </section>
  );
}

export default function Reels() {
  const [posts, setPosts] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    getReelsPosts()
      .then((data) => active && setPosts(data))
      .catch((err) => {
        console.error(err);
        active && setPosts([]);
      });
    return () => (active = false);
  }, []);

  // Show sample videos to watch until someone posts a real Reel.
  const source = posts && posts.length > 0 ? posts : DEMO_REELS;

  // Track which Reel is in view so only that video plays.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const idx = Math.round(container.scrollTop / container.clientHeight);
      setActiveIdx(Math.max(0, Math.min(source.length - 1, idx)));
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [source]);

  if (posts === null) {
    return (
      <div className="center-loading">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="reels-feed" ref={containerRef}>
      {source.map((post, idx) => (
        <Reel key={post.id} post={post} active={idx === activeIdx} />
      ))}
    </div>
  );
}
// Renders a post's media: image or video (Reels).
// In grids the video plays silently on loop; on detail pages it
// shows normal playback controls.
export default function PostMedia({ post, grid = false }) {
  if (post.type === "video") {
    return (
      <video
        className={grid ? "post-media" : "post-media post-image"}
        src={post.imageUrl}
        muted
        loop
        playsInline
        poster={post.posterUrl || ""}
        controls={!grid}
        controlsList="nodownload"
        preload="metadata"
      />
    );
  }

  return (
    <img
      className={grid ? "post-media" : "post-media post-image"}
      src={post.imageUrl}
      alt={post.caption || "Post"}
      loading="lazy"
    />
  );
}
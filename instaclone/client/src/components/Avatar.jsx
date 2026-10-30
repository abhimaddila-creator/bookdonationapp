export default function Avatar({ src, name = "?", size = 32 }) {
  if (src) {
    return (
      <img
        className="avatar-img"
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    );
  }
  return (
    <div
      className="avatar-letter"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}
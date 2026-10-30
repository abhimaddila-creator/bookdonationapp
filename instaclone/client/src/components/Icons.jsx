// A tiny icon library. "name" picks the icon, "filled" toggles solid/outline.
export default function Icon({ name, size = 24, filled = false }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: filled ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const paths = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <line x1="16" y1="16" x2="21" y2="21" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <polygon points="15.5 8.5 13.2 13.2 8.5 15.5 10.8 10.8" />
      </>
    ),
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    heart: (
      <path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
    ),
    bookmark: (
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
    ),
    send: (
      <>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
    comment: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
    logout: (
      <>
        <path d="M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
        <line x1="9" y1="12" x2="21" y2="12" />
        <polyline points="16 7 21 12 16 17" />
      </>
    ),
    close: (
      <>
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </>
    ),
    check: (
      <polyline points="20 6 9 17 4 12" />
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
      </>
    ),
    volume: (
      <>
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path d="M16 9a4 4 0 0 1 0 6" />
        <path d="M18.5 6.5a8 8 0 0 1 0 11" />
      </>
    ),
    muted: (
      <>
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <line x1="16" y1="9" x2="21" y2="15" />
        <line x1="21" y1="9" x2="16" y2="15" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.home}</svg>;
}
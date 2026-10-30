import { isInstagramConfigured, instagramLoginUrl } from "../services/instagramAuth";

// Sends the user to Instagram's own login page. When they come back
// (to /auth/instagram) the callback page finishes the sign-in.
export default function InstagramLoginButton({ label = "Continue with Instagram" }) {
  if (!isInstagramConfigured) return null;

  function handleClick() {
    const redirectUri = `${window.location.origin}/auth/instagram`;
    window.location.href = instagramLoginUrl(redirectUri);
  }

  return (
    <button type="button" className="btn-instagram" onClick={handleClick}>
      {label}
    </button>
  );
}
import { useEffect, useState } from "react";
import {
  isFirebaseConfigured,
  db,
} from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import "../styles/WelcomePage.css";

function WelcomePage() {
  const [backendsOk, setBackendsOk] = useState(null); // null = checking
  const [error, setError] = useState("");

  // This runs once when the page first loads.
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setBackendsOk(false);
      setError("Firebase is not configured yet.");
      return;
    }

    // Try a tiny, harmless read from Firestore. If it succeeds,
    // the connection to Firebase works.
    const checkFirebase = async () => {
      try {
        await getDoc(doc(db, "connectionTest", "instaclone"));
        setBackendsOk(true);
      } catch (err) {
        setBackendsOk(false);
        setError(err.message || "Could not reach Firebase.");
      }
    };
    checkFirebase();
  }, []);

  let statusBox;
  if (backendsOk === null) {
    statusBox = <p className="status-checking">Checking Firebase... </p>;
  } else if (backendsOk) {
    statusBox = <p className="status-ok">Connected to Firebase ✓</p>;
  } else {
    statusBox = <p className="status-error">{error}</p>;
  }

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <h1 className="logo">InstaClone</h1>
        <p className="tagline">A full-stack Instagram-style app built with Firebase.</p>

        {!isFirebaseConfigured ? (
          <div className="setup-box">
            <h2>⚙️ One-time setup needed</h2>
            <ol>
              <li>Go to <code>console.firebase.google.com</code> and log in.</li>
              <li>Click <strong>"Add project"</strong>, give it a name (e.g. instaclone) and create it.</li>
              <li>Click the <strong>&lt;/&gt;</strong> web icon, name the app (e.g. instaclone-web) and register it.</li>
              <li>Copy the 6 values on the screen.</li>
              <li>Open <code>client/.env</code> and paste them there.</li>
              <li>Restart the dev server with <code>npm run dev</code>.</li>
            </ol>
          </div>
        ) : (
          <div className="stage-box">
            <h2>✅ Stage 1 complete</h2>
            <p>React app is connected to Firebase.</p>
          </div>
        )}

        <div className="server-box">
          <h3>Firebase status</h3>
          {statusBox}
        </div>

        <p className="next-hint">
          Say <strong>"NEXT"</strong> when you are ready for Stage 2 (Login &amp; Register).
        </p>
      </div>
    </div>
  );
}

export default WelcomePage;
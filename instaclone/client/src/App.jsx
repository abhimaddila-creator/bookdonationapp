import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { isFirebaseConfigured } from "./services/firebase";
import { useAuth } from "./context/AuthContext";
import Spinner from "./components/Spinner";
import Navbar from "./components/Navbar";

// Pages are lazy-loaded so the browser only downloads the code
// for the screen you actually open (faster first load).
const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Home = lazy(() => import("./pages/Home"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const Explore = lazy(() => import("./pages/Explore"));
const Reels = lazy(() => import("./pages/Reels"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Saved = lazy(() => import("./pages/Saved"));
const Search = lazy(() => import("./pages/Search"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const InstaAuthCallback = lazy(() => import("./pages/InstaAuthCallback"));

// Shown briefly while a lazy page finishes downloading.
function PageLoader() {
  return (
    <div className="center-loading">
      <Spinner size={40} />
    </div>
  );
}

// Only shows its children to logged-in users; everyone else goes to /login.
function Protected({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-loading">
        <Spinner size={40} />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div className="app">
      <Navbar />
      <main className="container">{children}</main>
    </div>
  );
}

export default function App() {
  // Scroll back to the top every time the URL changes.
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Before Firebase is configured, show the one-time setup instructions.
  if (!isFirebaseConfigured) {
    return (
      <Suspense fallback={<PageLoader />}>
        <WelcomePage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/instagram" element={<InstaAuthCallback />} />

        <Route
          path="/"
          element={
            <Protected>
              <Home />
            </Protected>
          }
        />
        <Route
          path="/create"
          element={
            <Protected>
              <CreatePost />
            </Protected>
          }
        />
        <Route
          path="/explore"
          element={
            <Protected>
              <Explore />
            </Protected>
          }
        />
        <Route
          path="/reels"
          element={
            <Protected>
              <Reels />
            </Protected>
          }
        />
        <Route
          path="/p/:postId"
          element={
            <Protected>
              <PostDetail />
            </Protected>
          }
        />
        <Route
          path="/search"
          element={
            <Protected>
              <Search />
            </Protected>
          }
        />
        <Route
          path="/saved"
          element={
            <Protected>
              <Saved />
            </Protected>
          }
        />
        <Route
          path="/notifications"
          element={
            <Protected>
              <Notifications />
            </Protected>
          }
        />
        <Route
          path="/messages"
          element={
            <Protected>
              <Messages />
            </Protected>
          }
        />
        <Route
          path="/messages/:userId"
          element={
            <Protected>
              <Chat />
            </Protected>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <Protected>
              <EditProfile />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
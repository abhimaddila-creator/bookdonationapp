import { useEffect, useState } from "react";
import { isFollowing, followUser, unfollowUser } from "../services/userService";
import { formatError } from "../utils";

export default function FollowButton({ myUid, targetId }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!myUid || !targetId) return;
    let active = true;
    isFollowing(myUid, targetId).then((res) => active && setFollowing(res));
    return () => (active = false);
  }, [myUid, targetId]);

  // Never show a follow button on your own profile.
  if (!myUid || !targetId || myUid === targetId) return null;

  async function handleClick() {
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(myUid, targetId);
        setFollowing(false);
      } else {
        await followUser(myUid, targetId);
        setFollowing(true);
      }
    } catch (err) {
      alert(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={`follow-btn${following ? " following" : ""}`}
      onClick={handleClick}
      disabled={loading}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
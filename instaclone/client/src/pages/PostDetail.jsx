import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPostById } from "../services/postService";
import PostCard from "../components/PostCard";
import Spinner from "../components/Spinner";

export default function PostDetail() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getPostById(postId);
        if (active) setPost(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => (active = false);
  }, [postId]);

  if (loading) {
    return (
      <div className="center-loading">
        <Spinner size={40} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="empty">
        <h2 className="empty-title">Post not found</h2>
        <p>It may have been deleted.</p>
      </div>
    );
  }

  return <PostCard post={post} />;
}
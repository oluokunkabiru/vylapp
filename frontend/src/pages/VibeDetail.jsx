import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import { ErrorState, Spinner } from "../components/ui/index.jsx";

export default function VibeDetail({ lang }) {
  const { id } = useParams();
  const { user } = useAuth();
  const [vibe, setVibe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/vibes/${encodeURIComponent(id)}`)
      .then(({ vibe: loadedVibe }) => setVibe(loadedVibe))
      .catch(err => setError(err.message || "This vibe could not be found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={32} /></div>;
  if (error || !vibe) return <ErrorState title="Vibe unavailable" sub={error || "This vibe could not be found."} />;

  return (
    <div>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border2)" }}>
        <Link to={user ? "/feed" : "/"} style={{ color: "var(--text2)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>← Back to feed</Link>
      </div>
      <PostCard vibe={vibe} lang={lang || localStorage.getItem("vyl_lang") || "en"} />
    </div>
  );
}

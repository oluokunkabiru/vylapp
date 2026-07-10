import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api.js";
import { StoriesBar, StoryViewer } from "../components/feed/StoriesBar.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import { Spinner, Empty } from "../components/ui/index.jsx";

export default function Home({ lang }) {
  const [vibes, setVibes] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [storyUser, setStoryUser] = useState(null);
  const sentinelRef = useRef(null);

  const loadVibes = useCallback(async (p = 0) => {
    if (p === 0) setLoading(true); else setLoadingMore(true);
    try {
      const { vibes: newVibes } = await api.get(`/vibes/feed?page=${p}&pageSize=10&lang=${lang}`);
      if (p === 0) setVibes(newVibes || []);
      else setVibes(v => [...v, ...(newVibes || [])]);
      setHasMore((newVibes || []).length === 10);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, [lang]);

  // Re-fetch page 0 whenever the reading language changes, instead of
  // continuing pagination with a stale page number.
  useEffect(() => { setPage(0); setHasMore(true); loadVibes(0); }, [loadVibes]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setPage(p => { loadVibes(p + 1); return p + 1; });
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadVibes]);

  const onVibeCreated = useCallback(vibe => {
    setVibes(v => [vibe, ...v]);
  }, []);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:60 }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <>
      <StoriesBar onOpenStory={setStoryUser} />
      {vibes.length === 0
        ? <Empty emoji="✦" title="No vibes yet" sub="Be the first — share something with the community!" />
        : vibes.map((vibe, i) => (
            <PostCard key={vibe.id} vibe={vibe} lang={lang} firstTip={i === 0} onVibeCreated={onVibeCreated} />
          ))
      }
      {loadingMore && <div style={{ display:"flex", justifyContent:"center", padding:24 }}><Spinner /></div>}
      <div ref={sentinelRef} style={{ height:1 }} />
      {!hasMore && vibes.length > 0 && (
        <div style={{ padding:"28px 16px", textAlign:"center", color:"var(--text3)", fontSize:13 }}>
          You're all caught up ✓
        </div>
      )}
      {storyUser && <StoryViewer user={storyUser} onClose={() => setStoryUser(null)} />}
    </>
  );
}

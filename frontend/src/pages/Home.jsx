import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api.js";
import { StoriesBar, StoryViewer } from "../components/feed/StoriesBar.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import { Spinner, Empty, ErrorState, SkeletonPostCard } from "../components/ui/index.jsx";

export default function Home({ lang, newVibe, vibeSettle }) {
  const [vibes, setVibes] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [storyUser, setStoryUser] = useState(null);
  const sentinelRef = useRef(null);

  // A post made via the global "+" composer lands here immediately — it's
  // the optimistic, still-_pending vibe (V-16), not the confirmed one.
  // Deduped by id so a later refetch (e.g. after a language switch) that
  // already contains it doesn't double it up.
  useEffect(() => {
    if (!newVibe) return;
    setVibes(v => v.some(x => x.id === newVibe.id) ? v : [newVibe, ...v]);
  }, [newVibe]);

  // Reconciles the pending vibe above once the request actually resolves:
  // `final` present → swap the temp entry for the real, server-confirmed
  // one (clears _pending); `final` null → the post failed, remove it —
  // the visible rollback half of the optimistic-publish contract.
  useEffect(() => {
    if (!vibeSettle) return;
    const { tempId, final } = vibeSettle;
    setVibes(v => final ? v.map(x => x.id === tempId ? final : x) : v.filter(x => x.id !== tempId));
  }, [vibeSettle]);

  const loadVibes = useCallback(async (p = 0) => {
    if (p === 0) setLoading(true); else setLoadingMore(true);
    if (p === 0) setError(false);
    try {
      const { vibes: newVibes, hasMore: more } = await api.get(`/vibes/feed?page=${p}&pageSize=10&lang=${lang}`);
      if (p === 0) setVibes(newVibes || []);
      else setVibes(v => [...v, ...(newVibes || [])]);
      setHasMore(!!more);
    } catch {
      // D-09/D-11: a failed fetch used to fail silently, leaving the user
      // staring at whatever was already on screen (or an infinite spinner
      // on first load) with no way to know something broke or to retry.
      if (p === 0) setError(true);
    }
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

  // V-18 — a deleted post disappears from the feed it's actually showing
  // in, not just on the server.
  const onVibeDeleted = useCallback(id => {
    setVibes(v => v.filter(x => x.id !== id));
  }, []);

  // D-11 five-state standard for this screen: loading (skeleton, shaped
  // like the content — D-09) → error (retry) → empty → offline (not yet
  // distinguished from generic error — see plan) → success.
  if (loading) return (
    <>
      <SkeletonPostCard /><SkeletonPostCard /><SkeletonPostCard />
    </>
  );

  if (error && vibes.length === 0) return (
    <ErrorState title="Couldn't load your feed" sub="Check your connection and try again." onRetry={() => loadVibes(0)} />
  );

  return (
    <>
      <StoriesBar onOpenStory={setStoryUser} />
      {vibes.length === 0
        ? <Empty emoji="✦" title="No vibes yet" sub="Be the first — share something with the community!" />
        : vibes.map((vibe, i) => (
            <PostCard key={vibe.id} vibe={vibe} lang={lang} firstTip={i === 0} onVibeCreated={onVibeCreated} onDeleted={onVibeDeleted} />
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

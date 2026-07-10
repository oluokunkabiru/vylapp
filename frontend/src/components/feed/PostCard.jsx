import { useState, useRef } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { Avatar, VerifiedBadge, CategoryPill, TapIcon, ic, Ic, numFmt } from "../ui/index.jsx";

const CAT_GRADS = {
  TECH_VIBES:      "linear-gradient(135deg,#38BDF8,#7C3AED)",
  GLOBAL_CONNECT:  "linear-gradient(135deg,#10F5A0,#2DD4BF)",
  CREATIVE_LEARN:  "linear-gradient(135deg,#FFB830,#FF6B6B)",
  HUMAN_POTENTIAL: "linear-gradient(135deg,#A78BFA,#7C3AED)",
  SPACES_INVITE:   "linear-gradient(135deg,#FF6B6B,#FFB830)",
  GENERAL:         "linear-gradient(135deg,#7C3AED,#2DD4BF)",
};
const CAT_EMOJI = { TECH_VIBES:"⚡", GLOBAL_CONNECT:"🌍", CREATIVE_LEARN:"🎨", HUMAN_POTENTIAL:"🧠", SPACES_INVITE:"🎙️", GENERAL:"✦" };

function HeartBurst({ show }) {
  if (!show) return null;
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
      <div style={{ animation:"heartPop 0.9s ease forwards" }}>
        <Ic d={ic.heart} s={90} c="#fff" f="#fff" sw={0} />
      </div>
    </div>
  );
}

const LANG_NAMES = { es:"Spanish", sw:"Swahili", fr:"French", yo:"Yoruba", ha:"Hausa", ar:"Arabic", zh:"Chinese", hi:"Hindi" };

export default function PostCard({ vibe: initialVibe, lang, firstTip }) {
  const { user } = useAuth();
  const toast = useToast();
  const [vibe, setVibe] = useState(initialVibe);
  const [liked, setLiked] = useState(vibe.viewer?.liked ?? false);
  const [saved, setSaved] = useState(vibe.viewer?.saved ?? false);
  const [likeCount, setLikeCount] = useState(vibe.counts?.likes ?? 0);
  const [burst, setBurst] = useState(false);
  const [draft, setDraft] = useState("");
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  // Auto-translation arrives already attached to the vibe (see GET /vibes/feed)
  // for the main feed — it's on by default, this just lets the viewer flip
  // back to the original. `manualTranslatedText` is a fallback for contexts
  // (replies, single-vibe view) that don't go through that endpoint yet.
  const [showOriginal, setShowOriginal] = useState(false);
  const [manualTranslatedText, setManualTranslatedText] = useState(null);
  const [translating, setTranslating] = useState(false);
  const hasAutoTranslation = !!vibe.translation;
  const isTranslationAvailable = hasAutoTranslation || !!manualTranslatedText;
  const burstTimer = useRef(null);

  const toggleLike = async () => {
    if (!user) { toast("Sign in to like vibes", "error"); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      if (wasLiked) await api.delete(`/vibes/${vibe.id}/like`);
      else await api.post(`/vibes/${vibe.id}/like`);
    } catch { setLiked(wasLiked); setLikeCount(c => wasLiked ? c + 1 : c - 1); }
  };

  const onDoubleTap = () => {
    if (!liked) toggleLike();
    setBurst(true);
    clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(false), 900);
  };

  const toggleBookmark = async () => {
    if (!user) { toast("Sign in to save vibes", "error"); return; }
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) await api.delete(`/vibes/${vibe.id}/bookmark`);
      else await api.post(`/vibes/${vibe.id}/bookmark`);
      toast(wasSaved ? "Removed from saved" : "Saved ✓");
    } catch { setSaved(wasSaved); }
  };

  const submitReply = async () => {
    const text = draft.trim();
    if (!text || !user) return;
    setDraft("");
    try {
      const { vibe: reply } = await api.post("/vibes", { content: text, category: vibe.category, replyTo: vibe.id });
      setReplies(r => [...r, { ...reply, author: { displayName: user.displayName, handle: user.handle, avatarColor: user.avatarColor, avatarInitials: user.avatarInitials } }]);
      setShowReplies(true);
      setVibe(v => ({ ...v, counts: { ...v.counts, replies: (v.counts?.replies || 0) + 1 } }));
    } catch (e) { toast(e.message, "error"); }
  };

  const loadReplies = async () => {
    if (showReplies) { setShowReplies(false); return; }
    try {
      const { replies: r } = await api.get(`/vibes/${vibe.id}`);
      setReplies(r || []);
      setShowReplies(true);
    } catch {}
  };

  const doTranslate = async () => {
    if (isTranslationAvailable) { setShowOriginal(s => !s); return; }
    setTranslating(true);
    try {
      const { text } = await api.post(`/translate/vibes/${vibe.id}`, { toLang: lang });
      setManualTranslatedText(text);
      setShowOriginal(false);
    } catch (e) { toast("Translation unavailable", "error"); }
    finally { setTranslating(false); }
  };

  const shareVibe = () => {
    const url = `${window.location.origin}/vibes/${vibe.id}`;
    navigator.clipboard?.writeText(url).then(() => toast("Link copied ✓")).catch(() => toast("Copy failed", "error"));
  };

  const grad = CAT_GRADS[vibe.category] || CAT_GRADS.GENERAL;
  const emoji = CAT_EMOJI[vibe.category] || "✦";
  const translatedText = hasAutoTranslation ? vibe.translation.text : manualTranslatedText;
  const caption = (isTranslationAvailable && !showOriginal) ? translatedText : vibe.content;
  const timeAgo = vibe.createdAt ? timeString(vibe.createdAt) : "";

  return (
    <article style={{ borderBottom:"1px solid var(--border2)", paddingBottom:14 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px" }}>
        <Avatar user={vibe.author} size={38} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontWeight:800, fontSize:14 }}>{vibe.author?.displayName}</span>
            {vibe.author?.verified && <VerifiedBadge />}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
            <CategoryPill category={vibe.category} />
            <span style={{ color:"var(--text3)", fontSize:12 }}>· {timeAgo}</span>
          </div>
        </div>
        <TapIcon d={ic.dotsH} size={20} c="var(--text2)" label="More options" onClick={() => toast("Options coming soon")} />
      </div>

      {/* Media */}
      <div onDoubleClick={onDoubleTap} style={{
        position:"relative", width:"100%", aspectRatio:"4/5",
        background:`radial-gradient(circle at 50% 38%, rgba(255,255,255,0.10), transparent 55%), ${grad}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", userSelect:"none",
      }}>
        <div style={{
          width:88, height:88, borderRadius:"50%",
          background:"rgba(255,255,255,0.14)", backdropFilter:"blur(6px)",
          border:"1px solid rgba(255,255,255,0.22)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <span style={{ fontSize:36 }}>{emoji}</span>
        </div>
        <HeartBurst show={burst} />
        {vibe.impactBadge && (
          <div style={{
            position:"absolute", bottom:12, left:12, padding:"5px 12px",
            borderRadius:"var(--radius-pill)", background:"rgba(0,0,0,0.55)",
            backdropFilter:"blur(8px)", fontSize:12, fontWeight:800, color:"#fff", letterSpacing:0.5,
          }}>{vibe.impactBadge}</div>
        )}
      </div>

      {firstTip && (
        <div style={{ margin:"10px 16px 0", padding:"10px 14px", borderRadius:12, background:"var(--bg3)", border:"1px solid var(--border2)", fontSize:13, color:"var(--text2)", display:"flex", alignItems:"center", gap:8 }}>
          💡 Double-tap the photo to like it
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", alignItems:"center", padding:"6px 8px 0" }}>
        <TapIcon d={ic.heart} f={liked ? "var(--coral)" : "none"} c={liked ? "var(--coral)" : "var(--text)"} onClick={toggleLike} label="Like" />
        <TapIcon d={ic.comment} c="var(--text)" label="Comment" onClick={loadReplies} />
        <TapIcon d={ic.send} c="var(--text)" label="Share" onClick={shareVibe} />
        <div style={{ flex:1 }} />
        <TapIcon d={ic.bookmark} f={saved ? "var(--text)" : "none"} c="var(--text)" onClick={toggleBookmark} label="Save" />
      </div>

      <div style={{ padding:"2px 16px 0" }}>
        <div style={{ fontWeight:800, fontSize:14 }}>{numFmt(likeCount)} people like this</div>

        <div style={{ marginTop:4, fontSize:14, lineHeight:1.55 }}>
          <span style={{ fontWeight:800 }}>@{vibe.author?.handle}</span>{" "}
          <span style={{ color:"var(--text)" }}>{caption}</span>
        </div>

        {vibe.tags?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:5 }}>
            {vibe.tags.map(t => (
              <span key={t} style={{ color:"var(--sky)", fontSize:13, fontWeight:600 }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Translation toggle — shown translated by default when the feed already
            auto-translated this vibe; otherwise behaves as an on-demand fetch. */}
        {lang && lang !== (vibe.language || "en") && (
          <button onClick={doTranslate} disabled={translating} style={{
            display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"6px 12px",
            borderRadius:"var(--radius-pill)",
            border:`1px solid ${isTranslationAvailable && !showOriginal ? "var(--violet)" : "var(--border)"}`,
            background: isTranslationAvailable && !showOriginal ? "var(--violet-dim)" : "transparent",
            color: isTranslationAvailable && !showOriginal ? "var(--violet-lt)" : "var(--text2)",
            fontSize:12.5, fontWeight:700, cursor:"pointer",
          }}>
            <Ic d={ic.globe} s={14} c={isTranslationAvailable && !showOriginal ? "var(--violet-lt)" : "var(--text2)"} />
            {translating
              ? "Translating…"
              : isTranslationAvailable && !showOriginal
                ? `${LANG_NAMES[lang] || lang} · tap to see original`
                : `See in ${LANG_NAMES[lang] || lang}`}
          </button>
        )}

        {/* Replies section */}
        {vibe.counts?.replies > 0 && !showReplies && (
          <button onClick={loadReplies} style={{
            display:"block", marginTop:8, background:"none", border:"none",
            color:"var(--text2)", fontSize:13.5, cursor:"pointer", padding:0,
          }}>View all {numFmt(vibe.counts.replies)} comments</button>
        )}
        {showReplies && replies.map((r, i) => (
          <div key={i} style={{ fontSize:13.5, marginTop:5, lineHeight:1.4 }}>
            <span style={{ fontWeight:800 }}>@{r.author?.handle}</span>{" "}
            <span style={{ color:"var(--text2)" }}>{r.content}</span>
          </div>
        ))}

        {/* Add comment */}
        {user && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
            <Avatar user={user} size={28} />
            <input
              value={draft} onChange={e=>setDraft(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") submitReply(); }}
              placeholder="Add a comment…"
              style={{
                flex:1, background:"none", border:"none",
                borderBottom:"1px solid var(--border2)", color:"var(--text)",
                fontSize:14, padding:"6px 2px", outline:"none",
              }}
            />
            {draft.trim() && (
              <button onClick={submitReply} style={{
                background:"none", border:"none", color:"var(--violet-lt)",
                fontWeight:800, fontSize:13.5, cursor:"pointer",
              }}>Post</button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function timeString(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d/60000)}m`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h`;
  return `${Math.floor(d/86400000)}d`;
}

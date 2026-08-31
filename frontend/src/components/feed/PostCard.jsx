import { useState, useRef } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { Avatar, VerifiedBadge, CategoryPill, TapIcon, ic, Ic, numFmt, Menu } from "../ui/index.jsx";
import { LANG_NAMES, isRtl } from "../../lib/languages.js";

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

export default function PostCard({ vibe: initialVibe, lang, firstTip, onDeleted, onHidden }) {
  const { user } = useAuth();
  const toast = useToast();
  const [vibe, setVibe] = useState(initialVibe);
  const [liked, setLiked] = useState(vibe.viewer?.liked ?? false);
  const [saved, setSaved] = useState(vibe.viewer?.saved ?? false);
  const [reposted, setReposted] = useState(vibe.viewer?.reposted ?? false);
  const [likeCount, setLikeCount] = useState(vibe.counts?.likes ?? 0);
  const [repostCount, setRepostCount] = useState(vibe.counts?.reposts ?? 0);
  const [burst, setBurst] = useState(false);
  const [draft, setDraft] = useState("");
  // V-18 — edit with a visible marker, not a silent rewrite.
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetail, setReportDetail] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const isMine = !!user && user.handle === vibe.author?.handle;

  const startEdit = () => { setEditText(vibe.content); setIsEditing(true); };
  const cancelEdit = () => setIsEditing(false);
  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      const { vibe: updated } = await api.patch(`/vibes/${vibe.id}`, { content: editText.trim(), language: vibe.language });
      setVibe(v => ({ ...v, ...updated }));
      setIsEditing(false);
      toast("Vibe updated ✓");
    } catch (e) { toast(e.message, "error"); }
  };
  const deleteVibe = async () => {
    if (!window.confirm("Delete this vibe? This can't be undone.")) return;
    try {
      await api.delete(`/vibes/${vibe.id}`);
      onDeleted?.(vibe.id);
      toast("Vibe deleted");
    } catch (e) { toast(e.message, "error"); }
  };
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

  // T-21/T-22 — the correction affordance lives right where the translation
  // itself is shown, not buried in a menu. `correctionText` is pre-filled
  // with the current translation so the reader is editing it, not starting
  // from a blank field.
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const submitCorrection = async currentTranslation => {
    if (!correctionText.trim() || correctionText.trim() === currentTranslation.trim()) return;
    try {
      await api.post("/translate/corrections", {
        text: vibe.content, targetLang: lang,
        originalTranslation: currentTranslation, suggestedText: correctionText.trim(),
      });
      toast("Thanks — your correction was submitted for review");
      setShowCorrection(false);
    } catch (e) { toast(e.message, "error"); }
  };

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

  const toggleRepost = async () => {
    if (!user) { toast("Sign in to repost vibes", "error"); return; }
    const wasReposted = reposted;
    setReposted(!wasReposted);
    setRepostCount(count => Math.max(0, count + (wasReposted ? -1 : 1)));
    try {
      const result = wasReposted
        ? await api.delete(`/vibes/${vibe.id}/repost`)
        : await api.post(`/vibes/${vibe.id}/repost`);
      if (typeof result.repostsCount === "number") setRepostCount(result.repostsCount);
      toast(wasReposted ? "Repost removed" : "Reposted ✓");
    } catch (error) {
      setReposted(wasReposted);
      setRepostCount(count => Math.max(0, count + (wasReposted ? 1 : -1)));
      toast(error.message, "error");
    }
  };

  const muteAuthor = async () => {
    try {
      await api.post(`/users/${vibe.author.id}/mute`);
      onHidden?.(vibe.author.id);
      toast(`Muted @${vibe.author.handle}`);
    } catch (error) { toast(error.message, "error"); }
  };

  const blockAuthor = async () => {
    if (!window.confirm(`Block @${vibe.author.handle}? You will no longer see each other's content.`)) return;
    try {
      await api.post(`/users/${vibe.author.id}/block`);
      onHidden?.(vibe.author.id);
      toast(`Blocked @${vibe.author.handle}`);
    } catch (error) { toast(error.message, "error"); }
  };

  const submitReport = async () => {
    setReportBusy(true);
    try {
      await api.post("/moderation/reports", { reason: reportReason, detail: reportDetail.trim() || undefined, vibeId: vibe.id });
      setReportOpen(false);
      setReportDetail("");
      toast("Report submitted for review");
    } catch (error) { toast(error.message, "error"); }
    finally { setReportBusy(false); }
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
    } catch { toast("Couldn't load replies", "error"); }
  };

  const doTranslate = async () => {
    if (isTranslationAvailable) { setShowOriginal(s => !s); return; }
    setTranslating(true);
    try {
      const { text, method } = await api.post(`/translate/vibes/${vibe.id}`, { toLang: lang });
      // Found live: the engine's organic-dictionary fallback returns the
      // ORIGINAL text unchanged with method:"untranslated" when it has no
      // AI key and no dictionary entry for this phrase — this used to be
      // set as the "translation" regardless, so the UI claimed "Translated
      // from X" and showed a correction affordance over text that was
      // never actually translated. Be honest about the miss instead.
      if (method === "disabled") {
        toast("Translation is turned off in this environment", "error");
        return;
      }
      if (method === "untranslated" || method === "passthrough") {
        toast("No translation available for this yet", "error");
        return;
      }
      setManualTranslatedText(text);
      setShowOriginal(false);
    } catch { toast("Translation unavailable", "error"); }
    finally { setTranslating(false); }
  };

  const shareVibe = () => {
    const url = `${window.location.origin}/vibes/${vibe.id}`;
    navigator.clipboard?.writeText(url).then(() => toast("Link copied ✓")).catch(() => toast("Copy failed", "error"));
  };

  const grad = CAT_GRADS[vibe.category] || CAT_GRADS.GENERAL;
  const emoji = CAT_EMOJI[vibe.category] || "✦";
  const translatedText = hasAutoTranslation ? vibe.translation.text : manualTranslatedText;
  const showingTranslation = isTranslationAvailable && !showOriginal;
  const caption = showingTranslation ? translatedText : vibe.content;
  // The lang/dir actually being displayed right now (D-02 per-script line
  // height, D-15 RTL, D-20 screen readers) — swaps when the translation
  // reveal toggles between original and translated text.
  const captionLang = showingTranslation ? lang : (vibe.language || "en");
  const timeAgo = vibe.createdAt ? timeString(vibe.createdAt) : "";
  // V-16 — the optimistic, not-yet-confirmed state: dimmed and
  // non-interactive (its id is a client-side placeholder, not a real vibe
  // id, so any like/comment/bookmark/share tap would just 404) until
  // Home's settle effect either finalizes or rolls it back.
  const isPending = !!vibe._pending;

  return (
    <article style={{ borderBottom:"1px solid var(--border2)", paddingBottom:14, opacity: isPending ? 0.6 : 1, transition:"opacity var(--duration-base) var(--ease-standard)" }}>
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
            <span style={{ color:"var(--text3)", fontSize:12 }}>
              {isPending ? "Posting…" : `· ${timeAgo}${vibe.isEdited ? " · edited" : ""}`}
            </span>
          </div>
        </div>
        {!isPending && (
          isMine ? (
            <Menu
              trigger={<TapIcon d={ic.dotsH} size={20} c="var(--text2)" label="More options" />}
              items={[
                { label:"Edit", onClick: startEdit },
                { label:"Delete", danger:true, onClick: deleteVibe },
              ]}
            />
          ) : (
            <Menu
              trigger={<TapIcon d={ic.dotsH} size={20} c="var(--text2)" label="More options" />}
              items={[
                { label:"Report post", onClick: () => setReportOpen(true) },
                { label:`Mute @${vibe.author?.handle}`, onClick: muteAuthor },
                { label:`Block @${vibe.author?.handle}`, danger:true, onClick: blockAuthor },
              ]}
            />
          )
        )}
      </div>

      {/* Processed media, or the category artwork for text-only vibes. */}
      <div onDoubleClick={isPending ? undefined : onDoubleTap} style={{ pointerEvents: isPending ? "none" : "auto", position:"relative", width:"100%", cursor:"pointer", userSelect:"none" }}>
        {vibe.media?.length ? (
          <div style={{ display:"grid", gridTemplateColumns: vibe.media.length === 1 ? "1fr" : "1fr 1fr", gap:2, background:"var(--bg3)" }}>
            {vibe.media.map((item, index) => (
              <div key={item.id || item.url} style={{ position:"relative", overflow:"hidden", aspectRatio: vibe.media.length === 1 && item.width && item.height ? `${item.width}/${item.height}` : "1/1", maxHeight:620 }}>
                {item.mediaType === "video"
                  ? <video src={item.url} poster={item.thumbnailUrl || undefined} controls playsInline preload="metadata" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  : <img src={item.url} alt={item.altText || `Vibe media ${index + 1}`} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ aspectRatio:"4/5", background:`radial-gradient(circle at 50% 38%, rgba(255,255,255,0.10), transparent 55%), ${grad}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:88, height:88, borderRadius:"50%", background:"rgba(255,255,255,0.14)", backdropFilter:"blur(6px)", border:"1px solid rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:36 }}>{emoji}</span>
            </div>
          </div>
        )}
        <HeartBurst show={burst} />
        {vibe.impactBadge && (
          <div className="vy-post-impact-badge" style={{
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
      <div style={{ display:"flex", alignItems:"center", padding:"6px 8px 0", pointerEvents: isPending ? "none" : "auto" }}>
        <TapIcon d={ic.heart} f={liked ? "var(--coral)" : "none"} c={liked ? "var(--coral)" : "var(--text)"} onClick={toggleLike} label="Like" />
        <TapIcon d={ic.comment} c="var(--text)" label="Comment" onClick={loadReplies} />
        <TapIcon d={ic.repeat} c={reposted ? "var(--green)" : "var(--text)"} onClick={toggleRepost} label={reposted ? "Undo repost" : "Repost"} />
        <TapIcon d={ic.send} c="var(--text)" label="Share" onClick={shareVibe} />
        <div style={{ flex:1 }} />
        <TapIcon d={ic.bookmark} f={saved ? "var(--text)" : "none"} c="var(--text)" onClick={toggleBookmark} label="Save" />
      </div>

      <div style={{ padding:"2px 16px 0" }}>
        <div style={{ fontWeight:800, fontSize:14 }}>{numFmt(likeCount)} people like this</div>
        {repostCount > 0 && <div style={{ color:"var(--text2)", fontSize:12.5, marginTop:2 }}>{numFmt(repostCount)} repost{repostCount === 1 ? "" : "s"}</div>}

        {isEditing ? (
          <div style={{ marginTop:6 }}>
            <textarea
              dir="auto" value={editText} onChange={e=>setEditText(e.target.value.slice(0,500))} rows={3}
              style={{ width:"100%", padding:10, borderRadius:12, border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:14, outline:"none", resize:"none", fontFamily:"var(--font)" }}
            />
            <div style={{ display:"flex", gap:8, marginTop:6 }}>
              <button onClick={saveEdit} style={{ padding:"6px 14px", borderRadius:"var(--radius-pill)", background:"var(--grad)", color:"#fff", fontWeight:700, fontSize:13 }}>Save</button>
              <button onClick={cancelEdit} style={{ padding:"6px 14px", borderRadius:"var(--radius-pill)", border:"1px solid var(--border)", background:"transparent", color:"var(--text2)", fontWeight:700, fontSize:13 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop:4, fontSize:14, lineHeight:1.55 }}>
            <span style={{ fontWeight:800 }}>@{vibe.author?.handle}</span>{" "}
            {/* A keyed element deliberately remounts on each change so the
                reveal is a clear fold/unfold transition, rather than text
                silently swapping under the reader's eye. */}
            <span
              key={`${vibe.id}-${showingTranslation ? "translation" : "original"}`}
              className="vy-translation-reveal"
              lang={captionLang}
              dir={isRtl(captionLang) ? "rtl" : "ltr"}
              aria-live="polite"
              aria-atomic="true"
              style={{ color:"var(--text)" }}
            >{caption}</span>
          </div>
        )}

        {/* Provenance — makes translation visible as it happens, not just
            available behind a button. This is the one place in the feed
            that shows the "translation is architecture" claim in the UI. */}
        {isTranslationAvailable && !showOriginal && (
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:5, flexWrap:"wrap" }}>
            <Ic d={ic.globe} s={11} c="var(--sky)" />
            <span style={{ fontSize:11.5, color:"var(--sky)", fontWeight:600 }}>
              Translated from {LANG_NAMES[vibe.language] || vibe.language}
            </span>
            {/* T-21 — discreet, always present wherever a translation is shown. */}
            {!showCorrection && (
              <button onClick={() => { setCorrectionText(translatedText); setShowCorrection(true); }} style={{
                background:"none", color:"var(--text3)", fontSize:11.5, fontWeight:600, textDecoration:"underline",
              }}>Suggest a fix</button>
            )}
          </div>
        )}

        {showCorrection && (
          <div style={{ marginTop:6 }}>
            <textarea
              dir="auto" value={correctionText} onChange={e=>setCorrectionText(e.target.value)} rows={2}
              style={{ width:"100%", padding:8, borderRadius:10, border:"1px solid var(--sky)", background:"var(--bg3)", color:"var(--text)", fontSize:13, outline:"none", resize:"none", fontFamily:"var(--font)" }}
            />
            <div style={{ display:"flex", gap:8, marginTop:6 }}>
              <button onClick={() => submitCorrection(translatedText)} style={{ padding:"5px 12px", borderRadius:"var(--radius-pill)", background:"var(--sky)", color:"#08070F", fontWeight:700, fontSize:12.5 }}>Submit</button>
              <button onClick={() => setShowCorrection(false)} style={{ padding:"5px 12px", borderRadius:"var(--radius-pill)", border:"1px solid var(--border)", background:"transparent", color:"var(--text2)", fontWeight:700, fontSize:12.5 }}>Cancel</button>
            </div>
          </div>
        )}

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
            border:`1px solid ${isTranslationAvailable && !showOriginal ? "var(--sky)" : "var(--border)"}`,
            background: isTranslationAvailable && !showOriginal ? "var(--sky-dim)" : "transparent",
            color: isTranslationAvailable && !showOriginal ? "var(--sky)" : "var(--text2)",
            fontSize:12.5, fontWeight:700, cursor:"pointer",
          }}>
            <Ic d={ic.globe} s={14} c={isTranslationAvailable && !showOriginal ? "var(--sky)" : "var(--text2)"} />
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
            <input dir="auto"
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

      {reportOpen && (
        <div onClick={() => !reportBusy && setReportOpen(false)} style={{ position:"fixed", inset:0, zIndex:450, background:"rgba(8,7,15,.82)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Report post" style={{ width:"100%", maxWidth:400, padding:20, borderRadius:18, background:"var(--bg2)", border:"1px solid var(--border)" }}>
            <h2 style={{ margin:"0 0 6px", fontSize:19 }}>Report this post</h2>
            <p style={{ margin:"0 0 16px", color:"var(--text2)", fontSize:13.5 }}>Choose the reason that best describes the problem.</p>
            <select value={reportReason} onChange={event => setReportReason(event.target.value)} style={{ width:"100%", padding:11, borderRadius:10, background:"var(--bg3)", border:"1px solid var(--border2)", color:"var(--text)", marginBottom:10 }}>
              <option value="spam">Spam</option><option value="harassment">Harassment</option>
              <option value="misinformation">Misinformation</option><option value="explicit_content">Explicit content</option>
              <option value="hate_speech">Hate speech</option><option value="violence">Violence</option>
              <option value="copyright">Copyright</option><option value="impersonation">Impersonation</option><option value="other">Other</option>
            </select>
            <textarea value={reportDetail} onChange={event => setReportDetail(event.target.value.slice(0,1000))} rows={4} placeholder="Add details (optional)" style={{ width:"100%", resize:"vertical", padding:11, borderRadius:10, background:"var(--bg3)", border:"1px solid var(--border2)", color:"var(--text)", fontFamily:"var(--font)" }} />
            <div style={{ display:"flex", justifyContent:"flex-end", gap:9, marginTop:14 }}>
              <button disabled={reportBusy} onClick={() => setReportOpen(false)} style={{ padding:"8px 14px", borderRadius:10, background:"transparent", border:"1px solid var(--border)", color:"var(--text2)" }}>Cancel</button>
              <button disabled={reportBusy} onClick={submitReport} style={{ padding:"8px 14px", borderRadius:10, background:"var(--coral)", color:"#fff", fontWeight:800 }}>{reportBusy ? "Submitting…" : "Submit report"}</button>
            </div>
          </div>
        </div>
      )}
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

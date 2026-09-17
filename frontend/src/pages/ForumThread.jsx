import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, Spinner, Empty, ErrorState, PrimaryButton, numFmt } from "../components/ui/index.jsx";

function VoteColumn({ score, onVote, disabled }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, width:30, flexShrink:0 }}>
      <button onClick={() => onVote("up")} disabled={disabled} aria-label="Upvote" style={{ background:"none", border:"none", padding:2, cursor: disabled ? "default" : "pointer" }}>
        <Ic d={ic.arrowUp} s={17} c="var(--text3)" />
      </button>
      <span style={{ fontWeight:800, fontSize:13 }}>{numFmt(score)}</span>
      <button onClick={() => onVote("down")} disabled={disabled} aria-label="Downvote" style={{ background:"none", border:"none", padding:2, cursor: disabled ? "default" : "pointer" }}>
        <Ic d={ic.arrowDown} s={17} c="var(--text3)" />
      </button>
    </div>
  );
}

function ReplyNode({ reply, children, userId, onVote, onDelete, onReplyTo }) {
  return (
    <div style={{ marginLeft: reply.depth > 0 ? 22 : 0, marginTop:14 }}>
      <div style={{ display:"flex", gap:10 }}>
        <VoteColumn score={reply.vote_score} onVote={v => onVote(reply.id, v)} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>{reply.author_name || reply.author_handle}</span>
            <span style={{ color:"var(--text3)", fontSize:11.5 }}>{new Date(reply.created_at).toLocaleDateString()}</span>
            {reply.is_accepted && <span style={{ color:"var(--green)", fontSize:11, fontWeight:800 }}>✓ Accepted</span>}
          </div>
          <div style={{ fontSize:14, lineHeight:1.5, color: reply.is_removed ? "var(--text3)" : "var(--text)", fontStyle: reply.is_removed ? "italic" : "normal" }}>
            {reply.bodyTranslation ? reply.bodyTranslation.text : reply.body}
          </div>
          {!reply.is_removed && (
            <div style={{ display:"flex", gap:14, marginTop:6 }}>
              {reply.depth < 3 && (
                <button onClick={() => onReplyTo(reply.id)} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:12, fontWeight:700, cursor:"pointer", padding:0 }}>Reply</button>
              )}
              {reply.author_id === userId && (
                <button onClick={() => onDelete(reply.id)} style={{ background:"none", border:"none", color:"var(--coral)", fontSize:12, fontWeight:700, cursor:"pointer", padding:0 }}>Delete</button>
              )}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function buildTree(replies, ctx) {
  const byParent = new Map();
  replies.forEach(r => {
    const key = r.parent_reply_id || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(r);
  });
  const render = parentId => (byParent.get(parentId) || []).map(r => (
    <ReplyNode key={r.id} reply={r} userId={ctx.userId} onVote={ctx.onVote} onDelete={ctx.onDelete} onReplyTo={ctx.onReplyTo}>
      {render(r.id)}
    </ReplyNode>
  ));
  return render("root");
}

export default function ForumThread({ lang }) {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [posting, setPosting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    api.get(`/forum/threads/${id}${lang ? `?lang=${lang}` : ""}`)
      .then(({ thread: t, replies: r }) => { setThread(t); setReplies(r || []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id, lang]);

  const voteThread = async value => {
    if (!user) { toast("Sign in to vote", "error"); return; }
    try {
      const { vote_score } = await api.post(`/forum/threads/${id}/vote`, { value });
      setThread(t => ({ ...t, vote_score }));
    } catch (e) { toast(e.message, "error"); }
  };

  const voteReply = async (replyId, value) => {
    if (!user) { toast("Sign in to vote", "error"); return; }
    try {
      const { vote_score } = await api.post(`/forum/replies/${replyId}/vote`, { value });
      setReplies(rs => rs.map(r => r.id === replyId ? { ...r, vote_score } : r));
    } catch (e) { toast(e.message, "error"); }
  };

  const deleteReply = async replyId => {
    try {
      await api.delete(`/forum/replies/${replyId}`);
      setReplies(rs => rs.map(r => r.id === replyId ? { ...r, is_removed: true, body: "[removed]" } : r));
    } catch (e) { toast(e.message, "error"); }
  };

  const submitReply = async e => {
    e.preventDefault();
    if (!user) { toast("Sign in to reply", "error"); return; }
    if (!replyBody.trim()) return;
    setPosting(true);
    try {
      const { reply, support } = await api.post(`/forum/threads/${id}/replies`, { body: replyBody.trim(), parent_reply_id: replyTo || undefined });
      if (support) { toast("It looks like you might be going through something difficult — please reach out to a crisis support line.", "error"); setPosting(false); return; }
      // The create endpoint returns Prisma's camelCase shape (createdAt), but
      // every reply already on the page came from getThread's raw-SQL fetch,
      // which is snake_case (created_at) — normalize here or the freshly
      // posted reply renders "Invalid Date" while every other one is fine.
      setReplies(rs => [...rs, {
        id: reply.id, body: reply.body, vote_score: 0, created_at: reply.createdAt,
        author_id: user.id, author_name: user.displayName, author_handle: user.handle,
        depth: replyTo ? (rs.find(r => r.id === replyTo)?.depth ?? 0) + 1 : 0,
        parent_reply_id: replyTo || null, is_removed: false, is_accepted: false,
      }]);
      setThread(t => ({ ...t, reply_count: (t.reply_count || 0) + 1 }));
      setReplyBody("");
      setReplyTo(null);
    } catch (e) { toast(e.message, "error"); }
    finally { setPosting(false); }
  };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={36} /></div>;
  if (error) return <ErrorState sub="Couldn't load this thread." onRetry={load} />;
  if (!thread) return <Empty emoji="💬" title="Thread not found" sub="It may have been removed." />;

  const replyCtx = { userId: user?.id, onVote: voteReply, onDelete: deleteReply, onReplyTo: setReplyTo };

  return (
    <div style={{ padding:16, paddingBottom:100 }}>
      <div style={{ display:"flex", gap:12, marginBottom:8 }}>
        <VoteColumn score={thread.vote_score} onVote={voteThread} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
            {thread.is_pinned && <Ic d={ic.pin} s={14} c="var(--amber)" />}
            <h1 style={{ fontSize:19, fontWeight:900, margin:0, lineHeight:1.3 }}>
              {showOriginal || !thread.titleTranslation ? thread.title : thread.titleTranslation.text}
            </h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, color:"var(--text3)", fontSize:12.5, marginBottom:14 }}>
            <span>{thread.author_name || thread.author_handle}</span>
            <span>·</span>
            <span>{new Date(thread.created_at).toLocaleDateString()}</span>
            <span>·</span>
            <span>{numFmt(thread.view_count)} views</span>
          </div>
          <div style={{ fontSize:14.5, lineHeight:1.6, whiteSpace:"pre-wrap", marginBottom:8 }}>
            {showOriginal || !thread.bodyTranslation ? thread.body : thread.bodyTranslation.text}
          </div>
          {(thread.titleTranslation || thread.bodyTranslation) && (
            <button onClick={() => setShowOriginal(s => !s)} style={{ background:"none", border:"none", color:"var(--sky)", fontSize:12.5, fontWeight:700, cursor:"pointer", padding:0, marginBottom:8 }}>
              {showOriginal ? `See in ${lang}` : "See original"}
            </button>
          )}
        </div>
      </div>

      <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", margin:"18px 0 4px", paddingTop:14, borderTop:"1px solid var(--border2)" }}>
        {numFmt(thread.reply_count)} replies
      </div>

      {replies.length === 0 ? (
        <Empty emoji="💬" title="No replies yet" sub="Be the first to respond." />
      ) : buildTree(replies, replyCtx)}

      <form onSubmit={submitReply} style={{ position:"sticky", bottom:0, background:"var(--bg)", paddingTop:14, marginTop:20 }}>
        {replyTo && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ color:"var(--text3)", fontSize:12 }}>Replying to a comment</span>
            <button type="button" onClick={() => setReplyTo(null)} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:12, cursor:"pointer" }}>Cancel</button>
          </div>
        )}
        <textarea
          value={replyBody} onChange={e => setReplyBody(e.target.value)}
          placeholder={user ? "Write a reply…" : "Sign in to reply"} disabled={!user} rows={3} maxLength={10000}
          style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:14, outline:"none", marginBottom:8, resize:"vertical", fontFamily:"var(--font)" }}
        />
        <PrimaryButton full loading={posting} disabled={!user}>Post reply</PrimaryButton>
      </form>
    </div>
  );
}

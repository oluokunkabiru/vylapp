import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, Spinner, Empty, ErrorState, PrimaryButton, GhostButton, numFmt } from "../components/ui/index.jsx";

const SORTS = [["hot","Hot"],["new","New"],["top","Top"]];

function ThreadRow({ thread }) {
  return (
    <Link to={`/forum/thread/${thread.id}`} style={{ textDecoration:"none", color:"inherit" }}>
      <div style={{ display:"flex", gap:12, padding:"14px 0", borderBottom:"1px solid var(--border2)" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:34, flexShrink:0, paddingTop:2 }}>
          <span style={{ fontWeight:800, fontSize:14, color: thread.vote_score > 0 ? "var(--sky)" : "var(--text3)" }}>{numFmt(thread.vote_score)}</span>
          <span style={{ fontSize:10.5, color:"var(--text3)", fontWeight:700 }}>votes</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            {thread.is_pinned && <Ic d={ic.pin} s={13} c="var(--amber)" />}
            <div style={{ fontWeight:700, fontSize:14.5, lineHeight:1.35 }}>
              {thread.titleTranslation ? thread.titleTranslation.text : thread.title}
            </div>
          </div>
          <div style={{ color:"var(--text3)", fontSize:12.5 }}>
            by {thread.author_name || thread.author_handle} · {numFmt(thread.reply_count)} replies · {numFmt(thread.view_count)} views
          </div>
        </div>
      </div>
    </Link>
  );
}

function NewThreadForm({ categoryId, onCreated, onCancel }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (title.trim().length < 5 || body.trim().length < 10) {
      toast("Title needs 5+ characters, body needs 10+", "error");
      return;
    }
    setBusy(true);
    try {
      const { thread, pending, support } = await api.post("/forum/threads", { category_id: categoryId, title: title.trim(), body: body.trim() });
      if (support) { toast("It looks like you might be going through something difficult — please reach out to a crisis support line.", "error"); setBusy(false); return; }
      toast(pending ? "Thread submitted — pending review" : "Thread posted ✓");
      onCreated(thread);
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:16, padding:16, marginBottom:16 }}>
      <input
        value={title} onChange={e=>setTitle(e.target.value)} placeholder="Thread title" maxLength={300} autoFocus
        style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg)", color:"var(--text)", fontSize:14.5, outline:"none", marginBottom:10, fontWeight:700 }}
      />
      <textarea
        value={body} onChange={e=>setBody(e.target.value)} placeholder="What's on your mind?" rows={5} maxLength={50000}
        style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg)", color:"var(--text)", fontSize:14, outline:"none", marginBottom:12, resize:"vertical", fontFamily:"var(--font)" }}
      />
      <div style={{ display:"flex", gap:8 }}>
        <PrimaryButton loading={busy} style={{ flex:1, padding:"10px 16px", fontSize:13.5 }}>Post thread</PrimaryButton>
        <GhostButton onClick={onCancel} style={{ flex:1 }}>Cancel</GhostButton>
      </div>
    </form>
  );
}

export default function ForumCategory({ lang }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [category, setCategory] = useState(null);
  const [threads, setThreads] = useState([]);
  const [sort, setSort] = useState("hot");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const debounce = useRef(null);

  const loadCategory = () => {
    api.get("/forum/categories").then(({ categories }) => {
      setCategory((categories || []).find(c => c.slug === slug) || null);
    }).catch(() => {});
  };

  const loadThreads = () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ sort });
    if (q.trim()) params.set("q", q.trim());
    if (lang) params.set("lang", lang);
    api.get(`/forum/categories/${slug}/threads?${params.toString()}`)
      .then(({ threads: t }) => setThreads(t || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCategory(); }, [slug, user]);
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(loadThreads, q ? 250 : 0);
    return () => clearTimeout(debounce.current);
  }, [slug, sort, q, lang]);

  const toggleJoin = async () => {
    if (!user) { toast("Sign in to join this community", "error"); return; }
    if (!category) return;
    setJoinBusy(true);
    try {
      if (category.is_member) {
        await api.delete(`/forum/categories/${slug}/join`);
        setCategory(c => ({ ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) }));
      } else {
        await api.post(`/forum/categories/${slug}/join`);
        setCategory(c => ({ ...c, is_member: true, member_count: c.member_count + 1 }));
      }
    } catch (e) { toast(e.message, "error"); }
    finally { setJoinBusy(false); }
  };

  const startThread = () => {
    if (!user) { toast("Sign in to start a thread", "error"); return; }
    setShowNew(true);
  };

  if (!category && loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={36} /></div>;
  if (!category) return <Empty emoji="💬" title="Category not found" />;

  return (
    <div style={{ padding:16, paddingBottom:40 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:6 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ fontSize:20, fontWeight:900, margin:"0 0 4px" }}>{category.name}</h1>
          {category.description && <div style={{ color:"var(--text2)", fontSize:13, lineHeight:1.4 }}>{category.description}</div>}
        </div>
        {category.is_member !== undefined && (
          <GhostButton loading={joinBusy} onClick={toggleJoin} style={{ padding:"8px 16px", fontSize:12.5, flexShrink:0 }}>
            {category.is_member ? "Joined" : "Join"}
          </GhostButton>
        )}
      </div>
      <div style={{ color:"var(--text3)", fontSize:12.5, marginBottom:16 }}>
        {numFmt(category.member_count)} members · {numFmt(category.thread_count)} threads
      </div>

      {showNew ? (
        <NewThreadForm categoryId={category.id} onCreated={t => { setShowNew(false); if (t?.id) navigate(`/forum/thread/${t.id}`); }} onCancel={() => setShowNew(false)} />
      ) : (
        <PrimaryButton full onClick={startThread} style={{ marginBottom:16, padding:"11px 16px", fontSize:14 }}>
          Start a thread
        </PrimaryButton>
      )}

      <input
        value={q} onChange={e=>setQ(e.target.value)} placeholder="Search this community…"
        style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13.5, outline:"none", marginBottom:12 }}
      />
      <div style={{ display:"flex", gap:8, marginBottom:6 }}>
        {SORTS.map(([k,l]) => (
          <button key={k} onClick={()=>setSort(k)} style={{
            padding:"6px 13px", borderRadius:"var(--radius-pill)",
            border:`1px solid ${sort===k ? "var(--sky)" : "var(--border2)"}`,
            background: sort===k ? "var(--sky-dim)" : "transparent",
            color: sort===k ? "var(--sky)" : "var(--text3)",
            fontSize:12.5, fontWeight:700, cursor:"pointer",
          }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner size={32} /></div>
      ) : error ? (
        <ErrorState sub="Couldn't load threads." onRetry={loadThreads} />
      ) : threads.length === 0 ? (
        <Empty emoji="💬" title="No threads yet" sub="Be the first to start a conversation here." />
      ) : (
        threads.map(t => <ThreadRow key={t.id} thread={t} />)
      )}
    </div>
  );
}

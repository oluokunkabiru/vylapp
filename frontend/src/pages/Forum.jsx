import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, Spinner, Empty, ErrorState, GhostButton, numFmt } from "../components/ui/index.jsx";

function CategoryCard({ category, onToggleJoin, busy }) {
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:16, padding:16, marginBottom:12 }}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{
          width:44, height:44, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
          background: category.color ? `${category.color}22` : "var(--sky-dim)",
        }}>
          <Ic d={ic.comment} s={20} c={category.color || "var(--sky)"} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <Link to={`/forum/${category.slug}`} style={{ textDecoration:"none", color:"inherit" }}>
            <div style={{ fontWeight:800, fontSize:15.5, marginBottom:3 }}>{category.name}</div>
          </Link>
          {category.description && (
            <div style={{ color:"var(--text2)", fontSize:13, lineHeight:1.4, marginBottom:8 }}>{category.description}</div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:12.5, color:"var(--text3)" }}>
            <span>{numFmt(category.member_count)} members</span>
            <span>·</span>
            <span>{numFmt(category.thread_count)} threads</span>
          </div>
        </div>
        {category.is_member !== undefined && (
          <GhostButton
            loading={busy}
            onClick={() => onToggleJoin(category)}
            style={{ padding:"7px 14px", fontSize:12.5, flexShrink:0, ...(category.is_member ? {} : { background:"var(--violet-dim)", borderColor:"var(--violet-lt)", color:"var(--violet-lt)" }) }}
          >
            {category.is_member ? "Joined" : "Join"}
          </GhostButton>
        )}
      </div>
    </div>
  );
}

export default function Forum() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("discover"); // discover | mine
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    setError(false);
    api.get(`/forum/categories${tab === "mine" ? "?mine=true" : ""}`)
      .then(({ categories: c }) => setCategories(c || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (tab === "discover" || user) load(); }, [tab, user]);

  const toggleJoin = async category => {
    setBusyId(category.id);
    try {
      if (category.is_member) {
        await api.delete(`/forum/categories/${category.slug}/join`);
        setCategories(cs => cs.map(c => c.id === category.id ? { ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) } : c));
      } else {
        await api.post(`/forum/categories/${category.slug}/join`);
        setCategories(cs => cs.map(c => c.id === category.id ? { ...c, is_member: true, member_count: c.member_count + 1 } : c));
      }
    } catch (e) { toast(e.message, "error"); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"var(--grad)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic d={ic.comment} s={19} c="#fff" />
        </div>
        <h1 style={{ fontSize:22, fontWeight:900, margin:0 }}>Forum</h1>
      </div>

      <div style={{ display:"flex", borderBottom:"1px solid var(--border2)", marginBottom:18 }}>
        {[["discover","Discover"],["mine","My Communities"]].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1, padding:"11px 0", background:"none", border:"none", cursor:"pointer",
            fontWeight:800, fontSize:13.5,
            color: tab===k ? "var(--text)" : "var(--text3)",
            borderBottom: tab===k ? "2px solid var(--sky)" : "2px solid transparent",
          }}>{l}</button>
        ))}
      </div>

      {tab === "mine" && !user ? (
        <Empty emoji="💬" title="Sign in to see your communities" sub="Join a category to follow its threads here." />
      ) : loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner size={32} /></div>
      ) : error ? (
        <ErrorState sub="Couldn't load forum categories." onRetry={load} />
      ) : categories.length === 0 ? (
        tab === "mine"
          ? <Empty emoji="💬" title="No communities yet" sub="Join a category from Discover to see it here." />
          : <Empty emoji="💬" title="No categories yet" />
      ) : (
        categories.map(c => <CategoryCard key={c.id} category={c} onToggleJoin={toggleJoin} busy={busyId === c.id} />)
      )}
    </div>
  );
}

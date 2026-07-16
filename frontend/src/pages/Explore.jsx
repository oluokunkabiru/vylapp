import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api.js";
import { Ic, ic, CategoryPill, Spinner, Empty } from "../components/ui/index.jsx";
import { useToast } from "../context/ToastContext.jsx";

const CATS = [
  { key:"all",             label:"All",             color:"var(--text)" },
  { key:"TECH_VIBES",      label:"Tech Vibes",      color:"var(--sky)" },
  { key:"GLOBAL_CONNECT",  label:"Global Connect",  color:"var(--green)" },
  { key:"CREATIVE_LEARN",  label:"Creative Learn",  color:"var(--amber)" },
  { key:"HUMAN_POTENTIAL", label:"Human Potential", color:"var(--purple)" },
];
const CAT_GRADS = { TECH_VIBES:"linear-gradient(135deg,#38BDF8,#7C3AED)", GLOBAL_CONNECT:"linear-gradient(135deg,#10F5A0,#2DD4BF)", CREATIVE_LEARN:"linear-gradient(135deg,#FFB830,#FF6B6B)", HUMAN_POTENTIAL:"linear-gradient(135deg,#A78BFA,#7C3AED)", SPACES_INVITE:"linear-gradient(135deg,#FF6B6B,#FFB830)", GENERAL:"linear-gradient(135deg,#7C3AED,#2DD4BF)" };
const CAT_EMOJI = { TECH_VIBES:"⚡", GLOBAL_CONNECT:"🌍", CREATIVE_LEARN:"🎨", HUMAN_POTENTIAL:"🧠", SPACES_INVITE:"🎙️", GENERAL:"✦" };

export default function Explore() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [results, setResults] = useState({ users:[], vibes:[], hashtags:[] });
  const [trending, setTrending] = useState([]);
  const [gridVibes, setGridVibes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    api.get("/search/trending/topics").then(({ trending: t }) => setTrending(t || [])).catch(() => {});
    api.get("/vibes/feed?pageSize=36").then(({ vibes }) => setGridVibes(vibes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSearching(false); setResults({ users:[], vibes:[], hashtags:[] }); return; }
    setLoading(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const data = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data.results || { users:[], vibes:[], hashtags:[] });
        setSearching(true);
      } catch {}
      finally { setLoading(false); }
    }, 320);
  }, [query]);

  const display = cat === "all" ? gridVibes : gridVibes.filter(v => v.category === cat);

  return (
    <div>
      {/* Search bar */}
      <div style={{ padding:"12px 16px" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:10, background:"var(--bg3)",
          borderRadius:14, padding:"12px 14px", border:"1px solid var(--border2)",
        }}>
          <Ic d={ic.search} s={18} c="var(--text2)" />
          <input
            value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Search people, vibes, topics"
            style={{ flex:1, background:"none", border:"none", color:"var(--text)", fontSize:15, outline:"none" }}
          />
          {loading && <span style={{ width:16, height:16, borderRadius:"50%", border:"2px solid var(--border2)", borderTopColor:"var(--violet-lt)", animation:"spin 0.7s linear infinite", display:"inline-block" }} />}
          {query && (
            <button onClick={()=>setQuery("")} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:18, lineHeight:1 }}>✕</button>
          )}
        </div>
      </div>

      {/* Category filter chips */}
      {!searching && (
        <div style={{ display:"flex", gap:8, padding:"0 16px 14px", overflowX:"auto" }}>
          {CATS.map(c => (
            <button key={c.key} onClick={()=>setCat(c.key)} style={{
              padding:"8px 16px", borderRadius:"var(--radius-pill)", whiteSpace:"nowrap",
              fontWeight:700, fontSize:13.5, flexShrink:0,
              border:`1.5px solid ${cat===c.key ? c.color : "var(--border)"}`,
              background: cat===c.key ? `${c.color}18` : "transparent",
              color: cat===c.key ? c.color : "var(--text2)",
            }}>{c.label}</button>
          ))}
        </div>
      )}

      {/* Search results */}
      {searching && (
        <div style={{ padding:"0 16px" }}>
          {results.users.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", marginBottom:10, letterSpacing:0.4 }}>PEOPLE</div>
              {results.users.map(u => (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"10px 12px", borderRadius:14, background:"var(--bg3)", border:"1px solid var(--border2)" }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:`${u.avatar_color||"#7C3AED"}1e`, border:`1.5px solid ${u.avatar_color||"#7C3AED"}40`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:u.avatar_color||"#7C3AED", fontSize:14, fontFamily:"var(--mono)", flexShrink:0 }}>
                    {u.avatar_initials || u.display_name?.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:14 }}>{u.display_name}</div>
                    <div style={{ color:"var(--text2)", fontSize:12.5 }}>@{u.handle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.hashtags.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", marginBottom:10, letterSpacing:0.4 }}>TOPICS</div>
              {results.hashtags.map(h => (
                <div key={h.tag} style={{ display:"flex", justifyContent:"space-between", padding:"10px 12px", borderRadius:14, background:"var(--bg3)", border:"1px solid var(--border2)", marginBottom:8 }}>
                  <span style={{ fontWeight:700, color:"var(--sky)" }}>#{h.tag}</span>
                  <span style={{ color:"var(--text3)", fontSize:12.5 }}>{h.vibes_count} vibes</span>
                </div>
              ))}
            </div>
          )}
          {results.users.length === 0 && results.hashtags.length === 0 && results.vibes.length === 0 && (
            <Empty emoji="🔍" title="No results" sub={`Nothing found for "${query}" — try different words.`} />
          )}
        </div>
      )}

      {/* Trending tags (when not searching) */}
      {!searching && trending.length > 0 && (
        <div style={{ padding:"0 16px 14px" }}>
          <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", marginBottom:10, letterSpacing:0.4 }}>TRENDING NOW</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {trending.slice(0,8).map(t => (
              <button key={t.tag} onClick={()=>setQuery(t.tag)} style={{
                padding:"7px 14px", borderRadius:"var(--radius-pill)", background:"var(--bg3)",
                border:"1px solid var(--border2)", color:"var(--sky)", fontWeight:700, fontSize:13,
                cursor:"pointer",
              }}>
                {t.tag} <span style={{ color:"var(--text3)", fontWeight:400 }}>{t.heat}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Photo grid */}
      {!searching && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2, padding:"0 2px" }}>
          {display.map((v, i) => (
            <div key={v.id || i} style={{
              aspectRatio:"1/1", background:CAT_GRADS[v.category]||CAT_GRADS.GENERAL,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:30, cursor:"pointer",
            }} onClick={()=>toast("Full vibe view coming soon")}>
              {CAT_EMOJI[v.category]||"✦"}
              {i % 5 === 0 && (
                <div style={{ position:"absolute", top:6, right:6 }}>
                  <Ic d={ic.spaces} s={14} c="#fff" />
                </div>
              )}
            </div>
          ))}
          {display.length === 0 && !loading && (
            <div style={{ gridColumn:"1/-1" }}>
              <Empty emoji="🌐" title="No vibes here yet" sub="Check back soon or switch to All." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

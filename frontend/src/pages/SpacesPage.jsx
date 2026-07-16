import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Avatar, Ic, ic, PrimaryButton, GhostButton, Spinner, Empty } from "../components/ui/index.jsx";
import { flagEmoji, countryName } from "../data/countries.js";

const CAT_COLORS = { TECH_VIBES:"var(--sky)", GLOBAL_CONNECT:"var(--green)", CREATIVE_LEARN:"var(--amber)", HUMAN_POTENTIAL:"var(--purple)", SPACES_INVITE:"var(--coral)", GENERAL:"var(--violet-lt)" };

function SpaceCard({ space, onAction }) {
  const color = CAT_COLORS[space.category] || "var(--violet-lt)";
  const isLive = space.status === "live";
  const { user } = useAuth();

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14, padding:16, borderRadius:18,
      background:"var(--bg3)", border:`1px solid ${isLive ? color + "40" : "var(--border2)"}`,
      marginBottom:12, position:"relative", overflow:"hidden",
    }}>
      {isLive && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />}
      <div style={{
        width:56, height:56, borderRadius:16, background:`${color}14`,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        border:`1.5px solid ${color}30`,
      }}>
        <Ic d={ic.spaces} s={26} c={color} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:800, fontSize:15, lineHeight:1.3, marginBottom:4 }}>{space.title}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {isLive ? (
            <span style={{ display:"flex", alignItems:"center", gap:5, color:"var(--coral)", fontSize:12, fontWeight:800, fontFamily:"var(--mono)" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--coral)", animation:"livePulse 1.4s infinite", display:"inline-block" }} /> LIVE NOW
            </span>
          ) : (
            <span style={{ color:"var(--text2)", fontSize:12.5 }}>
              {space.scheduledFor ? new Date(space.scheduledFor).toLocaleString(undefined, {weekday:"short",hour:"2-digit",minute:"2-digit"}) : "Scheduled"}
            </span>
          )}
          {isLive && <span style={{ color:"var(--text3)", fontSize:12.5 }}>· {space.listenersCount?.toLocaleString() || 0} listening</span>}
        </div>
        {space.host && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
            <Avatar user={space.host} size={20} />
            <span style={{ color:"var(--text2)", fontSize:12 }}>@{space.host.handle}</span>
          </div>
        )}
      </div>
      <button onClick={() => onAction(space)} style={{
        padding:"10px 18px", borderRadius:"var(--radius-pill)",
        border: isLive ? "none" : "1.5px solid var(--border)",
        background: isLive ? "var(--grad)" : "transparent",
        color: isLive ? "#fff" : "var(--text)",
        fontWeight:800, fontSize:13.5, cursor:"pointer", flexShrink:0,
        boxShadow: isLive ? "var(--shadow-violet)" : "none",
      }}>
        {isLive ? "Join" : "Remind me"}
      </button>
    </div>
  );
}

// ── Diaspora discovery — visually distinct from the space cards below on
// purpose: warm amber/coral accent instead of the violet used for Spaces,
// flag badges, horizontal scroll. This is Connect's own visual language,
// not a reskin of the audio-room pattern. ──────────────────────────────────
function DiasporaSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(new Set());
  const country = user?.currentCountry || user?.heritageCountries?.[0];

  useEffect(() => {
    if (!country) { setLoading(false); return; }
    api.get(`/users/discover?country=${country}`)
      .then(({ users }) => setPeople(users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [country]);

  const connect = async u => {
    try {
      await api.post(`/users/${u.id}/connect`);
      setFollowed(s => new Set([...s, u.id]));
      toast(`Connected with @${u.handle} ✓`);
    } catch (e) { toast(e.message, "error"); }
  };

  if (!country || loading || people.length === 0) return null;

  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <span style={{ fontSize:18 }}>{flagEmoji(country)}</span>
        <span style={{ fontWeight:800, fontSize:14 }}>People from {countryName(country)}</span>
      </div>
      <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:6 }}>
        {people.map(u => (
          <div key={u.id} style={{
            flexShrink:0, width:104, display:"flex", flexDirection:"column", alignItems:"center",
            background:"var(--bg3)", border:"1px solid var(--amber)", borderColor:"rgba(255,184,48,0.25)",
            borderRadius:16, padding:"14px 10px",
          }}>
            <div style={{ position:"relative", marginBottom:8 }}>
              <Avatar user={u} size={52} />
              <span style={{
                position:"absolute", bottom:-2, right:-4, fontSize:15,
                background:"var(--bg3)", borderRadius:"50%", padding:1,
              }}>{flagEmoji(u.currentCountry || country)}</span>
            </div>
            <div style={{ fontWeight:700, fontSize:12.5, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%" }}>
              {u.displayName}
            </div>
            <div style={{ color:"var(--text3)", fontSize:11, marginBottom:8 }}>@{u.handle}</div>
            {followed.has(u.id) ? (
              <span style={{ color:"var(--green)", fontSize:11, fontWeight:700 }}>Connected ✓</span>
            ) : (
              <button onClick={() => connect(u)} style={{
                background:"none", border:"1px solid var(--amber)", color:"var(--amber)",
                borderRadius:"var(--radius-pill)", padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer",
              }}>Connect</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SpacesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title:"", category:"TECH_VIBES" });

  const load = () => {
    setLoading(true);
    api.get("/spaces").then(({ spaces: s }) => setSpaces(s || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAction = async (space) => {
    if (space.status === "live") {
      try {
        const data = await api.post(`/spaces/${space.id}/join`);
        toast(`Joined as ${data.role} ✓`);
      } catch (e) { toast(e.message, "error"); }
    } else {
      try {
        await api.post(`/spaces/${space.id}/remind`);
        toast("Reminder set ✓");
      } catch (e) { toast(e.message, "error"); }
    }
  };

  const createSpace = async e => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await api.post("/spaces", { title: form.title.trim(), category: form.category });
      toast("Space created ✓");
      setCreating(false);
      setForm({ title:"", category:"TECH_VIBES" });
      load();
    } catch (e) { toast(e.message, "error"); }
  };

  const live = spaces.filter(s => s.status === "live");
  const upcoming = spaces.filter(s => s.status !== "live");

  return (
    <div style={{ padding:"16px" }}>
      <p style={{ color:"var(--text2)", fontSize:14, marginBottom:16, lineHeight:1.5 }}>
        Live voice rooms and scheduled conversations. Tap to listen in.
      </p>

      {user && <DiasporaSection />}

      {user && (
        <div style={{ marginBottom:20 }}>
          {!creating ? (
            <button onClick={()=>setCreating(true)} style={{
              width:"100%", padding:"14px 20px", borderRadius:18, border:"1.5px dashed var(--border)",
              background:"transparent", color:"var(--violet-lt)", fontWeight:700, fontSize:15, cursor:"pointer",
              display:"flex", alignItems:"center", gap:8, justifyContent:"center",
            }}>
              <Ic d={ic.spaces} s={20} c="var(--violet-lt)" /> Host a Space
            </button>
          ) : (
            <form onSubmit={createSpace} style={{ background:"var(--bg3)", borderRadius:18, padding:16, border:"1px solid var(--border)", marginBottom:12 }}>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Space title…" required style={{ width:"100%", background:"none", border:"none", borderBottom:"1px solid var(--border2)", color:"var(--text)", fontSize:16, fontWeight:600, padding:"8px 0", outline:"none", marginBottom:12 }} />
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{ width:"100%", background:"var(--bg2)", border:"1px solid var(--border2)", color:"var(--text)", borderRadius:10, padding:"10px 12px", fontSize:14, marginBottom:12 }}>
                {["TECH_VIBES","GLOBAL_CONNECT","CREATIVE_LEARN","HUMAN_POTENTIAL","SPACES_INVITE"].map(c=>(
                  <option key={c} value={c} style={{background:"var(--bg2)"}}>{c.replace(/_/g," ")}</option>
                ))}
              </select>
              <div style={{ display:"flex", gap:10 }}>
                <PrimaryButton sx={{ flex:1 }}>Create Space</PrimaryButton>
                <GhostButton onClick={()=>setCreating(false)} style={{ flex:1 }}>Cancel</GhostButton>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner size={32} /></div> : (
        <>
          {live.length > 0 && (
            <>
              <div style={{ fontWeight:800, fontSize:13, color:"var(--coral)", letterSpacing:0.5, marginBottom:10 }}>LIVE NOW</div>
              {live.map(s => <SpaceCard key={s.id} space={s} onAction={handleAction} />)}
            </>
          )}
          {upcoming.length > 0 && (
            <>
              <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", letterSpacing:0.5, marginBottom:10, marginTop: live.length?16:0 }}>UPCOMING</div>
              {upcoming.map(s => <SpaceCard key={s.id} space={s} onAction={handleAction} />)}
            </>
          )}
          {spaces.length === 0 && <Empty emoji="🎙️" title="No Spaces right now" sub="Check back soon, or host one yourself!" />}
        </>
      )}
    </div>
  );
}

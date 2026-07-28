import { useLocation, useNavigate } from "react-router-dom";
import { VylappWordmark, TapIcon, ic, Ic } from "../ui/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { LANGUAGES, COMMON_LANGUAGE_CODES } from "../../lib/languages.js";

const TOPBAR_LANGUAGES = COMMON_LANGUAGE_CODES.map(code => LANGUAGES.find(l => l.code === code));

const TITLES = {
  "/explore":       "Search",
  "/spaces":        "Spaces",
  "/learn":         "Learn",
  "/profile":       "Profile",
  "/notifications": "Activity",
  "/messages":      "Messages",
  "/autopilot":     "Autopilot",
  "/creator":       "Creator Earnings",
  "/raven":         "Raven",
};

export default function TopBar({ notifCount, msgCount, lang, setLang }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHome = pathname === "/";

  if (!isHome) return (
    <div style={{
      display:"flex", alignItems:"center", gap:8, padding:"12px 16px",
      borderBottom:"1px solid var(--border2)", position:"sticky", top:0,
      background:"var(--bg)", zIndex:20, minHeight:56,
    }}>
      <button onClick={()=>navigate(-1)} style={{ background:"none", border:"none", display:"flex", alignItems:"center", justifyContent:"center", width:44, height:44, borderRadius:"50%", flexShrink:0 }}>
        <Ic d={ic.back} s={22} c="var(--text)" />
      </button>
      <div style={{ fontWeight:800, fontSize:18, flex:1 }}>{TITLES[pathname] || "Vylapp"}</div>
    </div>
  );

  return (
    <div style={{
      display:"flex", alignItems:"center", padding:"14px 16px", position:"sticky",
      top:0, background:"var(--bg)", zIndex:20, borderBottom:"1px solid var(--border2)",
    }}>
      <VylappWordmark />
      <div style={{ flex:1 }} />
      <select value={lang} onChange={e=>setLang(e.target.value)} style={{
        background:"var(--violet-dim)", border:"1px solid var(--border)", color:"var(--violet-lt)",
        borderRadius:"var(--radius-pill)", padding:"5px 10px", fontSize:12, fontWeight:700, cursor:"pointer",
        marginRight:4,
      }}>
        {TOPBAR_LANGUAGES.map(l=>(
          <option key={l.code} value={l.code} style={{background:"var(--bg2)"}}>{l.code.toUpperCase()}</option>
        ))}
      </select>
      {user && <>
        <TapIcon d={ic.bell} onClick={()=>navigate("/notifications")} label="Activity" badge={notifCount} />
        <TapIcon d={ic.send} onClick={()=>navigate("/messages")} label="Messages" badge={msgCount} />
      </>}
    </div>
  );
}

import { Link, useLocation } from "react-router-dom";
import { Ic, ic, Avatar, VylappWordmark } from "../ui/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const NAV = [
  { to:"/dashboard",     icon:ic.chart,   label:"Dashboard" },
  { to:"/",              icon:ic.home,    label:"Feed"      },
  { to:"/explore",       icon:ic.search,  label:"Search"    },
  { to:"/spaces",        icon:ic.spaces,  label:"Spaces"    },
  { to:"/learn",         icon:ic.book,    label:"Learn"     },
  { to:"/notifications", icon:ic.bell,    label:"Activity"  },
  { to:"/messages",      icon:ic.send,    label:"Messages"  },
  { to:"/autopilot",     icon:ic.zap,     label:"Autopilot" },
  { to:"/creator",       icon:ic.dollar,  label:"Earnings"  },
  { to:"/raven",         icon:ic.trophy,  label:"Raven"     },
  { to:"/profile",       icon:ic.user,    label:"Profile"   },
];

export default function Sidebar({ onCreateClick, notifCount, msgCount, lang, setLang }) {
  const { pathname } = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const nav = isAdmin ? [...NAV, { to:"/admin", icon:ic.lock, label:"Admin" }] : NAV;

  return (
    <div style={{
      width:260, padding:"20px 12px", display:"flex", flexDirection:"column",
      borderRight:"1px solid var(--border2)", flexShrink:0, position:"sticky", top:0, height:"100vh",
    }}>
      <div style={{ padding:"0 12px 22px" }}><VylappWordmark size={24} /></div>

      {nav.map(item => {
        const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/"));
        const badge = (item.to==="/notifications" && notifCount) || (item.to==="/messages" && msgCount);
        return (
          <Link key={item.to} to={item.to} style={{
            display:"flex", alignItems:"center", gap:14, padding:"10px 14px",
            borderRadius:12, background:active?"var(--violet-dim)":"transparent",
            border:`1px solid ${active ? "var(--violet-border)" : "transparent"}`,
            textDecoration:"none", marginBottom:2, position:"relative",
          }}>
            <div style={{ position:"relative" }}>
              <Ic d={item.icon} s={21} c={active?"var(--text)":"var(--text2)"} f={active?"var(--text)":"none"} />
              {badge > 0 && (
                <span style={{
                  position:"absolute", top:-6, right:-8, minWidth:16, height:16, borderRadius:8,
                  background:"var(--coral)", color:"#fff", fontSize:9.5, fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px",
                }}>{badge}</span>
              )}
            </div>
            <span style={{ fontWeight:active?700:600, fontSize:14.5, color:active?"var(--text)":"var(--text2)" }}>{item.label}</span>
          </Link>
        );
      })}

      <button onClick={onCreateClick} style={{
        display:"flex", alignItems:"center", gap:14, padding:"10px 14px",
        borderRadius:12, background:"none", border:"none", marginTop:4, textAlign:"left",
      }}>
        <Ic d={ic.plus} s={21} c="var(--text2)" />
        <span style={{ fontWeight:600, fontSize:14.5, color:"var(--text2)" }}>Share</span>
      </button>

      <div style={{ flex:1 }} />

      {/* Lang picker */}
      <div style={{ marginBottom:12 }}>
        <select value={lang} onChange={e=>setLang(e.target.value)} style={{
          width:"100%", padding:"9px 14px", borderRadius:10, border:"1px solid var(--border)",
          background:"var(--violet-dim)", color:"var(--violet-lt)", fontSize:12.5, fontWeight:700, cursor:"pointer",
        }}>
          {[["en","English"],["es","Spanish"],["sw","Swahili"],["fr","French"],["yo","Yoruba"],["ha","Hausa"],["ar","Arabic"],["hi","Hindi"],["zh","Chinese"]].map(([k,v])=>(
            <option key={k} value={k} style={{background:"var(--bg2)"}}>{v}</option>
          ))}
        </select>
      </div>

      {/* User footer */}
      {user && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, border:"1px solid var(--border2)" }}>
          <Link to="/profile"><Avatar user={user} size={34} /></Link>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.displayName}</div>
            <div style={{ color:"var(--text2)", fontSize:11.5, fontFamily:"var(--mono)" }}>@{user.handle}</div>
          </div>
          <button onClick={logout} title="Log out" style={{ background:"none", border:"none", color:"var(--text3)", padding:6 }}>
            <Ic d={ic.logout} s={17} c="var(--text3)" />
          </button>
        </div>
      )}
    </div>
  );
}

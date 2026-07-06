import { Link, useLocation } from "react-router-dom";
import { Ic, ic, Avatar, VylappWordmark } from "../ui/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const NAV = [
  { to:"/",              icon:ic.home,    label:"Home"      },
  { to:"/explore",       icon:ic.search,  label:"Search"    },
  { to:"/spaces",        icon:ic.spaces,  label:"Spaces"    },
  { to:"/notifications", icon:ic.bell,    label:"Activity"  },
  { to:"/messages",      icon:ic.send,    label:"Messages"  },
  { to:"/autopilot",     icon:ic.zap,     label:"Autopilot" },
  { to:"/creator",       icon:ic.dollar,  label:"Earnings"  },
  { to:"/raven",         icon:ic.trophy,  label:"Raven"     },
  { to:"/profile",       icon:ic.user,    label:"Profile"   },
];

export default function Sidebar({ onCreateClick, notifCount, msgCount, lang, setLang }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <div style={{
      width:260, padding:"20px 12px", display:"flex", flexDirection:"column",
      borderRight:"1px solid var(--border2)", flexShrink:0, position:"sticky", top:0, height:"100vh",
    }}>
      <div style={{ padding:"0 12px 22px" }}><VylappWordmark size={24} /></div>

      {NAV.map(item => {
        const active = pathname === item.to;
        const badge = (item.to==="/notifications" && notifCount) || (item.to==="/messages" && msgCount);
        return (
          <Link key={item.to} to={item.to} style={{
            display:"flex", alignItems:"center", gap:16, padding:"13px 14px",
            borderRadius:14, background:active?"var(--violet-dim)":"transparent",
            textDecoration:"none", marginBottom:2, position:"relative",
          }}>
            <div style={{ position:"relative" }}>
              <Ic d={item.icon} s={24} c={active?"var(--text)":"var(--text2)"} f={active?"var(--text)":"none"} />
              {badge > 0 && (
                <span style={{
                  position:"absolute", top:-6, right:-8, minWidth:16, height:16, borderRadius:8,
                  background:"var(--coral)", color:"#fff", fontSize:9.5, fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px",
                }}>{badge}</span>
              )}
            </div>
            <span style={{ fontWeight:active?800:600, fontSize:16, color:active?"var(--text)":"var(--text2)" }}>{item.label}</span>
          </Link>
        );
      })}

      <button onClick={onCreateClick} style={{
        display:"flex", alignItems:"center", gap:16, padding:"13px 14px",
        borderRadius:14, background:"none", border:"none", marginTop:4, textAlign:"left",
      }}>
        <Ic d={ic.plus} s={24} c="var(--text2)" />
        <span style={{ fontWeight:600, fontSize:16, color:"var(--text2)" }}>Share</span>
      </button>

      <div style={{ flex:1 }} />

      {/* Lang picker */}
      <div style={{ marginBottom:12 }}>
        <select value={lang} onChange={e=>setLang(e.target.value)} style={{
          width:"100%", padding:"10px 14px", borderRadius:12, border:"1px solid var(--border)",
          background:"var(--violet-dim)", color:"var(--violet-lt)", fontSize:13, fontWeight:700, cursor:"pointer",
        }}>
          {[["en","English"],["es","Spanish"],["sw","Swahili"],["fr","French"],["yo","Yoruba"],["ha","Hausa"],["ar","Arabic"],["hi","Hindi"],["zh","Chinese"]].map(([k,v])=>(
            <option key={k} value={k} style={{background:"var(--bg2)"}}>{v}</option>
          ))}
        </select>
      </div>

      {/* User footer */}
      {user && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:14 }}>
          <Link to="/profile"><Avatar user={user} size={36} /></Link>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.displayName}</div>
            <div style={{ color:"var(--text2)", fontSize:12, fontFamily:"var(--mono)" }}>@{user.handle}</div>
          </div>
          <button onClick={logout} title="Log out" style={{ background:"none", border:"none", color:"var(--text3)", padding:6 }}>
            <Ic d={ic.logout} s={18} c="var(--text3)" />
          </button>
        </div>
      )}
    </div>
  );
}

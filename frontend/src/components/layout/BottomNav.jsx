import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Ic, ic } from "../ui/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const PRIMARY_NAV = [
  { to:"/dashboard", icon:ic.chart,  label:"Dash" },
  { to:"/",          icon:ic.home,   label:"Feed" },
  { to:"__create",                   label:"Share" },
  { to:"/spaces",    icon:ic.spaces, label:"Spaces" },
  { to:"__more",                     label:"More" },
];

const MORE_ITEMS = [
  { to:"/explore",       icon:ic.search, label:"Search",    color:"var(--sky)",        auth:false },
  { to:"/learn",         icon:ic.book,   label:"Learn",     color:"var(--amber)",      auth:false },
  { to:"/autopilot",     icon:ic.zap,    label:"Autopilot", color:"var(--violet-lt)",  auth:true  },
  { to:"/creator",       icon:ic.dollar, label:"Earnings",  color:"var(--green)",      auth:true  },
  { to:"/notifications", icon:ic.bell,   label:"Activity",  color:"var(--purple)",     auth:true  },
  { to:"/messages",      icon:ic.send,   label:"Messages",  color:"var(--teal)",       auth:true  },
  { to:"/profile",       icon:ic.user,   label:"Profile",   color:"var(--coral)",      auth:true  },
];

export default function BottomNav({ onCreateClick, notifCount }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  // Check if we're on one of the "more" routes so the More button lights up
  const moreRoutes = MORE_ITEMS.map(m => m.to);
  const onMoreRoute = moreRoutes.some(r => pathname.startsWith(r));

  return (
    <>
      {/* More drawer backdrop */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(8,7,15,0.6)",
            zIndex: 29, backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* More drawer panel */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: moreOpen ? 70 : -260,
        background: "var(--bg2)", borderTop: "1px solid var(--border2)",
        borderRadius: "20px 20px 0 0", zIndex: 30, padding: "16px 12px 8px",
        transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border2)", margin: "0 auto 16px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {MORE_ITEMS.map(item => {
            const isActive = pathname === item.to;
            if (item.auth && !user) return null;
            return (
              <button key={item.to} onClick={() => { navigate(item.to); setMoreOpen(false); }} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                padding: "13px 8px", borderRadius: 14, background: isActive ? `${item.color}12` : "transparent",
                border: `1px solid ${isActive ? item.color + "30" : "transparent"}`,
                cursor: "pointer",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: `${item.color}14`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Ic d={item.icon} s={22} c={item.color} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? item.color : "var(--text2)" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky bottom bar */}
      <nav style={{
        position: "sticky", bottom: 0, left: 0, right: 0, display: "flex",
        background: "var(--bg)", borderTop: "1px solid var(--border2)",
        paddingBottom: "env(safe-area-inset-bottom,0px)", zIndex: 20,
      }}>
        {PRIMARY_NAV.map(item => {
          if (item.to === "__create") return (
            <button key="create" onClick={onCreateClick} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "10px 0 8px", background: "none", border: "none",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: "var(--grad)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--shadow-violet)",
              }}>
                <Ic d={ic.plus} s={18} c="#fff" sw={2.5} />
              </div>
              <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 700 }}>{item.label}</span>
            </button>
          );

          if (item.to === "__more") {
            const active = moreOpen || onMoreRoute;
            return (
              <button key="more" onClick={() => setMoreOpen(v => !v)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer",
                position: "relative",
              }}>
                {/* 3-dot icon */}
                <div style={{
                  width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: active ? "var(--text)" : "var(--text2)",
                      transition: "all 0.2s",
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: active ? "var(--text)" : "var(--text2)", fontWeight: active ? 800 : 600 }}>
                  More
                </span>
                {notifCount > 0 && (
                  <span style={{
                    position: "absolute", top: 6, right: 8, minWidth: 16, height: 16, borderRadius: 8,
                    background: "var(--coral)", color: "#fff", fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                    border: "2px solid var(--bg)",
                  }}>{notifCount > 99 ? "99+" : notifCount}</span>
                )}
              </button>
            );
          }

          const active = pathname === item.to;
          return (
            <Link key={item.to} to={item.to} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "10px 0 8px", textDecoration: "none",
            }}>
              <Ic d={item.icon} s={24} c={active ? "var(--text)" : "var(--text2)"} f={active ? "var(--text)" : "none"} />
              <span style={{ fontSize: 11, color: active ? "var(--text)" : "var(--text2)", fontWeight: active ? 800 : 600 }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

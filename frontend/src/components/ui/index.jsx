// ════════════════════════════════════════════════════════════════════════════
//  SHARED UI ATOMS — every primitive used across the app
// ════════════════════════════════════════════════════════════════════════════
import { useState } from "react";

// ── SVG icon (single path) ────────────────────────────────────────────────
export function Ic({ d, s = 22, c = "currentColor", f = "none", sw = 2 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={f} stroke={c}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display:"block" }}>
      <path d={d} />
    </svg>
  );
}

// Named icon paths
export const ic = {
  home:     "M3 9.5l9-7 9 7V20a1 1 0 01-1 1h-5v-7H10v7H4a1 1 0 01-1-1V9.5z",
  search:   "M21 21l-5.2-5.2m1.7-5.3a7 7 0 11-14 0 7 7 0 0114 0z",
  plus:     "M12 5v14M5 12h14",
  spaces:   "M4 17v-5a8 8 0 0116 0v5M21 18a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 18a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z",
  user:     "M20 21v-1a5 5 0 00-5-5H9a5 5 0 00-5 5v1M12 11a4.5 4.5 0 100-9 4.5 4.5 0 000 9z",
  heart:    "M20.8 4.9a5.5 5.5 0 00-7.8 0L12 5.9l-1-1a5.5 5.5 0 00-7.8 7.8L4 13.4 12 21l8-7.6.7-.7a5.5 5.5 0 000-7.8z",
  comment:  "M21 11.5a8.4 8.4 0 01-1 4 8.5 8.5 0 01-7.6 4.6 8.4 8.4 0 01-4-1L3 20l1-5.4a8.4 8.4 0 01-1-4 8.5 8.5 0 014.6-7.6 8.4 8.4 0 014-1h.5a8.48 8.48 0 018 8v.5z",
  send:     "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
  dotsH:    "M5 12h.01M12 12h.01M19 12h.01",
  close:    "M18 6L6 18M6 6l12 12",
  back:     "M19 12H5M12 19l-7-7 7-7",
  bell:     "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  mic:      "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v3",
  globe:    "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  check:    "M20 6L9 17l-5-5",
  image:    "M21 4H3a1 1 0 00-1 1v14a1 1 0 001 1h18a1 1 0 001-1V5a1 1 0 00-1-1zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5-4 4-3-3-6 6",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  repeat:   "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  logout:   "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  autopilot:"M12 2a10 10 0 100 20A10 10 0 0012 2zm0 4v4l3 3M9 9l3 3 3-3M9 15l3-3 3 3",
  zap:      "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  coins:    "M12 2a5 5 0 100 10A5 5 0 0012 2zM2 17s0-5 10-5 10 5 10 5M17 13c2.8.7 5 2.3 5 4M7 13c-2.8.7-5 2.3-5 4",
  trophy:   "M8 21h8M12 17v4M17 7h2a2 2 0 012 2v1a4 4 0 01-4 4M7 7H5a2 2 0 00-2 2v1a4 4 0 004 4M7 3h10l-1 9a5 5 0 01-8 0L7 3z",
  sparkle:  "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 18l.75 2.25L8 21l-2.25.75L5 24l-.75-2.25L2 21l2.25-.75L5 18z",
  chart:    "M18 20V10M12 20V4M6 20v-6",
  dollar:   "M12 1v2M12 21v2M12 6a3 3 0 00-3 3c0 4.5 6 4.5 6 9a3 3 0 01-6 0M9 3h6M9 21h6",
  feather:  "M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5l6.74-6.76zM16 8L2 22",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  raven:    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  book:     "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  lock:     "M5 11h14v10H5V11zM8 11V7a4 4 0 018 0v4",
  play:     "M6 3l14 9-14 9V3z",
};

// ── Avatar ────────────────────────────────────────────────────────────────
export function Avatar({ user, size = 40, ring = false, story = false }) {
  const color = user?.avatarColor || "#7C3AED";
  const initials = user?.avatarInitials || user?.displayName?.slice(0, 2).toUpperCase() || "VY";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      padding: story ? 2.5 : 0,
      background: story ? "var(--grad-story)" : "transparent",
    }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        background: `${color}1e`,
        border: story ? `2px solid var(--bg)` : ring ? `2px solid ${color}` : `1.5px solid ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33, fontWeight: 800, color,
        fontFamily: "var(--mono)", overflow: "hidden",
      }}>
        {user?.avatarUrl
          ? <img src={user.avatarUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : initials}
      </div>
    </div>
  );
}

// ── Verified badge ────────────────────────────────────────────────────────
export function VerifiedBadge({ size = 13 }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:size, height:size, borderRadius:"50%", background:"var(--sky)", flexShrink:0,
    }}>
      <Ic d={ic.check} s={size*0.65} c="#08070F" sw={3} />
    </span>
  );
}

// ── Category pill ─────────────────────────────────────────────────────────
const CAT_COLORS = {
  TECH_VIBES: "var(--sky)", GLOBAL_CONNECT: "var(--green)",
  CREATIVE_LEARN: "var(--amber)", HUMAN_POTENTIAL: "var(--purple)",
  SPACES_INVITE: "var(--coral)", GENERAL: "var(--text2)",
};
export function CategoryPill({ category }) {
  const color = CAT_COLORS[category] || "var(--text2)";
  const label = category?.replace(/_/g," ") || "GENERAL";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", padding:"3px 10px",
      borderRadius:6, fontSize:11, fontWeight:800, letterSpacing:0.5,
      fontFamily:"var(--mono)", background:`${color}14`, color,
      border:`1px solid ${color}28`,
    }}>{label}</span>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, full, loading, disabled, style: sx }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      padding:"13px 22px", borderRadius:"var(--radius-pill)",
      background: disabled ? "var(--bg4)" : "var(--grad)",
      color:"#fff", fontWeight:800, fontSize:15, letterSpacing:0.2,
      width: full ? "100%" : "auto",
      boxShadow: disabled ? "none" : "var(--shadow-violet)",
      opacity: disabled ? 0.5 : 1,
      transition:"all 0.18s", ...sx,
    }}>
      {loading ? <span style={{display:"inline-block",width:16,height:16,borderRadius:"50%",border:"2px solid #fff3",borderTopColor:"#fff",animation:"spin 0.7s linear infinite"}} /> : children}
    </button>
  );
}

export function GhostButton({ children, onClick, style: sx }) {
  return (
    <button onClick={onClick} style={{
      padding:"10px 18px", borderRadius:"var(--radius-pill)",
      border:"1.5px solid var(--border)", background:"transparent",
      color:"var(--text)", fontWeight:700, fontSize:14,
      transition:"all 0.15s", ...sx,
    }}>{children}</button>
  );
}

// ── 44px tap-target icon button ───────────────────────────────────────────
export function TapIcon({ d, c = "var(--text)", f, size = 24, onClick, label, badge }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width:44, height:44, borderRadius:"50%", background:"none",
      display:"flex", alignItems:"center", justifyContent:"center",
      position:"relative", flexShrink:0,
    }}>
      <Ic d={d} s={size} c={c} f={f} />
      {badge > 0 && (
        <span style={{
          position:"absolute", top:2, right:2, minWidth:16, height:16, borderRadius:8,
          background:"var(--coral)", color:"#fff", fontSize:10, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px",
          border:"2px solid var(--bg)",
        }}>{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}

// ── Screen header (every sub-page) ────────────────────────────────────────
export function ScreenHeader({ title, onBack, right }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8, padding:"12px 16px",
      borderBottom:"1px solid var(--border2)", position:"sticky", top:0,
      background:"var(--bg)", zIndex:10, minHeight:56,
    }}>
      {onBack && <TapIcon d={ic.back} size={22} onClick={onBack} label="Go back" />}
      <div style={{ fontWeight:800, fontSize:18, color:"var(--text)", flex:1 }}>{title}</div>
      {right}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 28 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      border:"2.5px solid var(--border2)", borderTopColor:"var(--violet-lt)",
      animation:"spin 0.7s linear infinite", flexShrink:0,
    }} />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
export function Empty({ emoji = "✦", title, sub }) {
  return (
    <div style={{ padding:"48px 24px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
      <span style={{ fontSize:42 }}>{emoji}</span>
      {title && <div style={{ fontWeight:800, fontSize:16, color:"var(--text)" }}>{title}</div>}
      {sub && <div style={{ fontSize:14, color:"var(--text2)", maxWidth:260 }}>{sub}</div>}
    </div>
  );
}

// ── Number formatter ──────────────────────────────────────────────────────
export function numFmt(n) {
  if (!n) return "0";
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

// ── Logo wordmark ─────────────────────────────────────────────────────────
export function VylappWordmark({ size = 22 }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
      <img src="/assets/logo.png" alt="Vylapp" style={{ height: size + 4, width: size + 4, borderRadius: 6, objectFit:"contain" }} />
      <span style={{
        fontFamily:"var(--font)", fontWeight:900, fontSize:size, letterSpacing:-0.5,
        background:"var(--grad)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}>VYLAPP</span>
    </span>
  );
}

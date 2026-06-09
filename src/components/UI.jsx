// ─── SHARED PRIMITIVE COMPONENTS ─────────────────────────────────────────────
// All brand colors come from config.js so they stay in sync with .env

import { COLORS } from "../config";

// ── Icon ────────────────────────────────────────────────────────────────────
export function Icon({ d, s = 18, sw = 1.6, className = "", style = {} }) {
  return (
    <svg
      width={s} height={s} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

// ── Icon paths dictionary ────────────────────────────────────────────────────
export const ic = {
  sun:      "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon:     "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  menu:     "M3 6h18M3 12h18M3 18h18",
  close:    "M18 6L6 18M6 6l12 12",
  arrow:    "M5 12h14M12 5l7 7-7 7",
  check:    "M20 6L9 17l-5-5",
  chevD:    "M6 9l6 6 6-6",
  globe:    "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  mic:      "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8",
  zap:      "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  layers:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  heart:    "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  brief:    "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  extLink:  "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  cpu:      "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  msg:      "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  sparkle:  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

// ── Label (tag chip with colored border) ────────────────────────────────────
export function Label({ children, color }) {
  return (
    <span
      style={{ color, border: `1px solid ${color}22`, background: `${color}12` }}
      className="inline-block font-mono text-[10px] font-semibold tracking-[0.18em] uppercase px-2.5 py-1 rounded"
    >
      {children}
    </span>
  );
}

// ── SectionLabel (eyebrow text above headings) ────────────────────────────────
export function SectionLabel({ children, color }) {
  return (
    <p
      style={{ color }}
      className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase mb-4"
    >
      {children}
    </p>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ onClick, variant = "primary", children, full = false, type = "button" }) {
  const base = `inline-flex items-center gap-2 font-dm font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${full ? "w-full justify-center" : ""}`;
  const variants = {
    primary: { background: COLORS.violet, color: "#fff",     border: `1px solid ${COLORS.violet}` },
    outline: { background: "transparent", color: COLORS.violet, border: `1px solid ${COLORS.violet}` },
    teal:    { background: COLORS.teal,   color: "#fff",     border: `1px solid ${COLORS.teal}` },
    ghost:   { background: "transparent", color: "inherit",  border: "1px solid transparent" },
    white:   { background: "#fff",        color: "#0D0C1A",  border: "1px solid #fff" },
  };
  return (
    <button type={type} onClick={onClick} className={base} style={variants[variant] || variants.primary}>
      {children}
    </button>
  );
}

// ── Avatar (initials circle) ──────────────────────────────────────────────────
export function Avatar({ name, color, size = 32 }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      style={{ width: size, height: size, background: color, flexShrink: 0 }}
      className="rounded-full flex items-center justify-center"
    >
      <span style={{ fontSize: size * 0.36, color: "#fff", fontFamily: "'Sora', sans-serif", fontWeight: 700 }}>
        {initials}
      </span>
    </div>
  );
}

// ── Layout primitives ─────────────────────────────────────────────────────────
export function Wrap({ children, narrow = false }) {
  return (
    <div className={`${narrow ? "max-w-3xl" : "max-w-6xl"} mx-auto px-6 md:px-12`}>
      {children}
    </div>
  );
}

export function Sec({ children, className = "", style = {} }) {
  return (
    <section className={`py-24 ${className}`} style={style}>
      {children}
    </section>
  );
}

// ── Card (dark/light adaptive container) ─────────────────────────────────────
export function Card({ children, dark, className = "", style = {} }) {
  const cardStyle = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };
  return (
    <div className={`rounded-xl ${className}`} style={{ ...cardStyle, ...style }}>
      {children}
    </div>
  );
}

// ── Section divider border helper ─────────────────────────────────────────────
export function sectionBorder(dark) {
  return dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
}

// ── Text color helpers ────────────────────────────────────────────────────────
export function textSub(dark)   { return dark ? "#8B8AA8" : "#6B6B85"; }
export function textMuted(dark) { return dark ? "#4A4962" : "#BABAC8"; }

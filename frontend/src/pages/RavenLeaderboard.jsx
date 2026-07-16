import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Ic, ic, Spinner, Empty, numFmt } from "../components/ui/index.jsx";

// ── Tier definitions (mirrors backend RavenEngine) ─────────────────────────
// Icons instead of emoji badges — these represent standing on the platform,
// not achievement-unlocked stickers.
const TIERS = {
  new_user:    { label: "New User",    icon: "sparkle", color: "#4A4870", min: 0,    next: 100  },
  contributor: { label: "Contributor", icon: "zap",     color: "#FFB830", min: 100,  next: 500  },
  raven:       { label: "Raven",       icon: "raven",   color: "#8B5CF6", min: 500,  next: 2000 },
  verified:    { label: "Verified",    icon: "check",   color: "#10F5A0", min: 2000, next: null },
};

const TIER_ORDER = ["new_user", "contributor", "raven", "verified"];

const PERKS = {
  new_user:    ["Access to the Vylapp community", "Full feed and Spaces access", "One-tap translation (1 language)", "Create vibes and connect"],
  contributor: ["All New User perks", "Priority support", "Contributor badge on profile"],
  raven:       ["All Contributor perks", "🪶 Raven badge", "Private Spaces access", "Founder AMAs"],
  verified:    ["All Raven perks", "✦ Verified checkmark", "Revenue share boost (+5%)", "Raven Summit VIP"],
};

const POINTS_TABLE = [
  { action: "Post a vibe",            pts: 5  },
  { action: "Host a Space",           pts: 20 },
  { action: "Join a Space",           pts: 3  },
  { action: "Leave a comment",        pts: 2  },
  { action: "Send a Super Vibe",      pts: 10 },
  { action: "Refer a new user",       pts: 50 },
  { action: "Refer a Pro subscriber", pts: 200 },
  { action: "Subscribe to Pro",       pts: 100 },
  { action: "7-day streak",           pts: 25 },
  { action: "30-day streak",          pts: 100 },
];

// ── Progress ring ──────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 120 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ── My tier hero card ──────────────────────────────────────────────────────
function MyTierCard({ tier, loading }) {
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Spinner size={32} /></div>;
  if (!tier) return null;

  const def = TIERS[tier.key] || TIERS.new_user;
  const pts = tier.points || 0;
  const pct = def.next ? Math.min(100, ((pts - def.min) / (def.next - def.min)) * 100) : 100;
  const ptsToNext = tier.points_to_next || 0;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${def.color}18, ${def.color}06)`,
      border: `1px solid ${def.color}40`,
      borderRadius: 22, padding: 22, marginBottom: 20,
      display: "flex", gap: 20, alignItems: "center",
    }}>
      {/* Progress ring */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <ProgressRing pct={pct} color={def.color} size={112} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ic d={ic[def.icon]} s={34} c={def.color} />
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 4 }}>YOUR TIER</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: def.color, marginBottom: 4 }}>{def.label}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>
          {numFmt(pts)} pts
        </div>
        {def.next ? (
          <>
            <div style={{ height: 5, background: "var(--bg4)", borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
              <div style={{
                height: "100%", background: def.color, borderRadius: 3,
                width: `${pct}%`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {numFmt(ptsToNext)} pts to {TIERS[TIER_ORDER[TIER_ORDER.indexOf(tier.key) + 1]]?.label || "next tier"}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: def.color, fontWeight: 700 }}>Maximum tier reached 🎉</div>
        )}
      </div>
    </div>
  );
}

// ── Tier roadmap ───────────────────────────────────────────────────────────
function TierRoadmap({ currentKey }) {
  return (
    <div style={{
      background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 18, padding: 18, marginBottom: 20,
    }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 16 }}>ALL TIERS</div>
      {TIER_ORDER.map((key, i) => {
        const t = TIERS[key];
        const isCurrent = key === currentKey;
        const isPast = TIER_ORDER.indexOf(currentKey) > i;
        return (
          <div key={key} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: i < 3 ? 18 : 0 }}>
            {/* Connector line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: isPast || isCurrent ? `${t.color}20` : "var(--bg4)",
                border: `2px solid ${isPast || isCurrent ? t.color : "var(--border2)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s", flexShrink: 0,
              }}><Ic d={ic[t.icon]} s={16} c={isPast || isCurrent ? t.color : "var(--text3)"} /></div>
              {i < 3 && <div style={{ width: 2, height: 18, background: isPast ? t.color : "var(--border2)", marginTop: 4 }} />}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: isCurrent ? t.color : isPast ? "var(--text)" : "var(--text2)" }}>
                  {t.label}
                </span>
                {isCurrent && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: t.color, background: `${t.color}14`, padding: "2px 8px", borderRadius: 6, fontFamily: "var(--mono)" }}>CURRENT</span>}
                {isPast && <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>✓</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>
                {t.next ? `${numFmt(t.min)}–${numFmt(t.next - 1)} pts` : `${numFmt(t.min)}+ pts`}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {PERKS[key].slice(0, 3).map((p, j) => (
                  <span key={j} style={{
                    fontSize: 12, padding: "3px 9px", borderRadius: 6,
                    background: isPast || isCurrent ? `${t.color}10` : "var(--bg4)",
                    color: isPast || isCurrent ? t.color : "var(--text3)",
                    border: `1px solid ${isPast || isCurrent ? t.color + "25" : "transparent"}`,
                  }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Leaderboard row ────────────────────────────────────────────────────────
function LeaderboardRow({ entry, rank, isMe }) {
  const t = TIERS[Object.keys(TIERS).find(k => TIERS[k].label === entry.tier) || "new_user"] || TIERS.new_user;
  const rankColor = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "var(--text3)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
      borderRadius: 14, marginBottom: 6,
      background: isMe ? "var(--violet-dim)" : "var(--bg3)",
      border: `1px solid ${isMe ? "var(--violet-border)" : "var(--border2)"}`,
      transition: "all 0.2s",
    }}>
      {/* Rank */}
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: rank <= 3 ? `${rankColor}22` : "var(--bg4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: 14, fontFamily: "var(--mono)", color: rankColor,
      }}>
        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
      </div>

      {/* Avatar initials */}
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: `${t.color}18`, border: `1.5px solid ${t.color}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 13, color: t.color, fontFamily: "var(--mono)",
      }}>
        {entry.handle?.slice(0, 2).toUpperCase() || "VY"}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{entry.displayName || entry.handle}</span>
          <span title={entry.tier} style={{ display: "inline-flex" }}><Ic d={ic[t.icon]} s={13} c={t.color} /></span>
          {isMe && <span style={{ fontSize: 11, color: "var(--violet-lt)", fontWeight: 700 }}>· You</span>}
        </div>
        <div style={{ color: "var(--text2)", fontSize: 12, fontFamily: "var(--mono)", marginTop: 2 }}>@{entry.handle}</div>
      </div>

      {/* Points */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 16, fontFamily: "var(--mono)", color: t.color }}>
          {numFmt(entry.points)}
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>pts</div>
      </div>
    </div>
  );
}

// ── Points table ───────────────────────────────────────────────────────────
function HowToEarn() {
  return (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 18, padding: 18, marginBottom: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 14 }}>
        HOW TO EARN POINTS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {POINTS_TABLE.map((row, i) => (
          <div key={row.action} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0",
            borderBottom: i < POINTS_TABLE.length - 1 ? "1px solid var(--border2)" : "none",
          }}>
            <span style={{ fontSize: 13.5, color: "var(--text)" }}>{row.action}</span>
            <span style={{
              fontWeight: 800, fontSize: 13.5, fontFamily: "var(--mono)",
              color: row.pts >= 100 ? "var(--amber)" : row.pts >= 20 ? "var(--violet-lt)" : "var(--text2)",
            }}>+{row.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RavenLeaderboard() {
  const { user } = useAuth();
  const [myTier, setMyTier] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingTier, setLoadingTier] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [tab, setTab] = useState("leaderboard"); // leaderboard | tiers | earn

  useEffect(() => {
    if (user) {
      api.get("/raven/me")
        .then(({ tier }) => setMyTier(tier))
        .catch(() => {})
        .finally(() => setLoadingTier(false));
    } else {
      setLoadingTier(false);
    }

    api.get("/raven/leaderboard")
      .then(({ leaderboard: lb }) => setLeaderboard(lb || []))
      .catch(() => {})
      .finally(() => setLoadingBoard(false));
  }, [user]);

  return (
    <div style={{ padding: "20px 16px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#A78BFA,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic d={ic.raven} s={19} c="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Raven</h1>
          <p style={{ color: "var(--text2)", fontSize: 13, margin: 0 }}>Loyalty tiers for Vylapp's most engaged members</p>
        </div>
      </div>

      {/* My tier card */}
      {user && <MyTierCard tier={myTier} loading={loadingTier} />}
      {!user && (
        <div style={{
          background: "var(--violet-dim)", border: "1px solid var(--violet-border)",
          borderRadius: 16, padding: "16px 18px", marginBottom: 20,
          fontSize: 14, color: "var(--text2)", textAlign: "center",
        }}>
          Sign in to see your tier and earn Raven points.
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border2)", marginBottom: 20 }}>
        {[["leaderboard", "Leaderboard"], ["tiers", "Tiers"], ["earn", "How to Earn"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer",
            fontWeight: 800, fontSize: 13.5,
            color: tab === k ? "var(--text)" : "var(--text3)",
            borderBottom: tab === k ? "2px solid var(--violet)" : "2px solid transparent",
          }}>{l}</button>
        ))}
      </div>

      {/* LEADERBOARD TAB */}
      {tab === "leaderboard" && (
        <>
          {loadingBoard ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={32} /></div>
          ) : leaderboard.length === 0 ? (
            <Empty emoji="🏆" title="No rankings yet" sub="Start vibing to earn your spot." />
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 12 }}>
                TOP {leaderboard.length} VIBERS
              </div>
              {leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.handle || i}
                  entry={entry}
                  rank={i + 1}
                  isMe={entry.handle === user?.handle}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* TIERS TAB */}
      {tab === "tiers" && (
        <TierRoadmap currentKey={myTier?.key || "new_user"} />
      )}

      {/* HOW TO EARN TAB */}
      {tab === "earn" && (
        <>
          <p style={{ color: "var(--text2)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 16 }}>
            Every action on Vylapp earns points toward your Raven tier. Keep showing up and your rank will climb.
          </p>
          <HowToEarn />
          {user?.isFoundingMember && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12, background: "var(--amber-dim)",
              border: "1px solid var(--amber)", borderRadius: 14, padding: "12px 16px", marginBottom: 14,
            }}>
              <Ic d={ic.raven} s={22} c="var(--amber)" />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>You're Founding Raven #{user.foundingRank}</div>
                <div style={{ color: "var(--text2)", fontSize: 12.5 }}>Your 85% revenue share rate is already active — see Creator Earnings.</div>
              </div>
            </div>
          )}
          <div style={{
            background: "linear-gradient(135deg,rgba(167,139,250,0.12),rgba(124,58,237,0.06))",
            border: "1px solid rgba(167,139,250,0.3)", borderRadius: 16, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
              <Ic d={ic.raven} s={15} c="var(--purple)" /> Founding Raven
            </div>
            <div style={{ color: "var(--text2)", fontSize: 13.5, lineHeight: 1.6 }}>
              {user?.isFoundingMember ? (
                <>You were one of the first 1,000 to join Vylapp — that's a permanent status, not a subscription. It comes with an 85% revenue share rate, a lifetime price lock on Pro, and VIP access to the annual Raven Summit.</>
              ) : (
                <>The first 1,000 members to join Vylapp earn <strong style={{ color: "var(--amber)" }}>Founding Raven</strong> status —
                including an 85% revenue share rate, a lifetime price lock on Pro, and VIP access to the annual Raven Summit.</>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

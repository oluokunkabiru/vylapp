import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  Ic, ic, Spinner, Empty, PrimaryButton, GhostButton, numFmt,
} from "../components/ui/index.jsx";

// ── Category config ────────────────────────────────────────────────────────
const CATS = [
  { key: "TECH_VIBES",      label: "Tech Vibes",      color: "var(--sky)",    emoji: "⚡" },
  { key: "GLOBAL_CONNECT",  label: "Global Connect",  color: "var(--green)",  emoji: "🌍" },
  { key: "CREATIVE_LEARN",  label: "Creative Learn",  color: "var(--amber)",  emoji: "🎨" },
  { key: "HUMAN_POTENTIAL", label: "Human Potential", color: "var(--purple)", emoji: "🧠" },
  { key: "SPACES_INVITE",   label: "Spaces Invite",   color: "var(--coral)",  emoji: "🎙️" },
];

const SCHEDULES = [
  { key: "peak",    label: "Peak Hours",    desc: "9 AM · 12 PM · 6 PM",  times: "0 9,12,18 * * *" },
  { key: "morning", label: "Morning Vibes", desc: "7 AM · 10 AM",         times: "0 7,10 * * *" },
  { key: "evening", label: "Evening Drop",  desc: "6 PM · 8 PM · 10 PM",  times: "0 18,20,22 * * *" },
  { key: "custom",  label: "Custom",        desc: "You set the times",     times: "" },
];

// ── Small stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "var(--violet-lt)" }) {
  return (
    <div style={{
      background: "var(--bg3)", borderRadius: 16, padding: "16px 18px",
      border: "1px solid var(--border2)", flex: 1, minWidth: 0,
    }}>
      <div style={{ color: "var(--text2)", fontSize: 12, fontWeight: 700, letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 26, color, fontFamily: "var(--mono)" }}>{value}</div>
      {sub && <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Generated post preview card ────────────────────────────────────────────
const CAT_GRADS = {
  TECH_VIBES:      "linear-gradient(135deg,#38BDF8,#7C3AED)",
  GLOBAL_CONNECT:  "linear-gradient(135deg,#10F5A0,#2DD4BF)",
  CREATIVE_LEARN:  "linear-gradient(135deg,#FFB830,#FF6B6B)",
  HUMAN_POTENTIAL: "linear-gradient(135deg,#A78BFA,#7C3AED)",
  SPACES_INVITE:   "linear-gradient(135deg,#FF6B6B,#FFB830)",
};
const CAT_EMOJI = {
  TECH_VIBES:"⚡", GLOBAL_CONNECT:"🌍", CREATIVE_LEARN:"🎨", HUMAN_POTENTIAL:"🧠", SPACES_INVITE:"🎙️",
};

function PostPreview({ post, index }) {
  const cat = CATS.find(c => c.key === post.category) || CATS[0];
  return (
    <div style={{
      background: "var(--bg3)", borderRadius: 16, padding: 14,
      border: `1px solid ${cat.color}30`, animation: "slideUp 0.3s ease both",
      animationDelay: `${index * 0.12}s`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: CAT_GRADS[post.category] || "var(--grad)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
        }}>{CAT_EMOJI[post.category] || "✦"}</div>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: cat.color,
          background: `${cat.color}14`, padding: "3px 9px", borderRadius: 6, fontFamily: "var(--mono)",
        }}>{cat.label}</span>
        <span style={{
          marginLeft: "auto", fontSize: 11, fontWeight: 700,
          color: post.method === "claude" ? "var(--green)" : "var(--text3)",
        }}>{post.method === "claude" ? "✦ AI" : "template"}</span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text)", margin: 0 }}>
        {post.content}
      </p>
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        {[["❤️", post.est_likes], ["🔁", post.est_reposts], ["💬", post.est_replies]].map(([e, n]) => (
          <span key={e} style={{ fontSize: 12.5, color: "var(--text3)", fontFamily: "var(--mono)" }}>
            {e} ~{numFmt(n)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Run history row ────────────────────────────────────────────────────────
function RunRow({ run }) {
  const statusColor = {
    complete: "var(--green)", error: "var(--coral)", posting: "var(--amber)", idle: "var(--text3)",
  }[run.status] || "var(--text2)";

  const when = run.started_at
    ? new Date(run.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "13px 0",
      borderBottom: "1px solid var(--border2)",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0,
        boxShadow: run.status === "complete" ? `0 0 8px ${statusColor}` : "none",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {run.posts_generated} post{run.posts_generated !== 1 ? "s" : ""} generated
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>{when}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text2)", fontFamily: "var(--mono)" }}>
          ~{numFmt(run.total_likes_est)} likes est.
        </div>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 0.4, marginTop: 3,
          color: statusColor,
        }}>{run.status.toUpperCase()}</div>
      </div>
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ on, onChange, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <button
        onClick={() => onChange(!on)}
        aria-label={label}
        style={{
          width: 52, height: 30, borderRadius: 15, border: "none", cursor: "pointer",
          background: on ? "var(--grad)" : "var(--bg4)",
          position: "relative", transition: "background 0.22s", flexShrink: 0,
          boxShadow: on ? "var(--shadow-violet)" : "none",
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: on ? 24 : 3,
          width: 24, height: 24, borderRadius: "50%", background: "#fff",
          transition: "left 0.22s", boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        }} />
      </button>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{label}</div>
        {sub && <div style={{ color: "var(--text2)", fontSize: 12.5, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Autopilot() {
  const { user } = useAuth();
  const toast = useToast();

  // Config state
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local editable config (before saving)
  const [enabled, setEnabled] = useState(false);
  const [autoPost, setAutoPost] = useState(true);
  const [autoEngage, setAutoEngage] = useState(true);
  const [activeCats, setActiveCats] = useState(["TECH_VIBES", "GLOBAL_CONNECT", "CREATIVE_LEARN", "HUMAN_POTENTIAL", "SPACES_INVITE"]);
  const [schedule, setSchedule] = useState("peak");
  const [maxPosts, setMaxPosts] = useState(5);

  // Run state
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [runStep, setRunStep] = useState("");
  const [generatedPosts, setGeneratedPosts] = useState([]);

  // History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Totals from history
  const totalPosts = history.reduce((s, r) => s + (r.posts_generated || 0), 0);
  const totalLikes = history.reduce((s, r) => s + (r.total_likes_est || 0), 0);
  const totalRuns  = history.length;

  const progressTimer = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get("/autopilot/config")
      .then(({ config: c }) => {
        if (c) {
          setConfig(c);
          setEnabled(c.enabled);
          setAutoPost(c.auto_post);
          setAutoEngage(c.auto_engage);
          setActiveCats(c.active_categories || ["TECH_VIBES", "GLOBAL_CONNECT"]);
          setMaxPosts(c.max_posts_per_run || 5);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));

    api.get("/autopilot/runs")
      .then(({ runs: r }) => setHistory(r || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [user]);

  const toggleCat = (key) => {
    setActiveCats(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.put("/autopilot/config", {
        enabled, autoPost, autoEngage, autoReply: true,
        maxPostsPerRun: maxPosts, activeCategories: activeCats,
      });
      toast("Autopilot config saved ✓");
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const runNow = async () => {
    if (activeCats.length === 0) { toast("Pick at least one category", "error"); return; }
    setRunning(true);
    setRunProgress(0);
    setGeneratedPosts([]);

    const steps = [
      "Scanning trending topics…",
      "Selecting hooks and angles…",
      "Generating post content…",
      "Publishing to your feed…",
    ];
    let stepIdx = 0;
    setRunStep(steps[0]);

    // Animate progress while the API call runs
    progressTimer.current = setInterval(() => {
      setRunProgress(p => {
        const next = p + 1.2;
        const threshold = ((stepIdx + 1) / steps.length) * 88;
        if (next >= threshold && stepIdx < steps.length - 1) {
          stepIdx++;
          setRunStep(steps[stepIdx]);
        }
        return Math.min(next, 88);
      });
    }, 60);

    try {
      const { posted } = await api.post("/autopilot/run", {
        categories: activeCats,
        count: maxPosts,
      });
      clearInterval(progressTimer.current);
      setRunProgress(100);
      setRunStep("Done!");
      setGeneratedPosts(posted || []);
      // Refresh history
      const { runs: r } = await api.get("/autopilot/runs");
      setHistory(r || []);
      toast(`${posted.length} vibes posted ✓`);
    } catch (e) {
      clearInterval(progressTimer.current);
      setRunStep("Error");
      toast(e.message, "error");
    } finally {
      setTimeout(() => { setRunning(false); setRunProgress(0); setRunStep(""); }, 1500);
    }
  };

  if (!user) return (
    <Empty emoji="🤖" title="Sign in to use Autopilot"
      sub="Autopilot generates and publishes vibes for you automatically." />
  );

  return (
    <div style={{ padding: "20px 16px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--grad)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ic d={ic.zap} s={20} c="#fff" f="#fff" sw={0} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Autopilot</h1>
        </div>
        <p style={{ color: "var(--text2)", fontSize: 14.5, lineHeight: 1.5, margin: 0 }}>
          Generate and publish vibes automatically. Organic templates or Claude AI — your call.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <StatCard label="TOTAL RUNS"  value={loadingHistory ? "—" : totalRuns}             color="var(--violet-lt)" />
        <StatCard label="VIBES POSTED" value={loadingHistory ? "—" : numFmt(totalPosts)}   color="var(--green)"     />
        <StatCard label="EST. LIKES"  value={loadingHistory ? "—" : numFmt(totalLikes)}    color="var(--amber)"     />
      </div>

      {/* Master enable */}
      {loadingConfig ? <Spinner /> : (
        <div style={{
          background: enabled ? "var(--violet-dim)" : "var(--bg3)",
          border: `1px solid ${enabled ? "var(--violet-border)" : "var(--border2)"}`,
          borderRadius: 18, padding: 18, marginBottom: 20,
          transition: "all 0.25s",
        }}>
          <Toggle
            on={enabled}
            onChange={setEnabled}
            label="Autopilot enabled"
            sub={enabled ? "Posts will go live on schedule" : "Enable to schedule automatic posts"}
          />
        </div>
      )}

      {/* Config section */}
      <div style={{
        background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 18, padding: 18, marginBottom: 20,
      }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 14 }}>CONFIGURATION</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          <Toggle on={autoPost} onChange={setAutoPost} label="Auto-post" sub="Publish generated content automatically" />
          <Toggle on={autoEngage} onChange={setAutoEngage} label="Auto-engage" sub="Like and comment on trending content" />
        </div>

        {/* Category pills */}
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>Feed categories</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {CATS.map(c => {
            const on = activeCats.includes(c.key);
            return (
              <button key={c.key} onClick={() => toggleCat(c.key)} style={{
                padding: "8px 14px", borderRadius: "var(--radius-pill)",
                border: `1.5px solid ${on ? c.color : "var(--border)"}`,
                background: on ? `${c.color}18` : "transparent",
                color: on ? c.color : "var(--text2)",
                fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              }}>
                {c.emoji} {c.label}
                {on && <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Schedule presets */}
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>Post schedule</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {SCHEDULES.map(s => (
            <button key={s.key} onClick={() => setSchedule(s.key)} style={{
              padding: "11px 14px", borderRadius: 12, textAlign: "left", cursor: "pointer",
              border: `1.5px solid ${schedule === s.key ? "var(--violet)" : "var(--border2)"}`,
              background: schedule === s.key ? "var(--violet-dim)" : "transparent",
            }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: schedule === s.key ? "var(--violet-lt)" : "var(--text)" }}>
                {s.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{s.desc}</div>
            </button>
          ))}
        </div>

        {/* Max posts slider */}
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>
          Posts per run: <span style={{ color: "var(--violet-lt)", fontFamily: "var(--mono)" }}>{maxPosts}</span>
        </div>
        <input type="range" min={1} max={8} value={maxPosts} onChange={e => setMaxPosts(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--violet)", marginBottom: 20 }} />

        <PrimaryButton onClick={saveConfig} loading={saving} full>Save configuration</PrimaryButton>
      </div>

      {/* Run Now section */}
      <div style={{
        background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 18, padding: 18, marginBottom: 20,
      }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 14 }}>
          RUN AUTOPILOT NOW
        </div>

        {!running && generatedPosts.length === 0 && (
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
            Instantly generate up to {maxPosts} vibes across your selected categories and publish them live.
          </p>
        )}

        {running ? (
          <div>
            {/* Progress bar */}
            <div style={{
              height: 6, background: "var(--bg4)", borderRadius: 3, overflow: "hidden", marginBottom: 12,
            }}>
              <div style={{
                height: "100%", borderRadius: 3, background: "var(--grad)",
                width: `${runProgress}%`, transition: "width 0.12s linear",
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text2)", fontSize: 14 }}>
              <Spinner size={18} />
              <span>{runStep}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 12, color: "var(--text3)" }}>
                {Math.round(runProgress)}%
              </span>
            </div>
          </div>
        ) : (
          <button onClick={runNow} style={{
            width: "100%", padding: "15px 0", borderRadius: 14,
            background: activeCats.length ? "var(--grad)" : "var(--bg4)",
            border: "none", color: activeCats.length ? "#fff" : "var(--text3)",
            fontWeight: 800, fontSize: 16, cursor: activeCats.length ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxShadow: activeCats.length ? "var(--shadow-violet)" : "none",
          }}>
            <Ic d={ic.zap} s={20} c="currentColor" f="currentColor" sw={0} />
            Run Now
          </button>
        )}

        {/* Generated posts stream */}
        {generatedPosts.length > 0 && !running && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--green)", letterSpacing: 0.4 }}>
              ✓ {generatedPosts.length} VIBES PUBLISHED
            </div>
            {generatedPosts.map((p, i) => <PostPreview key={i} post={p} index={i} />)}
          </div>
        )}
      </div>

      {/* Run History */}
      <div style={{
        background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 18, padding: 18,
      }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 4 }}>
          RUN HISTORY
        </div>
        {loadingHistory ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Spinner /></div>
        ) : history.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
            No runs yet — hit Run Now to get started.
          </div>
        ) : (
          history.slice(0, 12).map((r, i) => <RunRow key={r.id || i} run={r} />)
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, Spinner, Empty, PrimaryButton, GhostButton, numFmt } from "../components/ui/index.jsx";

// ── Helpers ────────────────────────────────────────────────────────────────
function usd(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);
}
function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

// ── Big earnings card ──────────────────────────────────────────────────────
function EarningsHero({ pending, total, loading }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(16,245,160,0.1))",
      border: "1px solid var(--violet-border)", borderRadius: 20, padding: 24, marginBottom: 20,
      position: "relative", overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 160, height: 160,
        borderRadius: "50%", background: "radial-gradient(rgba(124,58,237,0.25),transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ color: "var(--text2)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>PENDING BALANCE</div>
      <div style={{ fontWeight: 900, fontSize: 40, fontFamily: "var(--mono)", color: "var(--green)", letterSpacing: -1 }}>
        {loading ? "—" : usd(pending)}
      </div>
      <div style={{ color: "var(--text3)", fontSize: 13.5, marginTop: 6 }}>
        {loading ? "" : `${usd(total)} earned total`}
      </div>
    </div>
  );
}

// ── Revenue breakdown tiles ────────────────────────────────────────────────
function BreakdownTile({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 16,
      padding: "16px", flex: 1, minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic d={ic[icon] || ic.dollar} s={14} c={color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: 0.3 }}>{label}</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 20, fontFamily: "var(--mono)", color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Analytics snapshot ─────────────────────────────────────────────────────
function AnalyticsCard({ snapshot, loading }) {
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Spinner /></div>;
  if (!snapshot) return null;

  const gradeColor = { Excellent: "var(--green)", Good: "var(--amber)", "Needs Work": "var(--coral)" }[snapshot.engagement_grade] || "var(--text2)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[
        { label: "Engagement rate", value: `${((snapshot.engagement_rate || 0) * 100).toFixed(2)}%`, note: snapshot.engagement_grade, noteColor: gradeColor },
        { label: "Total followers", value: numFmt(snapshot.followers || 0), note: null },
        { label: "Total impressions", value: numFmt(snapshot.impressions || 0), note: null },
        { label: "Subscribers", value: numFmt(snapshot.subscribers || 0), note: null },
        { label: "Est. monthly earnings", value: usd(snapshot.est_monthly_earnings || 0), note: "from subscriptions", noteColor: "var(--text3)" },
      ].map(row => (
        <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text2)", fontSize: 13.5 }}>{row.label}</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontWeight: 800, fontSize: 14, fontFamily: "var(--mono)" }}>{row.value}</span>
            {row.note && <span style={{ fontSize: 12, color: row.noteColor || "var(--text3)", marginLeft: 6 }}>{row.note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Transaction row ────────────────────────────────────────────────────────
function TxRow({ tx }) {
  const typeLabel = { super_vibe: "Super Vibe", creator_subscription: "Subscription", space_ticket: "Ticket", digital_product: "Product", tip: "Tip" }[tx.type] || tx.type;
  const color = tx.type === "super_vibe" ? "var(--coral)" : tx.type === "creator_subscription" ? "var(--violet-lt)" : "var(--green)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid var(--border2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic d={tx.type === "super_vibe" ? ic.heart : tx.type === "creator_subscription" ? ic.star : ic.dollar} s={14} c={color} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{typeLabel}</div>
          <div style={{ color: "var(--text3)", fontSize: 12, fontFamily: "var(--mono)" }}>{timeAgo(tx.created_at)}</div>
        </div>
      </div>
      <span style={{ fontWeight: 800, fontSize: 15, fontFamily: "var(--mono)", color: "var(--green)" }}>
        +{usd(tx.net_usd)}
      </span>
    </div>
  );
}

// ── Tier builder modal ────────────────────────────────────────────────────
function TierModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "", priceUsd: "", billingPeriod: "monthly", perks: "" });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name || !form.priceUsd) return;
    setLoading(true);
    try {
      await api.post("/creator/tiers", {
        name: form.name, description: form.description,
        priceUsd: parseFloat(form.priceUsd), billingPeriod: form.billingPeriod,
        perks: form.perks.split(",").map(p => p.trim()).filter(Boolean),
      });
      toast("Tier created ✓");
      onCreated();
      onClose();
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 14.5, outline: "none", marginBottom: 10 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,7,15,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>New Subscription Tier</div>
        <input placeholder="Tier name (e.g. Studio Circle)" value={form.name} onChange={set("name")} style={inputStyle} />
        <input placeholder="Description" value={form.description} onChange={set("description")} style={inputStyle} />
        <input type="number" placeholder="Price (USD/month)" value={form.priceUsd} onChange={set("priceUsd")} min="0.5" step="0.5" style={inputStyle} />
        <input placeholder="Perks, comma-separated" value={form.perks} onChange={set("perks")} style={inputStyle} />
        <select value={form.billingPeriod} onChange={set("billingPeriod")} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="monthly">Monthly billing</option>
          <option value="annual">Annual billing (save 2 months)</option>
        </select>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <PrimaryButton onClick={submit} loading={loading} sx={{ flex: 1 }}>Create Tier</PrimaryButton>
          <GhostButton onClick={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CreatorEarnings() {
  const { user } = useAuth();
  const toast = useToast();

  const [earnings, setEarnings] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payingOut, setPayingOut] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [becomingCreator, setBecomingCreator] = useState(false);
  const [tab, setTab] = useState("overview"); // overview | tiers | ledger

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [earningsData, snapshotData] = await Promise.all([
        api.get("/creator/me/earnings").catch(() => null),
        api.get("/analytics/creator/me").catch(() => null),
      ]);
      if (earningsData) {
        setEarnings(earningsData);
        setIsCreator(!!earningsData.profile);
        if (earningsData.profile) {
          const creatorProfile = await api.get(`/creator/${user.id}/profile`).catch(() => null);
          setTiers(creatorProfile?.tiers || []);
        }
      }
      if (snapshotData) setSnapshot(snapshotData.snapshot);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const becomeCreator = async () => {
    setBecomingCreator(true);
    try {
      await api.post("/creator/profile", { categories: user.interests || [] });
      toast("Creator profile created ✓");
      load();
    } catch (e) { toast(e.message, "error"); }
    finally { setBecomingCreator(false); }
  };

  const requestPayout = async () => {
    setPayingOut(true);
    try {
      await api.post("/creator/me/payout-request");
      toast("Payout request submitted ✓");
      load();
    } catch (e) { toast(e.message, "error"); }
    finally { setPayingOut(false); }
  };

  if (!user) return <Empty emoji="💰" title="Sign in to view earnings" sub="Track your creator income from Super Vibes, subscriptions, and more." />;

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={36} /></div>;

  // Not yet a creator — onboarding CTA
  if (!isCreator) return (
    <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20, background: "var(--grad)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "var(--shadow-violet)",
      }}>
        <Ic d={ic.dollar} s={40} c="#fff" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Become a Creator</h2>
      <p style={{ color: "var(--text2)", fontSize: 15, lineHeight: 1.6, maxWidth: 300 }}>
        Earn from Super Vibes, subscription tiers, digital products, and paid Spaces. You keep 80%.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
        {[
          { icon: "dollar", color: "var(--green)", text: "Keep 80% of all earnings" },
          { icon: "zap", color: "var(--amber)", text: "Super Vibes on every post" },
          { icon: "coins", color: "var(--violet-lt)", text: "Subscription tiers for fans" },
          { icon: "mic", color: "var(--coral)", text: "Sell tickets to your Spaces" },
        ].map(f => (
          <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg3)", borderRadius: 12, padding: "11px 16px", textAlign: "left" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic d={ic[f.icon]} s={15} c={f.color} />
            </div>
            <span style={{ fontSize: 14, color: "var(--text)" }}>{f.text}</span>
          </div>
        ))}
      </div>
      <PrimaryButton onClick={becomeCreator} loading={becomingCreator} sx={{ width: "100%", maxWidth: 320 }}>
        Start earning
      </PrimaryButton>
    </div>
  );

  const pending = earnings?.profile?.pending_balance_usd || 0;
  const total = earnings?.profile?.total_earned_usd || 0;
  const ledger = earnings?.recentLedger || [];
  const superVibes = ledger.filter(t => t.type === "super_vibe");
  const subs = ledger.filter(t => t.type === "creator_subscription");

  return (
    <div style={{ padding: "20px 16px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--grad)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic d={ic.dollar} s={20} c="#fff" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Creator Earnings</h1>
      </div>

      <EarningsHero pending={pending} total={total} loading={false} />

      {/* Payout button */}
      {pending >= 10 ? (
        <PrimaryButton onClick={requestPayout} loading={payingOut} full sx={{ marginBottom: 20 }}>
          Request payout — {usd(pending)}
        </PrimaryButton>
      ) : (
        <div style={{ background: "var(--bg3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "var(--text2)", textAlign: "center" }}>
          Minimum payout is $10.00 · You need {usd(10 - pending)} more
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border2)", marginBottom: 20 }}>
        {[["overview", "Overview"], ["tiers", "Tiers"], ["ledger", "Ledger"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer",
            fontWeight: 800, fontSize: 13.5,
            color: tab === k ? "var(--text)" : "var(--text3)",
            borderBottom: tab === k ? "2px solid var(--violet)" : "2px solid transparent",
          }}>{l}</button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <>
          {/* Revenue breakdown */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <BreakdownTile label="SUPER VIBES" value={numFmt(superVibes.length)} icon="heart" color="var(--coral)" sub="tips received" />
            <BreakdownTile label="SUBSCRIBERS" value={numFmt(snapshot?.subscribers || 0)} icon="star" color="var(--violet-lt)" sub="active" />
            <BreakdownTile label="TRANSACTIONS" value={numFmt(ledger.length)} icon="chart" color="var(--green)" sub="this month" />
          </div>

          {/* Analytics snapshot */}
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 18, padding: 18, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text2)", letterSpacing: 0.5, marginBottom: 14 }}>ANALYTICS SNAPSHOT</div>
            <AnalyticsCard snapshot={snapshot} loading={!snapshot} />
          </div>

          {/* Take-rate explanation */}
          <div style={{ background: "var(--violet-dim)", border: "1px solid var(--violet-border)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: "var(--green-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic d={ic.dollar} s={13} c="var(--green)" />
              </div>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>Your creator split</div>
            </div>
            {earnings?.revenueShare?.boosted ? (
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                You keep <strong style={{ color: "var(--green)" }}>85%</strong> of Super Vibes and subscription revenue, and{" "}
                <strong style={{ color: "var(--green)" }}>90%</strong> of Space ticket sales — the boosted rate for{" "}
                {earnings.revenueShare.reason === "founding" ? "founding members (first 1,000 accounts)" : "Verified-tier creators"}.
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                You keep <strong style={{ color: "var(--green)" }}>80%</strong> of Super Vibes and subscription revenue, and{" "}
                <strong style={{ color: "var(--green)" }}>85%</strong> of Space ticket sales.
                Founding members and Verified-tier creators keep an extra 5% —{" "}
                <Link to="/raven" style={{ color: "var(--violet-lt)", fontWeight: 700 }}>see Raven</Link>.
              </div>
            )}
          </div>
        </>
      )}

      {/* TIERS TAB */}
      {tab === "tiers" && (
        <>
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
            Fans can subscribe monthly for exclusive access, early drops, and direct connection with you.
          </p>
          {tiers.map(t => (
            <div key={t.id} style={{
              background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 16,
              padding: 16, marginBottom: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{t.name}</div>
                <div style={{ fontWeight: 900, fontSize: 18, fontFamily: "var(--mono)", color: "var(--green)" }}>
                  {usd(t.price_usd)}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--text2)" }}>/{t.billing_period === "annual" ? "yr" : "mo"}</span>
                </div>
              </div>
              {t.description && <div style={{ color: "var(--text2)", fontSize: 13.5, marginBottom: 10 }}>{t.description}</div>}
              {t.perks?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {t.perks.map(p => (
                    <span key={p} style={{ background: "var(--bg4)", borderRadius: "var(--radius-pill)", padding: "4px 10px", fontSize: 12, color: "var(--text2)" }}>✓ {p}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={() => setShowTierModal(true)} style={{
            width: "100%", padding: "14px 0", borderRadius: 14,
            border: "1.5px dashed var(--border)", background: "transparent",
            color: "var(--violet-lt)", fontWeight: 700, fontSize: 15, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Ic d={ic.plus} s={18} c="var(--violet-lt)" sw={2.5} /> Add a tier
          </button>
          {showTierModal && (
            <TierModal onClose={() => setShowTierModal(false)} onCreated={load} />
          )}
        </>
      )}

      {/* LEDGER TAB */}
      {tab === "ledger" && (
        <>
          {ledger.length === 0 ? (
            <Empty emoji="📋" title="No transactions yet" sub="Your earnings ledger will appear here." />
          ) : (
            ledger.map((tx, i) => <TxRow key={i} tx={tx} />)
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAdmin } from "./AdminGuard.jsx";
import { Spinner, numFmt, Ic, ic } from "../../components/ui/index.jsx";

const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

function Card({ label, value, sub, color }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || "var(--text)", marginTop: 8, fontFamily: "var(--mono)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Sparkline({ series, color }) {
  if (!series?.length) return null;
  const max = Math.max(1, ...series.map(p => p.value));
  const w = 100, h = 32;
  const points = series.map((p, i) => `${(i / Math.max(1, series.length - 1)) * w},${h - (p.value / max) * h}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", marginTop: 12 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function QuickLink({ to, icon, label, sub }) {
  return (
    <Link to={to} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
      background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14,
      textDecoration: "none", flex: 1, minWidth: 200,
    }}>
      <Ic d={icon} s={20} c="var(--violet-lt)" />
      <div>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>{label}</div>
        {sub && <div style={{ color: "var(--text3)", fontSize: 11.5 }}>{sub}</div>}
      </div>
    </Link>
  );
}

export default function AdminOverview() {
  const { can } = useAdmin();
  const [platform, setPlatform] = useState(null);
  const [trends, setTrends] = useState(null);
  const [learnStats, setLearnStats] = useState(null);
  const [monetization, setMonetization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/platform"),
      api.get("/admin/analytics/trends?days=30").catch(() => null),
      can("learn.manage") ? api.get("/admin/learn/stats").catch(() => null) : Promise.resolve(null),
      can("creator.manage") ? api.get("/admin/monetization/overview?days=30").catch(() => null) : Promise.resolve(null),
    ])
      .then(([p, t, l, m]) => { setPlatform(p); setTrends(t); setLearnStats(l); setMonetization(m); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={36} /></div>;

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 24px" }}>Overview</h1>

      {error && <div style={{ color: "var(--coral)", marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <Card label="TOTAL USERS" value={numFmt(platform?.totalUsers || 0)} />
        <Card label="TOTAL VIBES" value={numFmt(platform?.totalVibes || 0)} />
        <Card label="PLATFORM REVENUE" value={usd(platform?.platformRevenueUsd)} color="var(--green)" />
        <Card label="STICKINESS (DAU/MAU)" value={`${((platform?.stickiness || 0) * 100).toFixed(1)}%`} color="var(--violet-lt)" />
      </div>

      {trends && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text2)" }}>New users — last {trends.days}d</div>
            <Sparkline series={trends.new_users} color="var(--violet-lt)" />
          </div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text2)" }}>New vibes — last {trends.days}d</div>
            <Sparkline series={trends.new_vibes} color="var(--sky)" />
          </div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text2)" }}>Revenue — last {trends.days}d</div>
            <Sparkline series={trends.revenue_usd} color="var(--green)" />
          </div>
        </div>
      )}

      {(learnStats || monetization) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 28 }}>
          {learnStats && (
            <Card label="PUBLISHED COURSES" value={numFmt(learnStats.by_status?.published || 0)} sub={`${numFmt(learnStats.enrolments)} enrolments · ${numFmt(learnStats.educators)} educators`} />
          )}
          {monetization && (
            <>
              <Card label="REVENUE (30D)" value={usd(monetization.gross_usd)} color="var(--green)" />
              <Card label="PENDING PAYOUTS" value={usd(monetization.pending_payouts_usd)} color="var(--coral)" sub={`${monetization.pending_payouts_count} awaiting action`} />
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text2)", marginBottom: 12 }}>Quick links</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {can("admin.content.manage") && <QuickLink to="/admin/content" icon={ic.image} label="Content" sub="Vibes & Spaces" />}
          {can("admin.content.manage") && <QuickLink to="/admin/moderation" icon={ic.zap} label="Moderation" sub="Report queue" />}
          {can("learn.manage") && <QuickLink to="/admin/learn" icon={ic.book} label="Learn" sub="Courses & educators" />}
          {can("admin.content.manage") && <QuickLink to="/admin/forum" icon={ic.comment} label="Forum" sub="Categories & threads" />}
          {can("creator.manage") && <QuickLink to="/admin/monetization" icon={ic.coins} label="Monetization" sub="Payouts & revenue" />}
          {can("admin.system.config") && <QuickLink to="/admin/settings" icon={ic.lock} label="Settings" sub="Config & feature flags" />}
        </div>
      </div>
    </div>
  );
}

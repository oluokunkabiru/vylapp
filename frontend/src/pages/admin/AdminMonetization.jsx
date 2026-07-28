import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";

const PAGE_SIZE = 20;
const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

function btnStyle(color) {
  return {
    background: "none", border: `1px solid ${color}`, color, fontWeight: 700, fontSize: 12.5,
    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
  };
}

const inputStyle = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border2)",
  background: "var(--bg3)", color: "var(--text)", fontSize: 14,
};

function Tabs({ tab, setTab }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {["payouts", "creators", "subscribers"].map(t => (
        <button key={t} onClick={() => setTab(t)} style={{
          padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border2)",
          background: tab === t ? "var(--violet-dim)" : "var(--bg3)",
          color: tab === t ? "var(--text)" : "var(--text2)", fontWeight: 700, fontSize: 13, cursor: "pointer",
          textTransform: "capitalize",
        }}>{t}</button>
      ))}
    </div>
  );
}

function Pager({ page, setPage, total, pageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, alignItems: "center" }}>
      <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={btnStyle("var(--text2)")}>Prev</button>
      <span style={{ color: "var(--text3)", fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
      <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={btnStyle("var(--text2)")}>Next</button>
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: color || "var(--text)", marginTop: 8, fontFamily: "var(--mono)" }}>{value}</div>
    </div>
  );
}

// ── Overview cards + breakdown ─────────────────────────────────────────────
function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/monetization/overview?days=30").then(setData).catch(() => {}); }, []);
  if (!data) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <Card label="GROSS (30D)" value={usd(data.gross_usd)} color="var(--green)" />
        <Card label="PLATFORM FEES (30D)" value={usd(data.platform_fee_usd)} color="var(--violet-lt)" />
        <Card label="TRANSACTIONS (30D)" value={data.transaction_count} />
        <Card label="PENDING PAYOUTS" value={usd(data.pending_payouts_usd)} color="var(--coral)" />
      </div>
      {data.by_type.length > 0 && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          {data.by_type.map(t => (
            <div key={t.type} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1px solid var(--border2)", fontSize: 13 }}>
              <span style={{ textTransform: "capitalize", color: "var(--text2)" }}>{t.type.replace(/_/g, " ")}</span>
              <span>{t.count} · {usd(t.gross_usd)} gross · {usd(t.platform_fee_usd)} fees</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payouts tab ─────────────────────────────────────────────────────────────
const PAYOUT_STATUS_COLORS = { pending: "var(--sky)", processing: "var(--violet-lt)", paid: "var(--green)", failed: "var(--coral)", cancelled: "var(--text3)" };

function PayoutsTab() {
  const toast = useToast();
  const [payouts, setPayouts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [failTarget, setFailTarget] = useState(null);
  const [failReason, setFailReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/monetization/payouts?page=${page}&page_size=${PAGE_SIZE}&status=${status}`)
      .then(({ payouts, total }) => { setPayouts(payouts); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, status]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const markPaid = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/admin/monetization/payouts/${id}/mark-paid`);
      toast("Payout marked paid");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  const markFailed = async () => {
    setBusyId(failTarget);
    try {
      await api.post(`/admin/monetization/payouts/${failTarget}/mark-failed`, { reason: failReason });
      toast("Payout marked failed");
      setFailTarget(null); setFailReason("");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={inputStyle}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {payouts.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{usd(p.amount_usd)} <span style={{ color: "var(--text3)", fontWeight: 500 }}>to @{p.creator.handle}</span></div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>
                    {new Date(p.period_start).toLocaleDateString()} – {new Date(p.period_end).toLocaleDateString()}
                    {p.failure_reason && <span style={{ color: "var(--coral)" }}> · {p.failure_reason}</span>}
                  </div>
                </div>
                <span style={{ color: PAYOUT_STATUS_COLORS[p.status] || "var(--text3)", fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>{p.status}</span>
                {p.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={busyId === p.id} onClick={() => markPaid(p.id)} style={btnStyle("var(--green)")}>Mark paid</button>
                    <button disabled={busyId === p.id} onClick={() => setFailTarget(p.id)} style={btnStyle("var(--coral)")}>Mark failed</button>
                  </div>
                )}
              </div>
            ))}
            {!payouts.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No payouts found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}

      {failTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: 360 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Mark payout failed</div>
            <textarea value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="Failure reason"
              style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 13.5, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => { setFailTarget(null); setFailReason(""); }} style={btnStyle("var(--text3)")}>Cancel</button>
              <button onClick={markFailed} style={btnStyle("var(--coral)")}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Creators tab ─────────────────────────────────────────────────────────────
function CreatorsTab() {
  const toast = useToast();
  const [creators, setCreators] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (q.trim()) params.set("q", q.trim());
    api.get(`/admin/monetization/creators?${params.toString()}`)
      .then(({ creators, total }) => { setCreators(creators); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, q]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={q} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Search handle…" style={{ ...inputStyle, flex: 1 }} />
      </div>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {creators.map(c => (
              <div key={c.user.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.user.display_name} <span style={{ color: "var(--text3)", fontWeight: 500 }}>@{c.user.handle}</span></div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>
                    {c.subscriber_count} subscribers · {c.stripe_onboarded ? "Stripe connected" : "Stripe not connected"} · payout {c.payout_schedule}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12.5 }}>
                  <div style={{ fontWeight: 700 }}>{usd(c.total_earned_usd)} earned</div>
                  <div style={{ color: "var(--text3)" }}>{usd(c.pending_balance_usd)} pending</div>
                </div>
              </div>
            ))}
            {!creators.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No creators found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}
    </>
  );
}

// ── Subscribers tab ──────────────────────────────────────────────────────────
function SubscribersTab() {
  const toast = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [plans, setPlans] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/monetization/subscribers?page=${page}&page_size=${PAGE_SIZE}&plan=${plan}&status=${status}`)
      .then(({ subscribers, total, plans }) => { setSubscribers(subscribers); setTotal(total); setPlans(plans || {}); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, plan, status]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select value={plan} onChange={e => { setPage(0); setPlan(e.target.value); }} style={inputStyle}>
          <option value="all">All plans</option>
          {Object.keys(plans).map(k => <option key={k} value={k}>{plans[k].name}</option>)}
        </select>
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={inputStyle}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {subscribers.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.user.display_name} <span style={{ color: "var(--text3)", fontWeight: 500 }}>@{s.user.handle}</span></div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>
                    {plans[s.plan]?.name || s.plan} · {usd(s.price_usd)}/{s.billing_period} · renews {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 12, textTransform: "capitalize", color: s.status === "active" ? "var(--green)" : "var(--text3)" }}>{s.status}</span>
              </div>
            ))}
            {!subscribers.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No subscribers found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}
    </>
  );
}

export default function AdminMonetization() {
  const [tab, setTab] = useState("payouts");
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Monetization</h1>
      <Overview />
      <Tabs tab={tab} setTab={setTab} />
      {tab === "payouts" && <PayoutsTab />}
      {tab === "creators" && <CreatorsTab />}
      {tab === "subscribers" && <SubscribersTab />}
    </div>
  );
}

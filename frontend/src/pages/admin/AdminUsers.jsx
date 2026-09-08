import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";

const PAGE_SIZE = 20;

function StatusBadge({ user }) {
  if (user.is_suspended) return <span style={{ color: "var(--coral)", fontWeight: 700, fontSize: 12 }}>Suspended</span>;
  if (user.is_deactivated) return <span style={{ color: "var(--text3)", fontWeight: 700, fontSize: 12 }}>Deactivated</span>;
  return <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 12 }}>Active</span>;
}

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [reasonFor, setReasonFor] = useState(null);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), status });
    if (q.trim()) params.set("q", q.trim());
    api.get(`/admin/users?${params.toString()}`)
      .then(({ users, total }) => { setUsers(users); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, status, q]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const act = async (id, action, body) => {
    setBusyId(id);
    try {
      await api.post(`/admin/users/${id}/${action}`, body);
      toast(`User ${action}d`);
      setReasonFor(null); setReason("");
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const inspect = async (id) => {
    setSelected(id); setDetail(null); setDetailLoading(true);
    try { setDetail(await api.get(`/admin/users/${id}`)); }
    catch (e) { toast(e.message, "error"); setSelected(null); }
    finally { setDetailLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Users</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          value={q} onChange={e => { setPage(0); setQ(e.target.value); }}
          placeholder="Search handle, email, or name…"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 14 }}
        />
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={{
          padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 14,
        }}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {users.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.display_name} <span style={{ color: "var(--text3)", fontWeight: 500 }}>@{u.handle}</span></div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>{u.email}</div>
                  {u.suspended_reason && <div style={{ color: "var(--coral)", fontSize: 11.5, marginTop: 2 }}>Reason: {u.suspended_reason}</div>}
                </div>
                <StatusBadge user={u} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => inspect(u.id)} style={btnStyle("var(--sky)")}>Inspect</button>
                  {!u.is_suspended ? (
                    <button disabled={busyId === u.id} onClick={() => setReasonFor(u.id)} style={btnStyle("var(--coral)")}>Suspend</button>
                  ) : (
                    <button disabled={busyId === u.id} onClick={() => act(u.id, "reinstate")} style={btnStyle("var(--green)")}>Reinstate</button>
                  )}
                  {!u.is_deactivated && (
                    <button disabled={busyId === u.id} onClick={() => act(u.id, "deactivate")} style={btnStyle("var(--text3)")}>Deactivate</button>
                  )}
                </div>
              </div>
            ))}
            {!users.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No users found</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, alignItems: "center" }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={btnStyle("var(--text2)")}>Prev</button>
            <span style={{ color: "var(--text3)", fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={btnStyle("var(--text2)")}>Next</button>
          </div>
        </>
      )}

      {reasonFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: 360 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Suspend user</div>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)"
              style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 13.5, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => { setReasonFor(null); setReason(""); }} style={btnStyle("var(--text3)")}>Cancel</button>
              <button onClick={() => act(reasonFor, "suspend", { reason })} style={btnStyle("var(--coral)")}>Confirm suspend</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <UserDetailModal detail={detail} loading={detailLoading} onClose={() => { setSelected(null); setDetail(null); }} />
      )}
    </div>
  );
}

function UserDetailModal({ detail, loading, onClose }) {
  const u = detail?.user;
  const person = (p) => <Link to={`/profile/${p.handle}`} style={{ color: "var(--sky)", textDecoration: "none" }}>@{p.handle}</Link>;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div><div style={{ fontSize: 19, fontWeight: 900 }}>User review</div><div style={{ color: "var(--text3)", fontSize: 12 }}>Account, access, content and activity</div></div>
          <button onClick={onClose} style={btnStyle("var(--text3)")}>Close</button>
        </div>
        {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><Spinner size={28} /></div> : u && <>
          <section style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><div style={{ fontWeight: 800, fontSize: 17 }}>{u.display_name} <span style={{ color: "var(--text3)", fontWeight: 500 }}>@{u.handle}</span></div><div style={{ color: "var(--text2)", fontSize: 13, marginTop: 3 }}>{u.email}</div></div>
              <Link to={`/profile/${u.handle}`} style={{ color: "var(--sky)", fontSize: 13 }}>Open public profile →</Link>
            </div>
            <div style={metricGrid}>{[["Vibes", u.vibes_count], ["Connections", u.connections_count], ["Following", u.following_count], ["Spaces", u.spaces_hosted], ["Reports", detail.moderation.reports_involved]].map(([k, v]) => <div key={k}><div style={metricLabel}>{k}</div><div style={{ fontWeight: 800 }}>{v}</div></div>)}</div>
            <div style={detailText}><b>Verification:</b> {u.verification_tier} · <b>2FA:</b> {u.two_factor_enabled ? "enabled" : "off"} · <b>Provider:</b> {u.provider} · <b>Plan:</b> {u.subscription_plan}</div>
            <div style={detailText}><b>Status:</b> {u.is_suspended ? `Suspended — ${u.suspended_reason || "no reason recorded"}` : u.is_deactivated ? "Deactivated" : "Active"} · <b>Last seen:</b> {u.last_seen ? new Date(u.last_seen).toLocaleString() : "Never"}</div>
          </section>
          <section style={sectionStyle}><SectionTitle title="Roles and permissions" /><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{detail.access.roles.map(r => <span key={r.name} style={pillStyle}>{r.name}</span>)}</div><div style={{ color: "var(--text3)", fontSize: 12, marginTop: 9 }}>{detail.access.permissions.join(" · ") || "No effective permissions"}</div></section>
          <section style={sectionStyle}><SectionTitle title={`Recent vibes (${detail.content.vibes.length})`} />{detail.content.vibes.map(v => <div key={v.id} style={rowStyle}><a href={`/admin/content?vibe=${v.id}`} style={{ color: "var(--text)", textDecoration: "none", flex: 1 }}>{v.content.slice(0, 180) || "Media-only vibe"}</a><span style={{ color: "var(--text3)", fontSize: 11 }}>{v.likesCount} likes · {v.repliesCount} replies</span></div>)}{!detail.content.vibes.length && <EmptyLine text="No vibes published" />}</section>
          <section style={sectionStyle}><SectionTitle title={`Connections (${detail.connections.following.length} following · ${detail.connections.followers.length} followers)`} /><div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13 }}><div><b>Following:</b> {detail.connections.following.map(x => <span key={x.user.id} style={{ marginLeft: 6 }}>{person(x.user)}</span>) || " —"}</div><div><b>Followers:</b> {detail.connections.followers.map(x => <span key={x.user.id} style={{ marginLeft: 6 }}>{person(x.user)}</span>) || " —"}</div></div></section>
          <section style={sectionStyle}><SectionTitle title="Recent account activity" />{detail.activity.map(a => <div key={a.id} style={rowStyle}><span><b>{a.action}</b>{a.entity_type && ` · ${a.entity_type}`}{a.entity_id && <a href={a.entity_type === "vibe" ? `/admin/content?vibe=${a.entity_id}` : "#"} style={{ color: "var(--sky)", marginLeft: 6 }}>Open record</a>}</span><span style={{ color: "var(--text3)", fontSize: 11 }}>{new Date(a.created_at).toLocaleString()}</span></div>)}{!detail.activity.length && <EmptyLine text="No activity events recorded yet" />}</section>
        </>}
      </div>
    </div>
  );
}

function SectionTitle({ title }) { return <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{title}</div>; }
function EmptyLine({ text }) { return <div style={{ color: "var(--text3)", fontSize: 13 }}>{text}</div>; }
const overlayStyle = { position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.62)", display: "flex", justifyContent: "flex-end" };
const modalStyle = { width: "min(760px, 100%)", height: "100%", overflowY: "auto", background: "var(--bg1)", borderLeft: "1px solid var(--border)", padding: "28px 24px 48px" };
const sectionStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 14 };
const metricGrid = { display: "grid", gridTemplateColumns: "repeat(5, minmax(70px, 1fr))", gap: 10, marginTop: 15 };
const metricLabel = { color: "var(--text3)", fontSize: 10.5, textTransform: "uppercase", marginBottom: 3 };
const detailText = { color: "var(--text2)", fontSize: 12.5, marginTop: 8, lineHeight: 1.5 };
const pillStyle = { color: "var(--violet-lt)", background: "var(--violet-dim)", borderRadius: 999, padding: "4px 8px", fontSize: 11.5, fontWeight: 700 };
const rowStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid var(--border2)", fontSize: 12.5 };

function btnStyle(color) {
  return {
    background: "none", border: `1px solid ${color}`, color, fontWeight: 700, fontSize: 12.5,
    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
  };
}

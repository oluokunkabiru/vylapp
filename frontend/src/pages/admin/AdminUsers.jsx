import { useState, useEffect, useCallback } from "react";
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
    </div>
  );
}

function btnStyle(color) {
  return {
    background: "none", border: `1px solid ${color}`, color, fontWeight: 700, fontSize: 12.5,
    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
  };
}

import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";
import { humanizeIdentifier } from "../../lib/format.js";

export default function AdminModeration() {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("pending");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // A-13: resolve/remove_content are destructive — the backend now 400s
  // without a reason, so the UI collects one instead of discovering that
  // via a failed request.
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/moderation/queue?status=${status}&page_size=50`)
      .then(({ reports }) => { setReports(reports); setSelected(new Set()); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [status]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setSelected(s => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const bulk = async (action) => {
    if (!selected.size) return;
    if (action !== "dismiss" && !reason.trim()) {
      toast("A reason is required for resolve/remove content", "error");
      return;
    }
    setBusy(true);
    try {
      await api.post("/admin/moderation/bulk-action", { reportIds: [...selected], action, reason: reason.trim() || undefined });
      toast(`${selected.size} report(s) ${action === "remove_content" ? "removed" : action + "d"}`);
      setReason("");
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Moderation Queue</h1>

      {/* flex-wrap: this toolbar is the main thing an on-call moderator opens
          from a phone (A-08) — narrow viewports stack instead of clipping. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{
          padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 14,
        }}>
          <option value="pending">Pending</option>
          <option value="resolved_action">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>

        {selected.size > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginLeft: "auto", alignItems: "center" }}>
            <span style={{ color: "var(--text3)", fontSize: 13 }}>{selected.size} selected</span>
            <input
              type="text"
              placeholder="Reason (required for resolve/remove)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 13, minWidth: 220 }}
            />
            <button disabled={busy} onClick={() => bulk("dismiss")} style={btnStyle("var(--text3)")}>Dismiss</button>
            <button disabled={busy || !reason.trim()} onClick={() => bulk("resolve")} style={btnStyle("var(--sky)")}>Resolve</button>
            <button disabled={busy || !reason.trim()} onClick={() => bulk("remove_content")} style={btnStyle("var(--coral)")}>Remove content</button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          {reports.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} style={{ marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span title={r.reason} style={{ fontWeight: 700, fontSize: 13.5 }}>{humanizeIdentifier(r.reason)}</span>
                  {/* A-07: age visibility — a minor-authored target is the
                      one thing that should never get buried in the queue. */}
                  {r.targetIsMinor && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--coral)", border: "1px solid var(--coral)", borderRadius: 6, padding: "1px 6px" }}>MINOR</span>
                  )}
                  {/* A-06: same target reported more than once — a real
                      priority signal, not just chronological order. */}
                  {r.similarReportCount > 1 && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text3)", border: "1px solid var(--border2)", borderRadius: 6, padding: "1px 6px" }}>×{r.similarReportCount} reports</span>
                  )}
                </div>
                {r.detail && <div style={{ color: "var(--text2)", fontSize: 12.5, marginTop: 2 }}>{r.detail}</div>}
                <div style={{ color: "var(--text3)", fontSize: 11.5, marginTop: 4 }}>
                  {r.reportedVibeId && "Targets a vibe"} {r.reportedUserId && "Targets a user"} {r.reportedSpaceId && "Targets a Space"} {r.reportedMessageId && "Targets a message"}
                  {" · "}{new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {!reports.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No reports in this queue</div>}
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

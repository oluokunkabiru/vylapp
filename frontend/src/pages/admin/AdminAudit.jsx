import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";

const PAGE_SIZE = 30;

export default function AdminAudit() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/audit?page=${page}&page_size=${PAGE_SIZE}`)
      .then(({ entries, total }) => { setEntries(entries); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Audit Log</h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {entries.map(e => (
              <div key={e.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, fontFamily: "var(--mono)" }}>{e.action}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text3)" }}>{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 4 }}>
                  by @{e.admin.handle} ({e.admin.display_name})
                  {e.target_type && ` · target: ${e.target_type}${e.target_id ? ` #${e.target_id.slice(0, 8)}` : ""}`}
                </div>
              </div>
            ))}
            {!entries.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No audit entries yet</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, alignItems: "center" }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={btnStyle}>Prev</button>
            <span style={{ color: "var(--text3)", fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={btnStyle}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}

const btnStyle = {
  background: "none", border: "1px solid var(--text2)", color: "var(--text2)", fontWeight: 700, fontSize: 12.5,
  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
};

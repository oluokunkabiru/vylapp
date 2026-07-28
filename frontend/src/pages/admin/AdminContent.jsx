import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";

const PAGE_SIZE = 20;

function btnStyle(color) {
  return {
    background: "none", border: `1px solid ${color}`, color, fontWeight: 700, fontSize: 12.5,
    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
  };
}

function Tabs({ tab, setTab }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {["vibes", "spaces"].map(t => (
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

const inputStyle = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border2)",
  background: "var(--bg3)", color: "var(--text)", fontSize: 14,
};

// ── Vibes tab ──────────────────────────────────────────────────────────────
function VibesTab() {
  const toast = useToast();
  const [vibes, setVibes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), status });
    if (q.trim()) params.set("q", q.trim());
    if (author.trim()) params.set("author", author.trim());
    api.get(`/admin/content/vibes?${params.toString()}`)
      .then(({ vibes, total }) => { setVibes(vibes); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, status, q, author]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    setBusyId(removeTarget);
    try {
      await api.post(`/admin/content/vibes/${removeTarget}/remove`, { reason });
      toast("Vibe removed");
      setRemoveTarget(null); setReason("");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  const restore = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/admin/content/vibes/${id}/restore`);
      toast("Vibe restored");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={q} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Search content…" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <input value={author} onChange={e => { setPage(0); setAuthor(e.target.value); }} placeholder="Author handle…" style={{ ...inputStyle, width: 180 }} />
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={inputStyle}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="deleted">Removed</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {vibes.map(v => (
              <div key={v.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text3)", marginBottom: 4 }}>
                    @{v.author.handle} · {v.category} · {new Date(v.created_at).toLocaleString()}
                    {v.is_deleted && <span style={{ color: "var(--coral)", fontWeight: 700 }}> · removed</span>}
                  </div>
                  <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{v.content}</div>
                  <div style={{ color: "var(--text3)", fontSize: 11.5, marginTop: 6 }}>
                    {v.likes_count} likes · {v.reposts_count} reposts · {v.replies_count} replies · {v.views_count} views
                  </div>
                  {v.moderation_note && <div style={{ color: "var(--coral)", fontSize: 11.5, marginTop: 4 }}>Note: {v.moderation_note}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {!v.is_deleted ? (
                    <button disabled={busyId === v.id} onClick={() => setRemoveTarget(v.id)} style={btnStyle("var(--coral)")}>Remove</button>
                  ) : (
                    <button disabled={busyId === v.id} onClick={() => restore(v.id)} style={btnStyle("var(--green)")}>Restore</button>
                  )}
                </div>
              </div>
            ))}
            {!vibes.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No vibes found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}

      {removeTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: 360 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Remove vibe</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)"
              style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontSize: 13.5, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => { setRemoveTarget(null); setReason(""); }} style={btnStyle("var(--text3)")}>Cancel</button>
              <button onClick={remove} style={btnStyle("var(--coral)")}>Confirm remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Spaces tab ─────────────────────────────────────────────────────────────
function StatusBadge({ status, colorMap }) {
  const color = colorMap[status] || "var(--text3)";
  return <span style={{ color, fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>{status}</span>;
}

const SPACE_STATUS_COLORS = { live: "var(--green)", scheduled: "var(--sky)", ended: "var(--text3)", cancelled: "var(--coral)" };

function SpacesTab() {
  const toast = useToast();
  const [spaces, setSpaces] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [participantsFor, setParticipantsFor] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), status });
    if (q.trim()) params.set("q", q.trim());
    api.get(`/admin/content/spaces?${params.toString()}`)
      .then(({ spaces, total }) => { setSpaces(spaces); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, status, q]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const forceEnd = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/admin/content/spaces/${id}/end`);
      toast("Space ended");
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  const viewParticipants = async (id) => {
    setParticipantsFor(id);
    setParticipantsLoading(true);
    try {
      const { participants } = await api.get(`/admin/content/spaces/${id}/participants`);
      setParticipants(participants);
    } catch (e) { toast(e.message, "error"); } finally { setParticipantsLoading(false); }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={q} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Search title or host…" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={inputStyle}>
          <option value="all">All</option>
          <option value="live">Live</option>
          <option value="scheduled">Scheduled</option>
          <option value="ended">Ended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {spaces.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>
                    hosted by @{s.host.handle} · {s.listeners_count} listeners (peak {s.peak_listeners})
                    {s.total_tips_usd > 0 && ` · $${Number(s.total_tips_usd).toFixed(2)} tips`}
                  </div>
                </div>
                <StatusBadge status={s.status} colorMap={SPACE_STATUS_COLORS} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => viewParticipants(s.id)} style={btnStyle("var(--sky)")}>Participants</button>
                  {s.status === "live" && (
                    <button disabled={busyId === s.id} onClick={() => forceEnd(s.id)} style={btnStyle("var(--coral)")}>End now</button>
                  )}
                </div>
              </div>
            ))}
            {!spaces.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No Spaces found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}

      {participantsFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setParticipantsFor(null)}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: 400, maxHeight: "70vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Active participants</div>
            {participantsLoading ? <Spinner size={24} /> : (
              <>
                {participants.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border2)" }}>
                    <span style={{ fontSize: 13 }}>@{p.user.handle} <span style={{ color: "var(--text3)" }}>({p.role})</span></span>
                    <span style={{ color: "var(--text3)", fontSize: 12 }}>{new Date(p.joined_at).toLocaleTimeString()}</span>
                  </div>
                ))}
                {!participants.length && <div style={{ color: "var(--text3)", textAlign: "center", padding: "20px 0" }}>No active participants</div>}
              </>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setParticipantsFor(null)} style={btnStyle("var(--text2)")}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminContent() {
  const [tab, setTab] = useState("vibes");
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Content</h1>
      <Tabs tab={tab} setTab={setTab} />
      {tab === "vibes" ? <VibesTab /> : <SpacesTab />}
    </div>
  );
}

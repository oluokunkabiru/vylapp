import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner } from "../../components/ui/index.jsx";
import { humanizeIdentifier } from "../../lib/format.js";
import AdminUserLink from "./AdminUserLink.jsx";

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
  const navigate = useNavigate();
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

  const inspect = (id) => navigate(`/admin/content/vibes/${id}`);

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
                    <AdminUserLink handle={v.author.handle} /> · {humanizeIdentifier(v.category)} · {new Date(v.created_at).toLocaleString()}
                    {v.is_deleted && <span style={{ color: "var(--coral)", fontWeight: 700 }}> · removed</span>}
                  </div>
                  <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{v.content}</div>
                  <button onClick={() => inspect(v.id)} style={{ color: "var(--text3)", fontSize: 11.5, marginTop: 6, padding: 0, border: 0, background: "none", cursor: "pointer" }}>
                    {v.likes_count} likes · {v.reposts_count} reposts · {v.replies_count} replies · {v.views_count} views · view activity →
                  </button>
                  {v.moderation_note && <div style={{ color: "var(--coral)", fontSize: 11.5, marginTop: 4 }}>Note: {v.moderation_note}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => inspect(v.id)} style={btnStyle("var(--sky)")}>Inspect</button>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto", boxSizing: "border-box" }}>
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

function Actor({ actor }) {
  return actor ? <AdminUserLink handle={actor.handle} /> : <span style={{ color: "var(--text3)" }}>Anonymous</span>;
}

function VibeDetailModal({ detail, loading, onClose, fullPage = false }) {
  const vibe = detail?.vibe;
  const groups = detail ? [
    ["Likes", detail.engagement.likes], ["Reshares", detail.engagement.reposts], ["Bookmarks", detail.engagement.bookmarks], ["Views", detail.engagement.views],
  ] : [];
  return (
    <div style={fullPage ? detailPageShellStyle : overlayStyle} onClick={fullPage ? undefined : onClose}>
      <div style={fullPage ? detailPageStyle : modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 18 }}><div><div style={{ fontWeight: 900, fontSize: 19 }}>Content review</div><div style={{ color: "var(--text3)", fontSize: 12 }}>Post, comments and attributable engagement</div></div><button onClick={onClose} style={btnStyle("var(--text3)")}>{fullPage ? "← Back to content" : "Close"}</button></div>
        {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><Spinner size={28} /></div> : vibe && <>
          <section style={sectionStyle}>
            <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 8 }}><Actor actor={vibe.author} /> · {humanizeIdentifier(vibe.category)} · {new Date(vibe.created_at).toLocaleString()}</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{vibe.content || "Media-only vibe"}</div>
            <AudienceControl vibe={vibe} onUpdated={next => { detail.vibe = { ...vibe, ...next }; }} />
            <div style={metricGrid}>{Object.entries(detail.engagement.totals).map(([k, value]) => <Link key={k} to={`/admin/content/vibes/${vibe.id}/analytics/${k}`} style={{ color: "var(--text)", textDecoration: "none", borderRadius: 10, padding: 8, background: "var(--bg3)" }}><div style={metricLabel}>{humanizeIdentifier(k)}</div><div style={{ fontWeight: 800 }}>{value}</div><div style={{ color: "var(--sky)", fontSize: 10, marginTop: 3 }}>Analyse →</div></Link>)}</div>
          </section>
          <section style={sectionStyle}><SectionTitle title={`Comments / replies (${detail.engagement.replies.length})`} />{detail.engagement.replies.map(reply => <div key={reply.id} style={rowStyle}><div><Actor actor={reply.actor} /> <Link to={`/admin/content/vibes/${reply.id}`} style={{ color: "var(--text)", textDecoration: "none", marginLeft: 6 }}>{reply.content || "Media-only reply"}</Link></div><span style={{ color: "var(--text3)", fontSize: 11 }}>{new Date(reply.created_at).toLocaleString()}</span></div>)}{!detail.engagement.replies.length && <EmptyLine text="No replies" />}</section>
          <section style={sectionStyle}><SectionTitle title={`Quoted posts (${detail.engagement.quotes.length})`} />{detail.engagement.quotes.map(quote => <div key={quote.id} style={rowStyle}><div><Actor actor={quote.actor} /> <Link to={`/admin/content/vibes/${quote.id}`} style={{ color: "var(--text)", textDecoration: "none", marginLeft: 6 }}>{quote.content || "Media-only quote"}</Link></div><span style={{ color: "var(--text3)", fontSize: 11 }}>{new Date(quote.created_at).toLocaleString()}</span></div>)}{!detail.engagement.quotes.length && <EmptyLine text="No quote posts" />}</section>
            {groups.map(([title, events]) => <section key={title} style={sectionStyle}><SectionTitle title={`${title} (${events.length})`} />{events.map((event, index) => <div key={`${event.created_at}-${index}`} style={rowStyle}><span><Actor actor={event.actor} />{event.source && <span style={{ color: "var(--text3)" }}> · {event.source}</span>}</span><span style={{ color: "var(--text3)", fontSize: 11 }}>{new Date(event.created_at).toLocaleString()}</span></div>)}{!events.length && <EmptyLine text={`No ${title.toLowerCase()} recorded`} />}</section>)}
        </>}
      </div>
    </div>
  );
}

function AudienceControl({ vibe, onUpdated }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [audience, setAudience] = useState(vibe.content_audience || "general");
  const [sensitive, setSensitive] = useState(!!vibe.is_sensitive);
  const save = async () => {
    setBusy(true);
    try {
      const { vibe: updated } = await api.patch(`/admin/content/vibes/${vibe.id}/audience`, { audience, sensitive });
      onUpdated(updated);
      toast("Age-safety policy updated");
    } catch (error) { toast(error.message, "error"); } finally { setBusy(false); }
  };
  return <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border2)" }}>
    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Age-safety controls</div>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select value={audience} onChange={event => setAudience(event.target.value)} style={{ ...inputStyle, padding: "7px 10px" }}>
        <option value="kids">Kids</option><option value="general">General</option><option value="adult">Adults only</option>
      </select>
      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--text2)", fontSize: 12.5 }}><input type="checkbox" checked={sensitive} onChange={event => setSensitive(event.target.checked)} /> Sensitive / flagged</label>
      <button disabled={busy} onClick={save} style={btnStyle("var(--violet-lt)")}>{busy ? "Saving…" : "Save policy"}</button>
    </div>
    <div style={{ color: "var(--text3)", fontSize: 11.5, marginTop: 7 }}>This controls what child and teen accounts can receive. Every change is audited.</div>
  </div>;
}

function AdminVibeDetail() {
  const { vibeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/content/vibes/${vibeId}`).then(setDetail).catch(e => toast(e.message, "error")).finally(() => setLoading(false));
  }, [vibeId]); // eslint-disable-line

  return <VibeDetailModal detail={detail} loading={loading} fullPage onClose={() => navigate("/admin/content")} />;
}

function AdminVibeAnalytics() {
  const { vibeId, metric } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const supported = ["likes", "reposts", "bookmarks", "views", "anonymous_views", "replies", "quotes"];

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/content/vibes/${vibeId}`).then(setDetail).catch(e => toast(e.message, "error")).finally(() => setLoading(false));
  }, [vibeId]); // eslint-disable-line

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spinner size={32} /></div>;
  if (!detail || !supported.includes(metric)) return <div style={{ padding: "28px 32px" }}>This engagement metric is unavailable.</div>;
  const events = metric === "anonymous_views" ? (detail.engagement.views || []).filter(event => !event.actor) : (detail.engagement[metric] || []);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const series = dates.map(date => {
    const key = date.toISOString().slice(0, 10);
    return { label: date.toLocaleDateString(undefined, { weekday: "short" }), count: events.filter(event => event.created_at && new Date(event.created_at).toISOString().slice(0, 10) === key).length };
  });
  const peak = Math.max(1, ...series.map(point => point.count));

  return <div style={{ padding: "28px 32px 60px", maxWidth: 1160, margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 22 }}><div><div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 6 }}>Content engagement analysis</div><h1 style={{ margin: 0, fontSize: 25, fontWeight: 900 }}>{humanizeIdentifier(metric)}</h1><div style={{ color: "var(--text2)", marginTop: 7 }}>{events.length} recorded {humanizeIdentifier(metric).toLowerCase()} for this post</div></div><button onClick={() => navigate(`/admin/content/vibes/${vibeId}`)} style={btnStyle("var(--text2)")}>← Back to post</button></div>
    <section style={{ ...sectionStyle, marginBottom: 18 }}><div style={{ fontWeight: 800, marginBottom: 5 }}>Activity over the last 7 days</div><div style={{ color: "var(--text3)", fontSize: 12 }}>Each bar is an attributable engagement recorded on that day.</div><div style={{ height: 210, display: "flex", gap: 12, alignItems: "flex-end", paddingTop: 22 }}>{series.map(point => <div key={point.label} style={{ flex: 1, minWidth: 38, textAlign: "center", height: "100%", display: "flex", justifyContent: "flex-end", flexDirection: "column", gap: 7 }}><div style={{ fontSize: 12, fontWeight: 800 }}>{point.count}</div><div title={`${point.label}: ${point.count}`} style={{ height: `${Math.max(point.count ? 8 : 2, (point.count / peak) * 150)}px`, borderRadius: "8px 8px 2px 2px", background: "linear-gradient(180deg, var(--violet-lt), var(--violet))" }} /><div style={{ color: "var(--text3)", fontSize: 11 }}>{point.label}</div></div>)}</div></section>
    <section style={sectionStyle}><div style={{ fontWeight: 800, marginBottom: 5 }}>People and records</div><div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12 }}>Latest {events.length} events available to this review.</div>{events.map((event, index) => <div key={`${event.created_at}-${index}`} style={rowStyle}><span><Actor actor={event.actor} />{event.content && <Link to={`/admin/content/vibes/${event.id}`} style={{ color: "var(--text)", textDecoration: "none", marginLeft: 7 }}>{event.content}</Link>}{event.source && <span style={{ color: "var(--text3)" }}> · {event.source}</span>}</span><span style={{ color: "var(--text3)", fontSize: 11 }}>{event.created_at ? new Date(event.created_at).toLocaleString() : "—"}</span></div>)}{!events.length && <EmptyLine text={`No ${humanizeIdentifier(metric).toLowerCase()} recorded yet`} />}</section>
  </div>;
}

function SectionTitle({ title }) { return <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{title}</div>; }
function EmptyLine({ text }) { return <div style={{ color: "var(--text3)", fontSize: 13 }}>{text}</div>; }
const overlayStyle = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.62)", display: "flex", justifyContent: "flex-end", overflowY: "auto" };
const modalStyle = { width: "min(760px, 100%)", minHeight: "100dvh", overflowY: "auto", background: "var(--bg1)", borderLeft: "1px solid var(--border)", padding: "28px 24px 48px", boxSizing: "border-box" };
const detailPageShellStyle = { padding: "28px 32px 60px", minHeight: "100vh", boxSizing: "border-box" };
const detailPageStyle = { width: "min(1100px, 100%)", margin: "0 auto", background: "var(--bg1)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 24px 48px", boxSizing: "border-box" };
const sectionStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 14 };
const metricGrid = { display: "grid", gridTemplateColumns: "repeat(4, minmax(70px, 1fr))", gap: 10, marginTop: 15 };
const metricLabel = { color: "var(--text3)", fontSize: 10.5, textTransform: "uppercase", marginBottom: 3 };
const rowStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid var(--border2)", fontSize: 12.5 };

// ── Spaces tab ─────────────────────────────────────────────────────────────
function StatusBadge({ status, colorMap }) {
  const color = colorMap[status] || "var(--text3)";
  return <span title={status} style={{ color, fontWeight: 700, fontSize: 12 }}>{humanizeIdentifier(status)}</span>;
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
                    hosted by <AdminUserLink handle={s.host.handle} /> · <button onClick={() => viewParticipants(s.id)} style={{ color: "var(--sky)", font: "inherit", padding: 0, border: 0, background: "none", cursor: "pointer" }}>{s.listeners_count} listeners</button> (peak {s.peak_listeners})
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto", boxSizing: "border-box" }}
          onClick={() => setParticipantsFor(null)}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: 400, maxHeight: "70vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Active participants</div>
            {participantsLoading ? <Spinner size={24} /> : (
              <>
                {participants.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border2)" }}>
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><AdminUserLink handle={p.user.handle} /><span title={p.role} style={{ color: "var(--text3)" }}>({humanizeIdentifier(p.role)})</span></span>
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
  const { vibeId, metric } = useParams();
  const [tab, setTab] = useState("vibes");
  if (vibeId && metric) return <AdminVibeAnalytics />;
  if (vibeId) return <AdminVibeDetail />;
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Content</h1>
      <Tabs tab={tab} setTab={setTab} />
      {tab === "vibes" ? <VibesTab /> : <SpacesTab />}
    </div>
  );
}

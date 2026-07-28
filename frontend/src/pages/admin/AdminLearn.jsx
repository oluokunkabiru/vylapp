import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Spinner, numFmt } from "../../components/ui/index.jsx";

const PAGE_SIZE = 20;

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
      {["courses", "educators"].map(t => (
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

function StatCard({ label, value }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, fontFamily: "var(--mono)" }}>{value}</div>
    </div>
  );
}

const COURSE_STATUS_COLORS = { draft: "var(--text3)", pending_review: "var(--sky)", published: "var(--green)", archived: "var(--coral)" };

// ── Courses tab ────────────────────────────────────────────────────────────
function CoursesTab() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { api.get("/admin/learn/stats").then(setStats).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), status });
    if (q.trim()) params.set("q", q.trim());
    api.get(`/admin/learn/courses?${params.toString()}`)
      .then(({ courses, total }) => { setCourses(courses); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, status, q]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const act = async (id, endpoint, label) => {
    setBusyId(id);
    try {
      await api.post(`/admin/learn/courses/${id}/${endpoint}`);
      toast(label);
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  return (
    <>
      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <StatCard label="EDUCATORS" value={numFmt(stats.educators)} />
          <StatCard label="ENROLMENTS" value={numFmt(stats.enrolments)} />
          <StatCard label="COMPLETIONS" value={numFmt(stats.completions)} />
          <StatCard label="PUBLISHED" value={numFmt(stats.by_status?.published || 0)} />
          <StatCard label="PENDING REVIEW" value={numFmt(stats.by_status?.pending_review || 0)} />
          <StatCard label="DRAFTS" value={numFmt(stats.by_status?.draft || 0)} />
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={q} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Search title or educator handle…" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={inputStyle}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {courses.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>
                    by @{c.educator.handle} · {c.category} · {c.is_free ? "Free" : `$${Number(c.price_usd).toFixed(2)}`}
                    · {c.enrolment_count} enrolled · {Number(c.avg_rating).toFixed(1)}★
                  </div>
                </div>
                <span style={{ color: COURSE_STATUS_COLORS[c.status] || "var(--text3)", fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>{c.status.replace("_", " ")}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {c.status !== "published" && (
                    <button disabled={busyId === c.id} onClick={() => act(c.id, "publish", "Course published")} style={btnStyle("var(--green)")}>Publish</button>
                  )}
                  {c.status === "published" && (
                    <button disabled={busyId === c.id} onClick={() => act(c.id, "unpublish", "Course unpublished")} style={btnStyle("var(--text3)")}>Unpublish</button>
                  )}
                </div>
              </div>
            ))}
            {!courses.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No courses found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}
    </>
  );
}

// ── Educators tab ──────────────────────────────────────────────────────────
const EDUCATOR_STATUS_COLORS = { pending: "var(--sky)", community: "var(--text2)", verified: "var(--green)", suspended: "var(--coral)" };

function EducatorsTab() {
  const toast = useToast();
  const [educators, setEducators] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), status });
    if (q.trim()) params.set("q", q.trim());
    api.get(`/admin/learn/educators?${params.toString()}`)
      .then(({ educators, total }) => { setEducators(educators); setTotal(total); })
      .catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, status, q]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const act = async (id, endpoint, label) => {
    setBusyId(id);
    try {
      await api.post(`/admin/learn/educators/${id}/${endpoint}`);
      toast(label);
      load();
    } catch (e) { toast(e.message, "error"); } finally { setBusyId(null); }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={q} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Search handle…" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
        <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} style={inputStyle}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="community">Community</option>
          <option value="verified">Verified</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
      ) : (
        <>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {educators.map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.user.display_name} <span style={{ color: "var(--text3)", fontWeight: 500 }}>@{e.user.handle}</span></div>
                  <div style={{ color: "var(--text3)", fontSize: 12.5 }}>
                    {e.subjects?.join(", ") || "no subjects"} · {e.total_students} students · {e.total_courses} courses · {Number(e.avg_rating).toFixed(1)}★
                  </div>
                </div>
                <span style={{ color: EDUCATOR_STATUS_COLORS[e.status] || "var(--text3)", fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>{e.status}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {e.status !== "verified" && (
                    <button disabled={busyId === e.id} onClick={() => act(e.id, "verify", "Educator verified")} style={btnStyle("var(--green)")}>Verify</button>
                  )}
                  {e.status !== "suspended" ? (
                    <button disabled={busyId === e.id} onClick={() => act(e.id, "suspend", "Educator suspended")} style={btnStyle("var(--coral)")}>Suspend</button>
                  ) : (
                    <button disabled={busyId === e.id} onClick={() => act(e.id, "reinstate", "Educator reinstated")} style={btnStyle("var(--sky)")}>Reinstate</button>
                  )}
                </div>
              </div>
            ))}
            {!educators.length && <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>No educators found</div>}
          </div>
          <Pager page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
        </>
      )}
    </>
  );
}

export default function AdminLearn() {
  const [tab, setTab] = useState("courses");
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 20px" }}>Learn</h1>
      <Tabs tab={tab} setTab={setTab} />
      {tab === "courses" ? <CoursesTab /> : <EducatorsTab />}
    </div>
  );
}

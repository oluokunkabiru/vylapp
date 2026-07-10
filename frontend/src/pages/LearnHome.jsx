import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, CategoryPill, Spinner, Empty, PrimaryButton, GhostButton, numFmt } from "../components/ui/index.jsx";

const CATS = [
  { key:"", label:"All" },
  { key:"TECH_VIBES", label:"Tech Vibes" },
  { key:"GLOBAL_CONNECT", label:"Global Connect" },
  { key:"CREATIVE_LEARN", label:"Creative Learn" },
  { key:"HUMAN_POTENTIAL", label:"Human Potential" },
];
const DIFFICULTIES = [
  { key:"", label:"Any level" },
  { key:"beginner", label:"Beginner" },
  { key:"intermediate", label:"Intermediate" },
  { key:"advanced", label:"Advanced" },
];
const CAT_GRADS = {
  TECH_VIBES:      "linear-gradient(135deg,#38BDF8,#7C3AED)",
  GLOBAL_CONNECT:  "linear-gradient(135deg,#10F5A0,#2DD4BF)",
  CREATIVE_LEARN:  "linear-gradient(135deg,#FFB830,#FF6B6B)",
  HUMAN_POTENTIAL: "linear-gradient(135deg,#A78BFA,#7C3AED)",
  GENERAL:         "linear-gradient(135deg,#7C3AED,#2DD4BF)",
};

function CourseCard({ course }) {
  const grad = CAT_GRADS[course.category] || CAT_GRADS.GENERAL;
  return (
    <Link to={`/learn/courses/${course.id}`} style={{ textDecoration:"none", color:"inherit" }}>
      <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:18, overflow:"hidden", marginBottom:14 }}>
        <div style={{
          height:110, background: course.cover_image_url ? `url(${course.cover_image_url}) center/cover` : grad,
          display:"flex", alignItems:"flex-end", padding:12,
        }}>
          <CategoryPill category={course.category} />
        </div>
        <div style={{ padding:14 }}>
          <div style={{ fontWeight:800, fontSize:15.5, lineHeight:1.35, marginBottom:6 }}>{course.title}</div>
          <div style={{ color:"var(--text2)", fontSize:13, marginBottom:10 }}>
            by {course.educator_name || course.educator_handle}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:"var(--text3)", textTransform:"capitalize" }}>{course.difficulty}</span>
            <span style={{ color:"var(--text3)" }}>·</span>
            <span style={{ fontSize:12, color:"var(--text3)" }}>{course.total_lessons} lessons</span>
            {course.avg_rating > 0 && (
              <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:12, color:"var(--amber)", fontWeight:700 }}>
                <Ic d={ic.star} s={12} c="var(--amber)" f="var(--amber)" /> {Number(course.avg_rating).toFixed(1)}
              </span>
            )}
            <div style={{ flex:1 }} />
            <span style={{ fontSize:13, fontWeight:800, color: course.is_free ? "var(--green)" : "var(--text)" }}>
              {course.is_free ? "Free" : `$${course.price_usd}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EnrolmentCard({ enrolment }) {
  return (
    <Link to={`/learn/courses/${enrolment.course_id}`} style={{ textDecoration:"none", color:"inherit" }}>
      <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:16, padding:16, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div style={{ fontWeight:800, fontSize:15, lineHeight:1.35, flex:1, paddingRight:10 }}>{enrolment.title}</div>
          <span style={{ fontSize:12.5, fontWeight:800, color: enrolment.status === "completed" ? "var(--green)" : "var(--violet-lt)" }}>
            {enrolment.progress_pct}%
          </span>
        </div>
        <div style={{ height:6, borderRadius:3, background:"var(--bg4)", overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${enrolment.progress_pct}%`,
            background: enrolment.status === "completed" ? "var(--green)" : "var(--grad)",
          }} />
        </div>
        <div style={{ color:"var(--text3)", fontSize:12, marginTop:8 }}>
          {enrolment.lessons_done} of {enrolment.total_lessons} lessons done
        </div>
      </div>
    </Link>
  );
}

export default function LearnHome() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("discover"); // discover | mine
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const [enrolments, setEnrolments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [mineLoading, setMineLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ bio:"", subjects:"" });
  const debounce = useRef(null);

  const loadCourses = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cat) params.set("category", cat);
    if (difficulty) params.set("difficulty", difficulty);
    api.get(`/learn/courses?${params.toString()}`)
      .then(({ courses: c }) => setCourses(c || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(loadCourses, 250);
    return () => clearTimeout(debounce.current);
  }, [q, cat, difficulty]);

  const loadMine = () => {
    if (!user) return;
    setMineLoading(true);
    Promise.all([
      api.get("/learn/me/enrolments").then(({ enrolments: e }) => setEnrolments(e || [])).catch(() => {}),
      api.get("/learn/me/certificates").then(({ certificates: c }) => setCertificates(c || [])).catch(() => {}),
    ]).finally(() => setMineLoading(false));
  };
  useEffect(() => { if (tab === "mine") loadMine(); }, [tab, user]);

  const submitApply = async e => {
    e.preventDefault();
    if (!applyForm.bio.trim() || !applyForm.subjects.trim()) return;
    setApplying(true);
    try {
      await api.post("/learn/educator/apply", {
        bio: applyForm.bio.trim(),
        subjects: applyForm.subjects.split(",").map(s => s.trim()).filter(Boolean),
      });
      toast("Educator application submitted ✓");
      setShowApply(false);
    } catch (e) { toast(e.message, "error"); }
    finally { setApplying(false); }
  };

  return (
    <div style={{ padding:"16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"var(--grad)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic d={ic.book} s={20} c="#fff" />
        </div>
        <h1 style={{ fontSize:22, fontWeight:900, margin:0 }}>Learn</h1>
      </div>

      <div style={{ display:"flex", borderBottom:"1px solid var(--border2)", marginBottom:18 }}>
        {[["discover","Discover"],["mine","My Learning"]].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1, padding:"11px 0", background:"none", border:"none", cursor:"pointer",
            fontWeight:800, fontSize:13.5,
            color: tab===k ? "var(--text)" : "var(--text3)",
            borderBottom: tab===k ? "2px solid var(--violet)" : "2px solid transparent",
          }}>{l}</button>
        ))}
      </div>

      {tab === "discover" && (
        <>
          <input
            value={q} onChange={e=>setQ(e.target.value)} placeholder="Search courses…"
            style={{
              width:"100%", padding:"11px 16px", borderRadius:12, border:"1px solid var(--border2)",
              background:"var(--bg3)", color:"var(--text)", fontSize:14.5, outline:"none", marginBottom:12,
            }}
          />
          <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:10, paddingBottom:2 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={()=>setCat(c.key)} style={{
                flexShrink:0, padding:"7px 14px", borderRadius:"var(--radius-pill)",
                border:`1px solid ${cat===c.key ? "var(--violet)" : "var(--border2)"}`,
                background: cat===c.key ? "var(--violet-dim)" : "transparent",
                color: cat===c.key ? "var(--violet-lt)" : "var(--text2)",
                fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
              }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:18, paddingBottom:2 }}>
            {DIFFICULTIES.map(d => (
              <button key={d.key} onClick={()=>setDifficulty(d.key)} style={{
                flexShrink:0, padding:"6px 12px", borderRadius:"var(--radius-pill)",
                border:`1px solid ${difficulty===d.key ? "var(--sky)" : "var(--border2)"}`,
                background: difficulty===d.key ? "var(--sky-dim)" : "transparent",
                color: difficulty===d.key ? "var(--sky)" : "var(--text3)",
                fontSize:12.5, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
              }}>{d.label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner size={32} /></div>
          ) : courses.length === 0 ? (
            <Empty emoji="📚" title="No courses found" sub="Try a different search or filter." />
          ) : (
            courses.map(c => <CourseCard key={c.id} course={c} />)
          )}
        </>
      )}

      {tab === "mine" && (
        !user ? (
          <Empty emoji="📚" title="Sign in to track your learning" sub="Enrol in courses and pick up where you left off." />
        ) : mineLoading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner size={32} /></div>
        ) : (
          <>
            {enrolments.length === 0 ? (
              <Empty emoji="📚" title="No courses yet" sub="Enrol in something from Discover to get started." />
            ) : (
              <>
                <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", letterSpacing:0.5, marginBottom:12 }}>IN PROGRESS</div>
                {enrolments.map(e => <EnrolmentCard key={e.id} enrolment={e} />)}
              </>
            )}

            {certificates.length > 0 && (
              <>
                <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", letterSpacing:0.5, margin:"20px 0 12px" }}>CERTIFICATES</div>
                {certificates.map(c => (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, background:"var(--amber-dim)", border:"1px solid var(--amber)", borderRadius:14, padding:14, marginBottom:10 }}>
                    <Ic d={ic.trophy} s={22} c="var(--amber)" />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:14 }}>{c.course_title}</div>
                      <div style={{ color:"var(--text3)", fontSize:12 }}>Issued {new Date(c.issued_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ marginTop:24, background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:16, padding:16 }}>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:6 }}>Know something others need to learn?</div>
              <div style={{ color:"var(--text2)", fontSize:13, lineHeight:1.5, marginBottom:12 }}>
                Apply to teach a course — no credentials required to start as a community educator.
              </div>
              {!showApply ? (
                <GhostButton onClick={()=>setShowApply(true)}>Apply to teach</GhostButton>
              ) : (
                <form onSubmit={submitApply}>
                  <textarea
                    value={applyForm.bio} onChange={e=>setApplyForm(f=>({...f,bio:e.target.value}))}
                    placeholder="A short bio — what should students know about you? (20+ characters)"
                    rows={3} required
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg)", color:"var(--text)", fontSize:13.5, outline:"none", marginBottom:8, resize:"vertical", fontFamily:"var(--font)" }}
                  />
                  <input
                    value={applyForm.subjects} onChange={e=>setApplyForm(f=>({...f,subjects:e.target.value}))}
                    placeholder="Subjects, comma-separated (e.g. agriculture, finance)"
                    required
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg)", color:"var(--text)", fontSize:13.5, outline:"none", marginBottom:10 }}
                  />
                  <div style={{ display:"flex", gap:8 }}>
                    <PrimaryButton loading={applying} sx={{ flex:1, padding:"9px 16px", fontSize:13.5 }}>Submit</PrimaryButton>
                    <GhostButton onClick={()=>setShowApply(false)} style={{ flex:1 }}>Cancel</GhostButton>
                  </div>
                </form>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, Avatar, CategoryPill, Spinner, Empty, PrimaryButton } from "../components/ui/index.jsx";

const CAT_GRADS = {
  TECH_VIBES:      "linear-gradient(135deg,#38BDF8,#7C3AED)",
  GLOBAL_CONNECT:  "linear-gradient(135deg,#10F5A0,#2DD4BF)",
  CREATIVE_LEARN:  "linear-gradient(135deg,#FFB830,#FF6B6B)",
  HUMAN_POTENTIAL: "linear-gradient(135deg,#A78BFA,#7C3AED)",
  GENERAL:         "linear-gradient(135deg,#7C3AED,#2DD4BF)",
};
const TYPE_ICON = { video: ic.play, article: ic.book, quiz: ic.sparkle, live_session: ic.mic, interactive: ic.zap };

// A connected step timeline, not a flat feed list — Learn is about sequence
// and progression, which a stack of identical rows (the Vibe/Spaces pattern)
// doesn't communicate. Teal is Learn's own accent throughout this pillar,
// distinct from violet (Vibe), sky (translation), and amber (achievement).
function LessonRow({ lesson, index, locked, done, isLast, onClick }) {
  return (
    <div style={{ display:"flex", gap:14 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
        <div style={{
          width:32, height:32, borderRadius:"50%", flexShrink:0,
          background: done ? "var(--teal)" : locked ? "var(--bg4)" : "var(--bg3)",
          border: `1.5px solid ${done ? "var(--teal)" : locked ? "var(--border2)" : "var(--teal)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Ic d={locked ? ic.lock : done ? ic.check : (TYPE_ICON[lesson.type] || ic.book)} s={14} c={done ? "var(--bg)" : locked ? "var(--text3)" : "var(--teal)"} />
        </div>
        {!isLast && <div style={{ width:2, flex:1, minHeight:20, background: done ? "var(--teal)" : "var(--border2)" }} />}
      </div>
      <button onClick={() => !locked && onClick(lesson)} style={{
        flex:1, minWidth:0, textAlign:"left", background:"none", border:"none",
        cursor: locked ? "default" : "pointer", opacity: locked ? 0.55 : 1, paddingBottom:22,
      }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{index + 1}. {lesson.title}</div>
        <div style={{ color:"var(--text3)", fontSize:12, textTransform:"capitalize" }}>
          {lesson.type.replace("_"," ")}{lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ""}{lesson.is_free_preview ? " · free preview" : ""}
        </div>
      </button>
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrolment, setEnrolment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { course: c, lessons: l } = await api.get(`/learn/courses/${id}`);
      setCourse(c);
      setLessons(l || []);
      if (user) {
        const { enrolments } = await api.get("/learn/me/enrolments").catch(() => ({ enrolments: [] }));
        setEnrolment((enrolments || []).find(e => e.course_id === id) || null);
      }
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id, user]);

  const enrol = async () => {
    if (!user) { toast("Sign in to enrol", "error"); return; }
    setEnrolling(true);
    try {
      await api.post(`/learn/courses/${id}/enrol`);
      toast("Enrolled ✓");
      load();
    } catch (e) { toast(e.message, "error"); }
    finally { setEnrolling(false); }
  };

  const openLesson = lesson => navigate(`/learn/courses/${id}/lessons/${lesson.id}`);

  const submitRating = async () => {
    if (!rating) return;
    setRatingBusy(true);
    try {
      await api.post(`/learn/courses/${id}/rate`, { rating, review: review.trim() || undefined });
      toast("Thanks for rating this course ✓");
    } catch (e) { toast(e.message, "error"); }
    finally { setRatingBusy(false); }
  };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={36} /></div>;
  if (!course) return <Empty emoji="📚" title="Course not found" sub="It may have been removed or unpublished." />;

  const grad = CAT_GRADS[course.category] || CAT_GRADS.GENERAL;
  const isEnrolled = !!enrolment;

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{
        height:150, background: course.cover_image_url ? `url(${course.cover_image_url}) center/cover` : grad,
        display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:16,
      }}>
        <CategoryPill category={course.category} />
        <span style={{
          display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:6,
          fontSize:11, fontWeight:800, letterSpacing:0.5, fontFamily:"var(--mono)",
          background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)", color:"var(--teal)",
        }}><Ic d={ic.book} s={11} c="var(--teal)" /> COURSE</span>
      </div>

      <div style={{ padding:"18px 16px" }}>
        <h1 style={{ fontSize:21, fontWeight:900, margin:"0 0 8px" }}>{course.title}</h1>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:14 }}>
          <span style={{ fontSize:12.5, color:"var(--text2)", textTransform:"capitalize" }}>{course.difficulty}</span>
          <span style={{ color:"var(--text3)" }}>·</span>
          <span style={{ fontSize:12.5, color:"var(--text2)" }}>{course.total_lessons} lessons</span>
          {course.estimated_hours && <><span style={{ color:"var(--text3)" }}>·</span><span style={{ fontSize:12.5, color:"var(--text2)" }}>~{course.estimated_hours}h</span></>}
          {course.avg_rating > 0 && (
            <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:12.5, color:"var(--amber)", fontWeight:700 }}>
              <Ic d={ic.star} s={13} c="var(--amber)" f="var(--amber)" /> {Number(course.avg_rating).toFixed(1)}
            </span>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"12px 14px", background:"var(--bg3)", borderRadius:14 }}>
          <Avatar user={{ displayName: course.educator_name, avatarInitials: course.educator_name?.slice(0,2).toUpperCase() }} size={38} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:14 }}>{course.educator_name}</div>
            <div style={{ color:"var(--text2)", fontSize:12 }}>@{course.educator_handle} · Educator</div>
          </div>
        </div>

        <p style={{ color:"var(--text2)", fontSize:14, lineHeight:1.6, marginBottom:20 }}>{course.description}</p>

        {isEnrolled ? (
          <div style={{ marginBottom:22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:13, color:"var(--text2)" }}>Your progress</span>
              <span style={{ fontSize:13, fontWeight:800, color: enrolment.status === "completed" ? "var(--green)" : "var(--teal)" }}>{enrolment.progress_pct}%</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:"var(--bg4)", overflow:"hidden", marginBottom:14 }}>
              <div style={{ height:"100%", width:`${enrolment.progress_pct}%`, background: enrolment.status === "completed" ? "var(--green)" : "var(--teal)" }} />
            </div>
            <PrimaryButton full onClick={() => lessons[0] && openLesson(lessons[0])}>
              {enrolment.status === "completed" ? "Review course" : "Continue learning"}
            </PrimaryButton>
          </div>
        ) : course.is_free ? (
          <PrimaryButton full loading={enrolling} onClick={enrol} sx={{ marginBottom:22 }}>Enrol — Free</PrimaryButton>
        ) : (
          <div style={{ padding:"14px 16px", background:"var(--bg3)", borderRadius:14, textAlign:"center", color:"var(--text2)", fontSize:13.5, marginBottom:22 }}>
            ${course.price_usd} · Paid checkout coming soon
          </div>
        )}

        <div style={{ fontWeight:800, fontSize:13, color:"var(--text2)", letterSpacing:0.5, marginBottom:10 }}>LESSONS</div>
        {/* Per-lesson completion isn't available at the list level (only aggregate
            progress_pct is) — each lesson shows its own done state once opened. */}
        {lessons.map((l, i) => (
          <LessonRow key={l.id} lesson={l} index={i} locked={!isEnrolled && !l.is_free_preview} done={false} isLast={i === lessons.length - 1} onClick={openLesson} />
        ))}

        {enrolment?.status === "completed" && (
          <div style={{ marginTop:24, padding:16, background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:16 }}>
            <div style={{ fontWeight:800, fontSize:14, marginBottom:10 }}>Rate this course</div>
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} style={{ background:"none", border:"none", padding:0 }}>
                  <Ic d={ic.star} s={26} c="var(--amber)" f={n <= rating ? "var(--amber)" : "none"} />
                </button>
              ))}
            </div>
            <textarea
              value={review} onChange={e=>setReview(e.target.value)} placeholder="Optional review…" rows={2}
              style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border2)", background:"var(--bg)", color:"var(--text)", fontSize:13.5, outline:"none", marginBottom:10, resize:"vertical", fontFamily:"var(--font)" }}
            />
            <PrimaryButton onClick={submitRating} loading={ratingBusy} disabled={!rating} sx={{ padding:"9px 18px", fontSize:13.5 }}>Submit rating</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

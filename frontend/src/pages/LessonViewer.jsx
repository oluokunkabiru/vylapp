import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, Spinner, Empty, PrimaryButton, GhostButton } from "../components/ui/index.jsx";

function Checkpoint({ checkpoint, onAnswered }) {
  const [selected, setSelected] = useState(checkpoint.response?.selected_option || null);
  const [result, setResult] = useState(checkpoint.response ? {
    is_correct: checkpoint.response.is_correct, points_earned: checkpoint.response.points_earned,
  } : null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const answer = async optionId => {
    setSelected(optionId);
    setBusy(true);
    try {
      const res = await api.post(`/learn/checkpoints/${checkpoint.id}/answer`, { selected_option: optionId });
      setResult(res);
      onAnswered(res);
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:16, padding:16, marginBottom:14 }}>
      <div style={{ fontWeight:700, fontSize:14.5, marginBottom:12 }}>{checkpoint.question}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {checkpoint.options.map(opt => {
          const isSelected = selected === opt.id;
          const isRight = result && opt.id === result.correct_option;
          const isWrongPick = result && isSelected && !result.is_correct;
          const bg = isRight ? "var(--green-dim)" : isWrongPick ? "var(--coral-dim)" : isSelected ? "var(--teal-dim)" : "var(--bg)";
          const border = isRight ? "var(--green)" : isWrongPick ? "var(--coral)" : isSelected ? "var(--teal)" : "var(--border2)";
          return (
            <button key={opt.id} disabled={busy} onClick={() => answer(opt.id)} style={{
              textAlign:"left", padding:"11px 14px", borderRadius:10, background:bg,
              border:`1.5px solid ${border}`, color:"var(--text)", fontSize:13.5, cursor: busy ? "default" : "pointer",
            }}>
              {opt.text}
            </button>
          );
        })}
      </div>
      {result && (
        <div style={{ marginTop:10, fontSize:13, color: result.is_correct ? "var(--green)" : "var(--coral)", fontWeight:700 }}>
          {result.is_correct ? "Correct" : "Not quite — try another option"}
          {result.explanation && <div style={{ color:"var(--text2)", fontWeight:400, marginTop:4 }}>{result.explanation}</div>}
        </div>
      )}
    </div>
  );
}

export default function LessonViewer() {
  const { id, lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [lesson, setLesson] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [completion, setCompletion] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    setLoading(true);
    startedAt.current = Date.now();
    Promise.all([
      api.get(`/learn/lessons/${lessonId}`),
      api.get(`/learn/courses/${id}`).then(({ lessons }) => setCourseLessons(lessons || [])).catch(() => {}),
    ]).then(([data]) => {
      setLesson(data.lesson);
      setCheckpoints(data.checkpoints || []);
      setCompletion(data.completion);
    }).catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const markComplete = async () => {
    setCompleting(true);
    try {
      let score;
      if (lesson.type === "quiz" && checkpoints.length) {
        const totalPoints = checkpoints.reduce((s, c) => s + c.points, 0);
        const earned = checkpoints.reduce((s, c) => s + (c.response?.points_earned || 0), 0);
        score = totalPoints ? Math.round((earned / totalPoints) * 100) : 0;
      }
      const time_spent_sec = Math.round((Date.now() - startedAt.current) / 1000);
      const { completion: c, certificate: cert } = await api.post(`/learn/lessons/${lessonId}/complete`, { score, time_spent_sec });
      setCompletion(c);
      if (cert) { setCertificate(cert); toast("Course completed — certificate issued 🎓"); }
      else toast("Lesson complete ✓");
    } catch (e) { toast(e.message, "error"); }
    finally { setCompleting(false); }
  };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={36} /></div>;
  if (!lesson) return <Empty emoji="📚" title="Lesson not available" sub="Enrol in the course to view this lesson." />;

  if (certificate) {
    return (
      <div style={{ padding:"48px 24px", textAlign:"center" }}>
        <div style={{ width:80, height:80, borderRadius:"50%", background:"var(--amber-dim)", border:"1px solid var(--amber)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <Ic d={ic.trophy} s={36} c="var(--amber)" />
        </div>
        <h2 style={{ fontSize:22, fontWeight:900, marginBottom:10 }}>Course complete</h2>
        <p style={{ color:"var(--text2)", fontSize:14.5, lineHeight:1.6, marginBottom:24 }}>
          Your certificate has been issued and saved to My Learning.
        </p>
        <Link to="/learn"><PrimaryButton>Back to Learn</PrimaryButton></Link>
      </div>
    );
  }

  const idx = courseLessons.findIndex(l => l.id === lessonId);
  const prev = idx > 0 ? courseLessons[idx - 1] : null;
  const next = idx >= 0 && idx < courseLessons.length - 1 ? courseLessons[idx + 1] : null;
  const allAnswered = lesson.type !== "quiz" || checkpoints.every(c => c.response);

  return (
    <div style={{ padding:"16px 16px 40px" }}>
      <Link to={`/learn/courses/${id}`} style={{ display:"inline-flex", alignItems:"center", gap:6, color:"var(--text2)", fontSize:13, fontWeight:700, marginBottom:16, textDecoration:"none" }}>
        <Ic d={ic.back} s={16} c="var(--text2)" /> Back to course
      </Link>

      <h1 style={{ fontSize:19, fontWeight:900, marginBottom:16 }}>{lesson.title}</h1>

      {lesson.type === "video" && lesson.content?.video_url && (
        <video controls style={{ width:"100%", borderRadius:16, marginBottom:16, background:"#000" }} src={lesson.content.video_url} />
      )}

      {lesson.type === "article" && lesson.content?.body_html && (
        <div style={{ color:"var(--text)", fontSize:15, lineHeight:1.7, marginBottom:16 }}
          dangerouslySetInnerHTML={{ __html: lesson.content.body_html }} />
      )}

      {lesson.type === "quiz" && (
        <>
          {lesson.content?.instructions && <p style={{ color:"var(--text2)", fontSize:14, marginBottom:14 }}>{lesson.content.instructions}</p>}
          {checkpoints.map(cp => (
            <Checkpoint key={cp.id} checkpoint={cp} onAnswered={res => {
              setCheckpoints(cps => cps.map(c => c.id === cp.id ? { ...c, response: res } : c));
            }} />
          ))}
        </>
      )}

      <div style={{ display:"flex", gap:10, marginTop:20, marginBottom:24 }}>
        {prev && <GhostButton onClick={() => navigate(`/learn/courses/${id}/lessons/${prev.id}`)} style={{ flex:1 }}>Previous</GhostButton>}
        {next && <GhostButton onClick={() => navigate(`/learn/courses/${id}/lessons/${next.id}`)} style={{ flex:1 }}>Next lesson</GhostButton>}
      </div>

      {completion ? (
        <div style={{ padding:"12px 16px", background:"var(--green-dim)", border:"1px solid var(--green)", borderRadius:12, textAlign:"center", color:"var(--green)", fontWeight:700, fontSize:13.5 }}>
          Completed {completion.score != null ? `· score ${completion.score}%` : ""}
        </div>
      ) : (
        <PrimaryButton full loading={completing} disabled={!allAnswered} onClick={markComplete}>
          {lesson.type === "quiz" && !allAnswered ? "Answer all questions to continue" : "Mark lesson complete"}
        </PrimaryButton>
      )}
    </div>
  );
}

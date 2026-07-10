import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Ic, ic, Avatar, VylappWordmark, PrimaryButton, GhostButton, Spinner } from "../components/ui/index.jsx";

const STEP_ORDER = ["welcome", "interests", "handle", "avatar", "follow_suggestions", "complete"];
const AVATAR_SWATCHES = ["#7C3AED", "#10F5A0", "#FF6B6B", "#FFB830", "#38BDF8", "#A78BFA", "#2DD4BF"];
const INTEREST_LABELS = { tech: "Tech Vibes", global: "Global Connect", human: "Human Potential", creative: "Creative Learn", spaces: "Spaces & Live Audio" };

function ProgressDots({ step }) {
  const idx = Math.max(0, STEP_ORDER.indexOf(step));
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:28 }}>
      {STEP_ORDER.map((s, i) => (
        <div key={s} style={{
          width: i === idx ? 20 : 6, height:6, borderRadius:3,
          background: i <= idx ? "var(--violet-lt)" : "var(--border2)",
          transition:"all 0.2s",
        }} />
      ))}
    </div>
  );
}

function StepShell({ title, subtitle, children }) {
  return (
    <div style={{ width:"100%", maxWidth:420 }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:900, margin:"0 0 8px" }}>{title}</h1>
        {subtitle && <p style={{ color:"var(--text2)", fontSize:14.5, lineHeight:1.55, margin:0 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(user?.onboardingStep && STEP_ORDER.includes(user.onboardingStep) ? user.onboardingStep : "welcome");
  const [busy, setBusy] = useState(false);

  const [languages, setLanguages] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedLangs, setSelectedLangs] = useState(["en"]);

  const [handle, setHandle] = useState(user?.handle || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || "#7C3AED");

  const [suggestedCreators, setSuggestedCreators] = useState([]);
  const [firstVibePrompt, setFirstVibePrompt] = useState("");
  const [selectedFollows, setSelectedFollows] = useState(new Set());

  const [firstVibeText, setFirstVibeText] = useState("");

  useEffect(() => {
    api.get("/translate/languages").then(({ languages: l }) => setLanguages(l || [])).catch(() => {});
  }, []);

  const toggleInterest = key => setSelectedInterests(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);
  const toggleLang = code => setSelectedLangs(s => s.includes(code) ? s.filter(c => c !== code) : [...s, code]);
  const toggleFollow = id => setSelectedFollows(s => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const submitInterests = async () => {
    if (!selectedInterests.length) { toast("Pick at least one interest", "error"); return; }
    if (!selectedLangs.length) { toast("Pick at least one language", "error"); return; }
    setBusy(true);
    try {
      const { suggestedCreators: sc, firstVibePrompt: fp } = await api.post("/onboarding/interests", {
        interests: selectedInterests, contentLanguages: selectedLangs,
      });
      setSuggestedCreators(sc || []);
      setFirstVibePrompt(fp || "");
      setFirstVibeText(fp || "");
      updateUser({ onboardingStep: "handle" });
      setStep("handle");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const submitHandle = async () => {
    if (!/^[a-zA-Z0-9._]{3,20}$/.test(handle)) { toast("3-20 chars, letters/numbers/./_ only", "error"); return; }
    setBusy(true);
    try {
      await api.post("/onboarding/handle", { handle });
      updateUser({ handle, onboardingStep: "avatar" });
      setStep("avatar");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const submitAvatar = async () => {
    setBusy(true);
    try {
      await api.post("/onboarding/avatar", { avatarColor });
      updateUser({ avatarColor, onboardingStep: "follow_suggestions" });
      setStep("follow_suggestions");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const submitFollows = async () => {
    setBusy(true);
    try {
      await api.post("/onboarding/follow-suggestions", { userIds: [...selectedFollows] });
      updateUser({ onboardingStep: "complete" });
      setStep("complete");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const postFirstVibe = async () => {
    if (!firstVibeText.trim()) return;
    setBusy(true);
    try {
      const tags = [...firstVibeText.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase());
      await api.post("/vibes", { content: firstVibeText.trim(), category: "GENERAL", tags });
      toast("Your first vibe is live ✓");
      finish();
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await api.post("/onboarding/complete");
      updateUser({ onboardingDone: true });
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const chipStyle = active => ({
    padding:"9px 16px", borderRadius:"var(--radius-pill)",
    border:`1.5px solid ${active ? "var(--violet)" : "var(--border)"}`,
    background: active ? "var(--violet-dim)" : "transparent",
    color: active ? "var(--violet-lt)" : "var(--text2)",
    fontWeight:700, fontSize:13.5, cursor:"pointer",
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)" }}>
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(circle at 50% 20%, rgba(124,58,237,0.10) 0%, transparent 60%)", pointerEvents:"none" }} />
      <div style={{ position:"relative", width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
        {step !== "welcome" && <ProgressDots step={step} />}

        {step === "welcome" && (
          <StepShell title="">
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <VylappWordmark size={34} />
            </div>
            {[
              { icon: ic.sparkle, title: "Vibe", body: "Express yourself in your own language and be heard." },
              { icon: ic.book, title: "Learn", body: "Grow with a community that holds you accountable." },
              { icon: ic.globe, title: "Connect", body: "Find your people across borders and time zones." },
            ].map(p => (
              <div key={p.title} style={{ display:"flex", alignItems:"center", gap:14, background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:16, padding:16, marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:"var(--grad)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Ic d={p.icon} s={22} c="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:15 }}>{p.title}</div>
                  <div style={{ color:"var(--text2)", fontSize:13, lineHeight:1.4 }}>{p.body}</div>
                </div>
              </div>
            ))}
            <PrimaryButton full sx={{ marginTop:12 }} onClick={() => setStep("interests")}>Get started</PrimaryButton>
          </StepShell>
        )}

        {step === "interests" && (
          <StepShell title="What are you into?" subtitle="Pick a few — this shapes your first feed and who we suggest you follow.">
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:28 }}>
              {Object.keys(INTEREST_LABELS).map(key => (
                <button key={key} onClick={() => toggleInterest(key)} style={chipStyle(selectedInterests.includes(key))}>
                  {INTEREST_LABELS[key]}
                </button>
              ))}
            </div>

            <div style={{ fontSize:13, fontWeight:800, color:"var(--text2)", letterSpacing:0.4, marginBottom:10, textAlign:"center" }}>
              WHICH LANGUAGES DO YOU READ?
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:28 }}>
              {(languages.length ? languages : [{code:"en",name:"English",nativeName:"English"}]).map(l => (
                <button key={l.code} onClick={() => toggleLang(l.code)} style={chipStyle(selectedLangs.includes(l.code))}>
                  {l.nativeName}
                </button>
              ))}
            </div>

            <PrimaryButton full loading={busy} onClick={submitInterests}>Continue</PrimaryButton>
          </StepShell>
        )}

        {step === "handle" && (
          <StepShell title="Pick your handle" subtitle="This is how people find and mention you.">
            <div style={{ position:"relative", marginBottom:20 }}>
              <span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", color:"var(--text3)", fontSize:15, fontWeight:700 }}>@</span>
              <input
                value={handle} onChange={e => setHandle(e.target.value)} maxLength={20}
                style={{ width:"100%", padding:"13px 16px 13px 30px", borderRadius:14, border:"1.5px solid var(--border)", background:"var(--bg3)", color:"var(--text)", fontSize:15.5, outline:"none" }}
              />
            </div>
            <PrimaryButton full loading={busy} onClick={submitHandle}>Continue</PrimaryButton>
          </StepShell>
        )}

        {step === "avatar" && (
          <StepShell title="Make it yours" subtitle="Pick a color for your avatar.">
            <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
              <Avatar user={{ displayName: user?.displayName, avatarColor, avatarInitials: user?.avatarInitials }} size={88} ring />
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:28, flexWrap:"wrap" }}>
              {AVATAR_SWATCHES.map(c => (
                <button key={c} onClick={() => setAvatarColor(c)} style={{
                  width:40, height:40, borderRadius:"50%", background:c, cursor:"pointer",
                  border: avatarColor === c ? "3px solid var(--text)" : "3px solid transparent",
                  boxShadow: avatarColor === c ? `0 0 0 2px ${c}` : "none",
                }} />
              ))}
            </div>
            <PrimaryButton full loading={busy} onClick={submitAvatar}>Continue</PrimaryButton>
          </StepShell>
        )}

        {step === "follow_suggestions" && (
          <StepShell title="Vibers to follow" subtitle="A few people we think you'll want to connect with — optional.">
            <div style={{ marginBottom:24, maxHeight:320, overflowY:"auto" }}>
              {suggestedCreators.map(c => {
                const active = selectedFollows.has(c.id);
                return (
                  <button key={c.id} onClick={() => toggleFollow(c.id)} style={{
                    display:"flex", alignItems:"center", gap:12, width:"100%", padding:12, borderRadius:14,
                    background: active ? "var(--violet-dim)" : "var(--bg3)",
                    border:`1px solid ${active ? "var(--violet)" : "var(--border2)"}`,
                    marginBottom:8, cursor:"pointer", textAlign:"left",
                  }}>
                    <Avatar user={{ displayName: c.display_name, avatarInitials: c.display_name?.slice(0,2).toUpperCase() }} size={38} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:14 }}>{c.display_name}</div>
                      <div style={{ color:"var(--text2)", fontSize:12 }}>@{c.handle}</div>
                    </div>
                    {active && <Ic d={ic.check} s={18} c="var(--violet-lt)" />}
                  </button>
                );
              })}
              {suggestedCreators.length === 0 && (
                <div style={{ textAlign:"center", padding:20 }}><Spinner size={24} /></div>
              )}
            </div>
            <PrimaryButton full loading={busy} onClick={submitFollows}>
              {selectedFollows.size > 0 ? `Follow ${selectedFollows.size} and continue` : "Continue"}
            </PrimaryButton>
          </StepShell>
        )}

        {step === "complete" && (
          <StepShell title="You're all set" subtitle="Share your first vibe with the community, or jump straight in.">
            <div style={{ position:"relative", marginBottom:16 }}>
              <textarea
                value={firstVibeText} onChange={e => setFirstVibeText(e.target.value.slice(0, 500))}
                rows={4}
                style={{ width:"100%", padding:14, borderRadius:14, border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:14.5, outline:"none", resize:"none", fontFamily:"var(--font)" }}
              />
            </div>
            <PrimaryButton full loading={busy} onClick={postFirstVibe} sx={{ marginBottom:10 }}>Post your first vibe</PrimaryButton>
            <GhostButton onClick={finish} style={{ width:"100%" }}>Skip for now</GhostButton>
          </StepShell>
        )}
      </div>
    </div>
  );
}

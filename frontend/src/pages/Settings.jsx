import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ScreenHeader, Card, Toggle, GhostButton, PrimaryButton } from "../components/ui/index.jsx";
import { LANGUAGES } from "../lib/languages.js";

// S (rest) — muted words: content-based filtering, separate from muting a
// person. Kept as its own small component so Settings itself doesn't grow
// a second layer of list-management state.
function MutedWordsSection() {
  const toast = useToast();
  const [words, setWords] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api.get("/users/me/muted-words").then(({ words }) => setWords(words)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    const word = input.trim();
    if (!word) return;
    setAdding(true);
    try {
      await api.post("/users/me/muted-words", { word });
      setInput("");
      load();
    } catch (e) {
      toast(e.message || "Couldn't add that word", "error");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    setWords(w => w.filter(x => x.id !== id)); // optimistic
    try {
      await api.delete(`/users/me/muted-words/${id}`);
    } catch (e) {
      toast(e.message || "Couldn't remove that word", "error");
      load();
    }
  };

  return (
    <>
      <SectionLabel>Muted words</SectionLabel>
      <Card>
        <div style={{ color:"var(--text3)", fontSize:12.5, marginBottom:12 }}>
          Vibes containing any of these words won't show up in your feed. Case-insensitive.
        </div>
        <form onSubmit={add} style={{ display:"flex", gap:8, marginBottom: words.length ? 14 : 0 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a word or phrase"
            style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg3)", color:"var(--text)", fontSize:14 }}
          />
          <PrimaryButton loading={adding} disabled={adding || !input.trim()}>Add</PrimaryButton>
        </form>
        {!loading && words.map(w => (
          <div key={w.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderTop:"1px solid var(--border2)" }}>
            <span style={{ fontSize:14 }}>{w.word}</span>
            <button onClick={() => remove(w.id)} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:12.5, cursor:"pointer", fontWeight:700 }}>Remove</button>
          </div>
        ))}
      </Card>
    </>
  );
}

// I-29 — grouped by what a person is trying to accomplish (language,
// privacy, account), not by backend table. Every control here is real and
// wired to an existing endpoint; nothing decorative. Data export (I-30)
// and account deletion (I-31) belong on this page once they exist —
// deliberately not stubbed in ahead of that, per the same reasoning as
// the composer's media button: a fake control is worse than no control.
function SectionLabel({ children }) {
  return <div style={{ fontSize:13, fontWeight:700, color:"var(--text2)", margin:"20px 0 10px" }}>{children}</div>;
}

export default function Settings({ lang, setLang }) {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(null); // which field is in flight, for per-row feedback
  const [security, setSecurity] = useState(null);
  const [enrolment, setEnrolment] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [securityBusy, setSecurityBusy] = useState(false);

  useEffect(() => {
    api.get("/auth/account-status").then(({ verification }) => setSecurity(verification)).catch(() => {});
  }, []);

  const savePref = async (patch, field) => {
    setSaving(field);
    try {
      const { user: u } = await api.patch("/users/me", patch);
      updateUser(u);
    } catch (e) {
      toast(e.message || "Couldn't save that", "error");
    } finally {
      setSaving(null);
    }
  };

  const beginTwoFactor = async () => {
    setSecurityBusy(true);
    try {
      const result = await api.post("/auth/2fa/enroll");
      setEnrolment(result);
      toast("A verification code was sent to your email.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSecurityBusy(false);
    }
  };

  const confirmTwoFactor = async () => {
    if (!twoFactorCode.trim()) return;
    setSecurityBusy(true);
    try {
      await api.post("/auth/2fa/verify", { code: twoFactorCode.trim() });
      setSecurity(current => current ? { ...current, twoFactor: { enabled:true } } : current);
      setTwoFactorCode("");
      toast("Two-step verification enabled.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSecurityBusy(false);
    }
  };

  return (
    <div>
      <ScreenHeader title="Settings" onBack={() => navigate(-1)} />
      <div style={{ padding:"4px 16px 40px" }}>
        <SectionLabel>Language</SectionLabel>
        <Card>
          <label style={{ fontSize:12.5, fontWeight:700, color:"var(--text2)", display:"block", marginBottom:8 }}>
            Reading language
          </label>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            style={{
              width:"100%", padding:"11px 14px", borderRadius:12, border:"1.5px solid var(--border)",
              background:"var(--bg3)", color:"var(--text)", fontSize:14.5, outline:"none", cursor:"pointer",
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code} lang={l.code} style={{ background:"var(--bg2)" }}>{l.nativeName}</option>
            ))}
          </select>
          <div style={{ color:"var(--text3)", fontSize:12.5, marginTop:8 }}>
            Changes what the app shell and translated content are shown in. Syncs across your devices.
          </div>
        </Card>

        <SectionLabel>Privacy</SectionLabel>
        <Card style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <Toggle
            on={!!user?.privateAccount}
            onChange={v => savePref({ private_account: v }, "private")}
            disabled={saving === "private"}
            label="Private account"
            sub="New followers need your approval before they can see your vibes"
          />
          <Toggle
            on={user?.allowDms !== false}
            onChange={v => savePref({ allow_dms: v }, "dms")}
            disabled={saving === "dms"}
            label="Allow direct messages"
            sub="Turn off to stop new message requests from non-connections"
          />
        </Card>

        <MutedWordsSection />

        <SectionLabel>Security</SectionLabel>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:14 }}>Two-step verification</div>
              <div style={{ color:"var(--text3)", fontSize:12.5, lineHeight:1.5, marginTop:3 }}>{security?.twoFactor?.enabled ? "Enabled. Password sign-in also requires a rotating code or recovery code." : "Add a rotating verification code to password sign-in."}</div>
            </div>
            <span style={{ color:security?.twoFactor?.enabled?"var(--green)":"var(--amber)", fontWeight:800, fontSize:12 }}>{security?.twoFactor?.enabled ? "Enabled" : "Off"}</span>
          </div>

          {!security?.twoFactor?.enabled && !enrolment && <GhostButton loading={securityBusy} onClick={beginTwoFactor} style={{ marginTop:14 }}>Enable two-step verification</GhostButton>}

          {!security?.twoFactor?.enabled && enrolment && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid var(--border2)" }}>
              <div style={{ color:"var(--text2)", fontSize:12.5, lineHeight:1.5, marginBottom:10 }}>Enter the six-digit code sent to your account email. You can also add this secret to a TOTP authenticator: <code style={{ userSelect:"all", overflowWrap:"anywhere" }}>{enrolment.secret}</code></div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={twoFactorCode} onChange={event => setTwoFactorCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg3)", color:"var(--text)" }} />
                <PrimaryButton loading={securityBusy} disabled={securityBusy || !twoFactorCode.trim()} onClick={confirmTwoFactor}>Confirm</PrimaryButton>
              </div>
              <div style={{ marginTop:12, padding:10, borderRadius:10, background:"rgba(255,184,48,.08)", border:"1px solid rgba(255,184,48,.2)", color:"var(--text2)", fontSize:12 }}>
                Save these one-use recovery codes somewhere private before confirming:
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, marginTop:8, fontFamily:"var(--mono)", color:"var(--text)", userSelect:"all" }}>{enrolment.recoveryCodes.map(code => <span key={code}>{code}</span>)}</div>
              </div>
            </div>
          )}
        </Card>

        <SectionLabel>Account</SectionLabel>
        <Card>
          <GhostButton onClick={logout} style={{ width:"100%" }}>Log out</GhostButton>
        </Card>
      </div>
    </div>
  );
}

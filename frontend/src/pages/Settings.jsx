import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ScreenHeader, Card, Toggle, GhostButton } from "../components/ui/index.jsx";
import { LANGUAGES } from "../lib/languages.js";

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

        <SectionLabel>Account</SectionLabel>
        <Card>
          <GhostButton onClick={logout} style={{ width:"100%" }}>Log out</GhostButton>
        </Card>
      </div>
    </div>
  );
}

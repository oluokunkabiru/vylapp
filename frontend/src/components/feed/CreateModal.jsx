import { useState } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { ScreenHeader, PrimaryButton, Ic, ic } from "../ui/index.jsx";
import { LANGUAGES, COMMON_LANGUAGE_CODES } from "../../lib/languages.js";

const CATS = [
  { key:"TECH_VIBES",      label:"Tech Vibes" },
  { key:"GLOBAL_CONNECT",  label:"Global Connect" },
  { key:"CREATIVE_LEARN",  label:"Creative Learn" },
  { key:"HUMAN_POTENTIAL", label:"Human Potential" },
  { key:"SPACES_INVITE",   label:"Spaces Invite" },
];
const CAT_COLORS = { TECH_VIBES:"var(--sky)", GLOBAL_CONNECT:"var(--green)", CREATIVE_LEARN:"var(--amber)", HUMAN_POTENTIAL:"var(--purple)", SPACES_INVITE:"var(--coral)" };
const COMPOSER_LANGUAGES = COMMON_LANGUAGE_CODES.map(code => LANGUAGES.find(l => l.code === code));

// V-12 — the composer's own default: the reading language the person has
// already chosen (TopBar), not always English. A Yoruba reader writing a
// Yoruba post shouldn't have to correct the declaration every time.
export default function CreateModal({ onClose, onCreated, defaultLang = "en" }) {
  const toast = useToast();
  const [content, setContent] = useState("");
  const [cat, setCat] = useState("TECH_VIBES");
  const [language, setLanguage] = useState(defaultLang);
  const [loading, setLoading] = useState(false);
  const max = 500;

  const share = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const tags = [...content.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase());
      const { vibe } = await api.post("/vibes", { content: content.trim(), category: cat, tags, language });
      toast("Your vibe is live ✓");
      onCreated?.(vibe);
      onClose();
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(8,7,15,0.85)", zIndex:300,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth:420, background:"var(--bg2)", borderRadius:24,
        border:"1px solid var(--border)", overflow:"hidden", maxHeight:"85vh", display:"flex", flexDirection:"column",
      }}>
        <ScreenHeader title="Share a Vibe" onBack={onClose} />
        <div style={{ padding:16, overflowY:"auto", flex:1 }}>
          {/* Media — upload pipeline (V-22 onward) doesn't exist yet, so this
              is honest about that instead of looking clickable and doing
              nothing (the previous version had no onClick at all). */}
          <div
            onClick={() => toast("Photo and video uploads are coming soon")}
            style={{
              aspectRatio:"4/3", borderRadius:18, border:"2px dashed var(--border)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:10, marginBottom:16, background:"var(--bg3)", cursor:"pointer",
            }}>
            <Ic d={ic.image} s={36} c="var(--text2)" />
            <span style={{ color:"var(--text2)", fontSize:14, fontWeight:600 }}>Tap to add photo or video</span>
          </div>

          <div style={{ fontSize:13, fontWeight:700, color:"var(--text2)", marginBottom:8 }}>Language</div>
          {/* V-12 — declared, not just detected. Pre-set to the reader's
              current language and changeable in one action (design doc F6). */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
            {COMPOSER_LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLanguage(l.code)} style={{
                padding:"7px 13px", borderRadius:"var(--radius-pill)",
                border:`1.5px solid ${language===l.code ? "var(--violet-lt)" : "var(--border)"}`,
                background: language===l.code ? "var(--violet-dim)" : "transparent",
                color: language===l.code ? "var(--violet-lt)" : "var(--text2)",
                fontWeight:700, fontSize:13,
              }}>{l.nativeName}</button>
            ))}
          </div>

          <div style={{ fontSize:13, fontWeight:700, color:"var(--text2)", marginBottom:8 }}>Choose a topic</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={()=>setCat(c.key)} style={{
                padding:"8px 14px", borderRadius:"var(--radius-pill)",
                border:`1.5px solid ${cat===c.key ? CAT_COLORS[c.key] : "var(--border)"}`,
                background: cat===c.key ? `${CAT_COLORS[c.key]}18` : "transparent",
                color: cat===c.key ? CAT_COLORS[c.key] : "var(--text2)",
                fontWeight:700, fontSize:13,
              }}>{c.label}</button>
            ))}
          </div>

          <div style={{ position:"relative" }}>
            <textarea
              value={content} onChange={e=>setContent(e.target.value.slice(0, max))}
              placeholder="What's on your mind? Share a vibe with the community…"
              rows={4}
              style={{
                width:"100%", background:"var(--bg3)", border:`1px solid ${content.length > max*0.9 ? "var(--coral)" : "var(--border2)"}`,
                borderRadius:"var(--radius-md)", padding:12, color:"var(--text)",
                fontSize:14.5, outline:"none", resize:"none",
              }}
            />
            <div style={{
              position:"absolute", bottom:8, right:12, fontSize:12,
              color: content.length > max*0.9 ? "var(--coral)" : "var(--text3)",
              fontFamily:"var(--mono)",
            }}>{max - content.length}</div>
          </div>
        </div>
        <div style={{ padding:16, borderTop:"1px solid var(--border2)" }}>
          <PrimaryButton full onClick={share} loading={loading} disabled={!content.trim()}>Share Vibe</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

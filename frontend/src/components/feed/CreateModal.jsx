import { useState, useRef, useEffect } from "react";
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

  // V-13/V-14 — @mention and #hashtag autocomplete. `trigger` holds where the
  // active @/# token starts in `content` so a selected suggestion can
  // replace exactly that token, not the whole field.
  const textareaRef = useRef(null);
  const [trigger, setTrigger] = useState(null); // { type: "user"|"hashtag", start, query }
  const [suggestions, setSuggestions] = useState([]);

  // Looks backward from the cursor for an unclosed @word or #word — the
  // same convention every mention/hashtag composer uses: the trigger must
  // start at the beginning of the text or right after whitespace, so
  // "email@x.com" or "C#" mid-word never opens the dropdown.
  const detectTrigger = (text, cursor) => {
    const before = text.slice(0, cursor);
    const match = before.match(/(?:^|\s)([@#])(\w*)$/);
    if (!match) return null;
    const symbol = match[1];
    const query = match[2];
    const start = before.length - query.length - 1;
    return { type: symbol === "@" ? "user" : "hashtag", start, query };
  };

  const onContentChange = e => {
    const next = e.target.value.slice(0, max);
    setContent(next);
    const nextTrigger = detectTrigger(next, e.target.selectionStart);
    setTrigger(nextTrigger);
    if (!nextTrigger || !nextTrigger.query) setSuggestions([]);
  };

  // Only reaches here once trigger.query is non-empty (see onContentChange
  // above) — the effect's own job is strictly "fetch for the current query
  // after a short debounce," not clearing state on every keystroke.
  useEffect(() => {
    if (!trigger || !trigger.query) return;
    const handle = setTimeout(() => {
      api.get(`/search/autocomplete?q=${encodeURIComponent(trigger.query)}&type=${trigger.type}`)
        .then(({ suggestions: s }) => setSuggestions(s || []))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [trigger]);

  const applySuggestion = s => {
    const symbol = trigger.type === "user" ? "@" : "#";
    const before = content.slice(0, trigger.start);
    const after = content.slice(trigger.start + 1 + trigger.query.length);
    const inserted = `${before}${symbol}${s.value} ${after}`.slice(0, max);
    setContent(inserted);
    setTrigger(null);
    setSuggestions([]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

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
            <textarea dir="auto" ref={textareaRef}
              value={content} onChange={onContentChange}
              onBlur={() => setTimeout(() => setTrigger(null), 150)} // let a suggestion click land first
              placeholder="What's on your mind? Share a vibe with the community…"
              rows={4}
              style={{
                width:"100%", background:"var(--bg3)", border:`1px solid ${content.length > max*0.9 ? "var(--coral)" : "var(--border2)"}`,
                borderRadius:"var(--radius-md)", padding:12, color:"var(--text)",
                fontSize:14.5, outline:"none", resize:"none",
              }}
            />
            <div className="vy-composer-counter" style={{
              position:"absolute", bottom:8, right:12, fontSize:12,
              color: content.length > max*0.9 ? "var(--coral)" : "var(--text3)",
              fontFamily:"var(--mono)",
            }}>{max - content.length}</div>

            {trigger && suggestions.length > 0 && (
              <div style={{
                position:"absolute", left:0, right:0, top:"100%", marginTop:6, zIndex:10,
                background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)",
                boxShadow:"var(--shadow-card)", overflow:"hidden", maxHeight:220, overflowY:"auto",
              }}>
                {suggestions.map(s => (
                  <button key={s.value} onMouseDown={e => { e.preventDefault(); applySuggestion(s); }} style={{
                    display:"flex", alignItems:"center", gap:8, width:"100%", padding:"10px 12px",
                    textAlign:"left", background:"transparent", color:"var(--text)", fontSize:14,
                  }}>
                    {trigger.type === "user" ? (
                      <>
                        <span style={{ fontWeight:700 }}>@{s.value}</span>
                        <span style={{ color:"var(--text3)", fontSize:12.5 }}>{s.label}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight:700 }}>#{s.value}</span>
                        <span style={{ color:"var(--text3)", fontSize:12.5, marginLeft:"auto" }}>{s.count}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding:16, borderTop:"1px solid var(--border2)" }}>
          <PrimaryButton full onClick={share} loading={loading} disabled={!content.trim()}>Share Vibe</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

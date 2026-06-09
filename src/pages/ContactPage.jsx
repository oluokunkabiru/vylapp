import { useState } from "react";
import { Icon, ic, Label, Btn, Wrap, Sec, sectionBorder, textSub, textMuted } from "../components/UI";
import { COLORS, COMPANY, API } from "../config";

export default function ContactPage({ dark }) {
  const [form, setForm] = useState({ name: "", email: "", topic: "General inquiry", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const muted  = textMuted(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };
  const inputStyle = {
    background: dark ? "#0F0E1A" : "#F8F7FF",
    border: `1px solid ${border}`,
    color: "inherit",
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    outline: "none",
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // When backend is ready: POST to `${API.base}${API.contact}`
      // await fetch(`${API.base}${API.contact}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      await new Promise(r => setTimeout(r, 600)); // placeholder
      setSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <Label color={COLORS.violet}>Contact</Label>
          <h1 className="font-sora font-extrabold text-5xl mt-6">Get in touch</h1>
          <p className="mt-3 font-dm text-lg" style={{ color: sub }}>We read every message.</p>
        </Wrap>
      </Sec>
      <Sec>
        <Wrap>
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl">
            {!sent ? (
              <div className="space-y-4">
                {[["Your name","text","Aisha Kamara","name"],["Email","email","you@example.com","email"]].map(([l,t,p,k]) => (
                  <div key={k}>
                    <label className="font-mono text-[10px] uppercase tracking-wider block mb-2" style={{ color: muted }}>{l}</label>
                    <input type={t} placeholder={p} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider block mb-2" style={{ color: muted }}>Topic</label>
                  <select value={form.topic} onChange={e => setForm({...form,topic:e.target.value})} style={inputStyle}>
                    {["General inquiry","Creator partnerships","Press","Investor relations","Support"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider block mb-2" style={{ color: muted }}>Message</label>
                  <textarea rows={5} placeholder="Tell us what's on your mind..." value={form.message} onChange={e => setForm({...form,message:e.target.value})} style={{ ...inputStyle, resize: "none" }} />
                </div>
                <Btn full variant="primary" onClick={handleSubmit}>
                  {loading ? "Sending…" : "Send message"}
                </Btn>
              </div>
            ) : (
              <div className="py-16 text-center rounded-xl" style={{ border: `1px solid ${COLORS.teal}30`, background: `${COLORS.teal}08` }}>
                <Icon d={ic.check} s={30} style={{ color: COLORS.teal, margin: "0 auto 16px" }} />
                <p className="font-sora font-bold mb-2">Message sent</p>
                <p className="font-dm text-sm" style={{ color: sub }}>We'll get back within 24 hours.</p>
              </div>
            )}

            <div className="space-y-4">
              {[[ic.mail,"Email",COMPANY.email],[ic.globe,"Website",COMPANY.website],[ic.brief,"Address",COMPANY.address]].map(([d,t,v]) => (
                <div key={t} className="flex gap-4 p-5 rounded-xl" style={card}>
                  <Icon d={d} s={17} style={{ color: COLORS.violet, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: muted }}>{t}</p>
                    <p className="font-dm text-sm">{v}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

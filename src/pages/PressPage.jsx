import { Icon, ic, Label, SectionLabel, Wrap, Sec, sectionBorder, textSub, textMuted } from "../components/UI";
import { COLORS, COMPANY } from "../config";

export default function PressPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const muted  = textMuted(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <Label color={COLORS.violet}>Press & Media</Label>
          <h1 className="font-sora font-extrabold text-5xl mt-6">Newsroom</h1>
          <p className="mt-4 font-dm text-lg" style={{ color: sub }}>Brand assets, company facts, and media contact.</p>
        </Wrap>
      </Sec>
      <Sec>
        <Wrap narrow>
          <div className="space-y-10">
            <div>
              <SectionLabel color={COLORS.violet}>Company facts</SectionLabel>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                {[["Company",COMPANY.name],["Founded",COMPANY.year],["HQ","Indianapolis, Indiana"],["Entity",`${COMPANY.state} LLC`],["Founder",COMPANY.founder],["Stage","Pre-seed"],["Instrument","SAFE Note (YC post-money style)"],["Website",COMPANY.website],["Press contact",COMPANY.pressEmail]].map(([k,v],i) => (
                  <div key={k} className="flex justify-between items-center px-5 py-3.5" style={{ background: i%2===0 ? (dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.01)") : "transparent", borderBottom: i<8 ? `1px solid ${border}` : "none" }}>
                    <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: muted }}>{k}</span>
                    <span className="font-dm text-sm font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel color={COLORS.teal}>Brand assets</SectionLabel>
              <div className="grid sm:grid-cols-3 gap-4">
                {["Logo (SVG)","Logo (PNG)","Brand guidelines"].map(a => (
                  <button key={a} className="flex items-center justify-between p-4 rounded-xl hover:opacity-70 transition-opacity" style={card}>
                    <span className="font-dm text-sm">{a}</span>
                    <Icon d={ic.extLink} s={13} style={{ color: muted }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 rounded-xl" style={card}>
              <Icon d={ic.mail} s={18} style={{ color: COLORS.violet, flexShrink: 0 }} />
              <div>
                <a href={`mailto:${COMPANY.pressEmail}?subject=Press inquiry`} className="font-dm font-semibold hover:underline">{COMPANY.pressEmail}</a>
                <p className="font-dm text-sm" style={{ color: sub }}>Press inquiries answered within 24 hours.</p>
              </div>
            </div>
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

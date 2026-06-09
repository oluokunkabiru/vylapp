import { Icon, ic, Label, Btn, Wrap, Sec, sectionBorder, textSub } from "../components/UI";
import { COLORS, COMPANY } from "../config";

const FAQS = [
  { q: "How do I create my first Vibe?",        a: "After signing up, you'll see a pre-loaded first Vibe prompt. Edit it and tap Post. Your first Vibe appears in your community feed instantly." },
  { q: "How does translation work in Spaces?",  a: "Vylapp detects your language preference and shows real-time captions translated for you. Free tier: 1 language. Pro: up to 5." },
  { q: "What is the Raven program?",            a: "Raven is Vylapp's founding token for early creators. Founding creators lock in an 85/15 revenue split for life — the earlier you join, the more you keep forever." },
  { q: "Can I export my subscriber list?",      a: "Yes. Your subscriber list is yours. Go to Creator Dashboard → Subscribers → Export CSV. You own that list forever, regardless of whether you stay on Vylapp." },
  { q: "What languages are supported?",         a: "Currently 14–20 languages including English, French, Spanish, Portuguese, Arabic, Yoruba, Hausa, Igbo, Amharic, Swahili, Mandarin, Hindi, and more being added." },
  { q: "How do I report a violation?",          a: `Tap the three-dot menu on any Vibe, Space, or profile and select Report. Our moderation team reviews within 24 hours. Appeal any decision at ${COMPANY.email}.` },
];

export default function HelpPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <Label color={COLORS.teal}>Help Center</Label>
          <h1 className="font-sora font-extrabold text-5xl mt-6">How can we help?</h1>
        </Wrap>
      </Sec>
      <Sec>
        <Wrap narrow>
          <div className="space-y-3">
            {FAQS.map(f => (
              <details key={f.q} className="rounded-xl group" style={card}>
                <summary className="flex items-center justify-between p-5 cursor-pointer font-sora font-semibold text-sm list-none">
                  {f.q}
                  <Icon d={ic.chevD} s={15} style={{ color: dark ? "#4A4962" : "#BABAC8", flexShrink: 0, marginLeft: 16 }} className="group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 pt-3 font-dm text-sm leading-relaxed" style={{ color: sub, borderTop: `1px solid ${border}` }}>
                  {f.a}
                </div>
              </details>
            ))}
          </div>
          <div className="mt-8 p-5 rounded-xl text-center" style={card}>
            <p className="font-dm text-sm mb-3" style={{ color: sub }}>Can't find what you need?</p>
            <a href={`mailto:${COMPANY.email}`}><Btn variant="primary">Contact support</Btn></a>
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

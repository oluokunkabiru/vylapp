import { Icon, ic, Label, SectionLabel, Btn, Wrap, Sec, sectionBorder, textSub } from "../components/UI";
import { COLORS, STATS, IMAGES } from "../config";

const COMPARE = [
  { p: "Instagram", split: "0%",   risk: "Algorithm controls reach",    own: "No" },
  { p: "TikTok",    split: "~54%", risk: "Demonetized without warning", own: "No" },
  { p: "YouTube",   split: "55%",  risk: "Strikes and policy changes",  own: "No" },
  { p: "Vylapp",    split: "85%",  risk: "None. You own the audience.", own: "Yes", hi: true },
];

const TOOLS = [
  { ico: "heart",    title: "Super Vibes",            desc: "Fans tip you with Super Vibes. You earn on every interaction that matters." },
  { ico: "star",     title: "Raven Program",          desc: "Founding creators lock 85/15 for life. Raven badge on profile. Earlier = better." },
  { ico: "layers",   title: "Autopilot",              desc: "AI schedules content. Stay consistent without burning out. Zero third-party tools." },
  { ico: "mic",      title: "Ticketed Spaces",        desc: "Host paid live rooms. $1–$100+ per listener. You keep 80–90%." },
  { ico: "users",    title: "Owned Subscriber List",  desc: "Export your subscriber list any time. It belongs to you forever." },
  { ico: "trending", title: "Cultural Reach Score",   desc: "Which global markets are you reaching? A metric only Vylapp has." },
];

export default function CreatorsPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Label color={COLORS.amber}>For creators</Label>
              <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 leading-tight">
                Your community belongs to you.<br />
                <span style={{ color: COLORS.amber }}>Not the algorithm.</span>
              </h1>
              <p className="mt-6 text-xl font-dm leading-relaxed" style={{ color: sub }}>
                Vylapp is the first platform where walking away never means starting over.
              </p>
              <Btn variant="primary" onClick={() => {}} className="mt-8">Join the founding cohort</Btn>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.creator} alt="Creator building their community" className="w-full h-[400px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
          </div>
        </Wrap>
      </Sec>

      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <SectionLabel color={COLORS.amber}>Platform comparison</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full max-w-3xl border-collapse">
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {["Platform","Creator split","Risk","Own audience?"].map(h => (
                    <th key={h} className="text-left py-3 font-mono text-[10px] uppercase tracking-wider pr-8" style={{ color: dark ? "#4A4962" : "#A0A0B0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(r => (
                  <tr key={r.p} style={{ borderBottom: `1px solid ${border}`, background: r.hi ? `${COLORS.violet}08` : "transparent" }}>
                    <td className="py-4 font-sora font-bold pr-8" style={{ color: r.hi ? COLORS.violet : "inherit" }}>{r.p}</td>
                    <td className="py-4 font-mono text-sm pr-8" style={{ color: r.hi ? COLORS.teal : sub, fontWeight: r.hi ? 700 : 400 }}>{r.split}</td>
                    <td className="py-4 font-dm text-sm pr-8"    style={{ color: r.hi ? COLORS.teal : sub }}>{r.risk}</td>
                    <td className="py-4 font-mono text-sm font-bold" style={{ color: r.hi ? COLORS.teal : dark ? "#4A4962" : "#BABAC8" }}>{r.own}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Wrap>
      </Sec>

      <Sec>
        <Wrap>
          <SectionLabel color={COLORS.amber}>Creator tools</SectionLabel>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
            {TOOLS.map(t => (
              <div key={t.title} className="flex gap-5 p-5 rounded-xl" style={card}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${COLORS.amber}18`, border: `1px solid ${COLORS.amber}30` }}>
                  <Icon d={ic[t.ico]} s={17} style={{ color: COLORS.amber }} />
                </div>
                <div>
                  <p className="font-sora font-bold mb-1">{t.title}</p>
                  <p className="font-dm text-sm leading-relaxed" style={{ color: sub }}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

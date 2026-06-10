import { Icon, ic, Label, SectionLabel, Wrap, Sec, Avatar, sectionBorder, textSub } from "../components/UI";
import { COLORS, COMPANY, IMAGES } from "../config";

export default function AboutPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap narrow>
          <Label color={COLORS.violet}>Our story</Label>
          <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 leading-tight">
            Built for the world<br />that actually exists.
          </h1>
          <p className="mt-8 text-xl font-dm font-light leading-relaxed" style={{ color: sub }}>
            Most social platforms were designed for one language, one culture. We built Vylapp for everyone else.
          </p>
        </Wrap>
      </Sec>

      <div style={{ borderBottom: `1px solid ${border}` }}>
        <img src={IMAGES.africa} alt="Community connected globally" className="w-full max-h-80 object-cover object-top" style={{ opacity: dark ? 0.7 : 0.9 }} />
      </div>

      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap narrow>
          <SectionLabel color={COLORS.violet}>The mission</SectionLabel>
          <div className="space-y-6 font-dm text-lg leading-loose" style={{ color: sub }}>
            <p>Vylapp exists because a farmer in Lagos, an artist in Tokyo, a DAO builder in Berlin, and a learner in São Paulo should be able to exist in the same community — understand each other in real time — and build real relationships.</p>
            <p>Language has always been the wall. We removed it. Not by bolting on a translation widget, but by making multilingual communication the architectural foundation of the platform itself.</p>
            <p>Every feature was built with one assumption first: the person sending a message and the person receiving it might speak different languages. That assumption changes everything.</p>
          </div>
        </Wrap>
      </Sec>

      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <SectionLabel color={COLORS.teal}>Company</SectionLabel>
          <div className="grid sm:grid-cols-3 gap-5">
            {[["Founded", COMPANY.year, "Indianapolis, Indiana"], ["Entity", COMPANY.name, `${COMPANY.state} LLC`], ["Contact", COMPANY.email, COMPANY.website]].map(([l, v, s]) => (
              <div key={l} className="p-6 rounded-xl" style={card}>
                <p className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: dark ? "#4A4962" : "#A0A0B0" }}>{l}</p>
                <p className="font-sora font-bold text-lg">{v}</p>
                <p className="font-dm text-sm mt-1" style={{ color: sub }}>{s}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>

      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <SectionLabel color={COLORS.violet}>Our team & advisors</SectionLabel>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Remi Kowalski", role: "CEO & Co-founder", desc: "Built decentralized agri-networks across East Africa.", avatarColor: COLORS.violet },
              { name: "Sena Osei", role: "CTO & Co-founder", desc: "Creator of phonetic-matrix NLP parser for low-resource languages.", avatarColor: COLORS.teal },
              { name: "Leon Chen", role: "Product Director", desc: "Ex-Design Lead at leading global collaboration networks.", avatarColor: COLORS.coral },
              { name: "Tanvi Patel", role: "Advisory Board", desc: "Director of Global Language Inclusion at ImpactDAO.", avatarColor: COLORS.amber }
            ].map((m) => (
              <div key={m.name} className="p-6 rounded-xl flex flex-col items-center text-center" style={card}>
                <Avatar name={m.name} color={m.avatarColor} size={64} />
                <p className="font-sora font-bold mt-4 text-base">{m.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider mt-1" style={{ color: COLORS.violet }}>{m.role}</p>
                <p className="font-dm text-xs mt-3 leading-relaxed" style={{ color: sub }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>

      <Sec>
        <Wrap narrow>
          <SectionLabel color={COLORS.violet}>What we believe</SectionLabel>
          <div className="space-y-3">
            {[
              "Community trust is the most important asset a platform can have.",
              "Revenue follows community health — not the other way around.",
              "Your language is not a niche. It is your culture.",
              "Creators should own their audience, not rent it from an algorithm.",
              "The best translation is the one you don't notice.",
            ].map(b => (
              <div key={b} className="flex gap-4 items-start p-5 rounded-xl" style={card}>
                <Icon d={ic.check} s={14} style={{ color: COLORS.violet, marginTop: 3, flexShrink: 0 }} />
                <p className="font-dm leading-relaxed" style={{ color: sub }}>{b}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

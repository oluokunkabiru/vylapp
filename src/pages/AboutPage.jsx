import { Icon, ic, Label, SectionLabel, Wrap, Sec, Avatar, sectionBorder, textSub } from "../components/UI";
import { COLORS, COMPANY, IMAGES } from "../config";
import { TEAM_MEMBERS } from "../data";

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

      <div className="px-6 md:px-12 max-w-6xl mx-auto pb-10" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
          <img
            src={IMAGES.africa}
            alt="Vylapp vision — diverse creators across Lagos, Kano, Nairobi, and London connected through language"
            className="w-full max-h-[460px] object-cover"
            style={{ opacity: dark ? 0.85 : 0.95 }}
          />
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4" style={{ background: "linear-gradient(to top, rgba(8,7,15,0.85) 0%, transparent 100%)" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">The Vylapp Vision</p>
            <p className="font-dm text-white/90 text-sm mt-1">
              Creators in Lagos, Kano, Nairobi, and London — in the same community, in their own language.
            </p>
          </div>
        </div>
      </div>

      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap narrow>
          <SectionLabel color={COLORS.violet}>The mission</SectionLabel>
          <div className="space-y-6 font-dm text-lg leading-loose" style={{ color: sub }}>
            <p>Vylapp exists because a creator in Lagos, a learner in Kano, an artist in Nairobi, and a builder in São Paulo should be able to exist in the same community — understand each other in real time — and build real relationships without translation being an obstacle.</p>
            <p>Language has always been the wall. We removed it. Not by bolting on a third-party translation widget, but by making multilingual communication the architectural foundation of the platform itself. Every feature is built on one assumption: the person sending a message and the person receiving it might speak different languages. That assumption changes everything.</p>
            <p>Vylapp was built by a team with deep roots in finance, engineering, creative direction, and community — a team that understands that Africa and the African diaspora are not niche markets. They are the next billion users.</p>
          </div>
        </Wrap>
      </Sec>

      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <SectionLabel color={COLORS.teal}>Company</SectionLabel>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              ["Founded",  COMPANY.year,    "Indianapolis, Indiana"],
              ["Entity",   COMPANY.name,    `${COMPANY.state} LLC`],
              ["Founder",  COMPANY.founder, "Managing Member & Registered Agent"],
              ["Contact",  COMPANY.email,   COMPANY.website],
            ].map(([l, v, s]) => (
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
          <SectionLabel color={COLORS.violet}>Our team</SectionLabel>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {TEAM_MEMBERS.map((m) => (
              <div key={m.name} className="p-6 rounded-xl flex flex-col items-center text-center" style={card}>
                {m.photo ? (
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="w-16 h-16 rounded-full object-cover object-top"
                    style={{ border: `2px solid ${m.avatarColor}40` }}
                  />
                ) : (
                  <Avatar name={m.name} color={m.avatarColor} size={64} />
                )}
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

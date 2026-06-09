import { Label, Wrap, Sec, Avatar, sectionBorder, textSub, textMuted } from "../components/UI";
import { COMMUNITIES } from "../data";
import { COLORS } from "../config";

const COMMUNITY_DETAILS = {
  tech:     { members: "4,200+", vibes: "12K", personas: ["Aisha Kamara","Leon Chen","Marcus Osei"],     topics: ["DAOs","Web3","AI","Build in Public"] },
  global:   { members: "9,100+", vibes: "31K", personas: ["Remi Kowalski","Sena Osei","Tanvi Patel"],    topics: ["AgriTech","Climate","Impact","Africa"] },
  creative: { members: "3,800+", vibes: "9K",  personas: ["Jade Nakamura","Leon Chen"],                  topics: ["Generative Art","Design","Creator Economy"] },
  human:    { members: "6,500+", vibes: "18K", personas: ["Tanvi Patel","Marcus Osei"],                  topics: ["Learning","Accountability","Second Brain"] },
  agri:     { members: "2,100+", vibes: "7K",  personas: ["Remi Kowalski","Sena Osei"],                  topics: ["Farming Innovation","Food Security","Rural Tech"] },
};

export default function CommunitiesPage({ dark }) {
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
          <Label color={COLORS.teal}>Communities</Label>
          <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 max-w-2xl leading-tight">
            Five verticals. One platform. Every language.
          </h1>
        </Wrap>
      </Sec>

      <Sec>
        <Wrap>
          <div className="space-y-5">
            {COMMUNITIES.map(c => {
              const detail = COMMUNITY_DETAILS[c.key];
              return (
                <div key={c.key} className="grid md:grid-cols-3 gap-6 p-6 rounded-2xl" style={card}>
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{c.emoji}</span>
                      <div>
                        <p className="font-sora font-bold text-xl" style={{ color: c.accent }}>{c.label}</p>
                        <p className="font-dm text-sm" style={{ color: sub }}>{c.desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {detail.topics.map(t => <Label key={t} color={c.accent}>{t}</Label>)}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[["Members", detail.members], ["Vibes / month", detail.vibes]].map(([k, v]) => (
                      <div key={k} className="flex justify-between pb-2" style={{ borderBottom: `1px solid ${border}` }}>
                        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: muted }}>{k}</span>
                        <span className="font-mono text-sm font-semibold" style={{ color: c.accent }}>{v}</span>
                      </div>
                    ))}
                    <div className="space-y-2 pt-1">
                      {detail.personas.map(p => (
                        <div key={p} className="flex items-center gap-2">
                          <Avatar name={p} color={c.accent} size={22} />
                          <span className="font-dm text-xs" style={{ color: sub }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

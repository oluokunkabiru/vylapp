import { Icon, ic, Label, Wrap, Sec, sectionBorder, textSub } from "../components/UI";
import { COLORS } from "../config";

const FEATURES = [
  { ico: "zap",      title: "Vibe Feed",           desc: "Interest-ranked across 5 topic verticals. AI-sorted. Weekly Digest. Zero empty states on day one.",  accent: COLORS.violet, tag: "Core" },
  { ico: "mic",      title: "Spaces",              desc: "Live audio and video rooms. Join under 2 seconds. Real-time multilingual captions. Ticketed or open.", accent: COLORS.teal,   tag: "Live" },
  { ico: "globe",    title: "Translation Engine",  desc: "14–20 languages incl. Yoruba, Hausa, Igbo, Amharic, Swahili. Zero third-party API. Built in-house.",  accent: COLORS.teal,   tag: "Unique" },
  { ico: "trending", title: "Cultural Reach Score",desc: "See how many languages and countries your content reached. A metric only Vylapp has.",               accent: COLORS.violet, tag: "Unique" },
  { ico: "sparkle",  title: "AI Vibe Assistant",   desc: "Helps non-native speakers post confidently. Powered by community vocabulary, not generic templates.",  accent: COLORS.amber,  tag: "AI" },
  { ico: "layers",   title: "Autopilot",           desc: "AI-powered content scheduling. Zero third-party tools. Stay consistent without daily effort.",          accent: COLORS.coral,  tag: "Creator" },
  { ico: "heart",    title: "Super Vibes",         desc: "Tipped reactions — fans send Super Vibes to content they love. Creators earn directly.",               accent: COLORS.coral,  tag: "Creator" },
  { ico: "star",     title: "Raven Program",       desc: "85/15 revenue split locked for founding creators. Raven badge on profile. Earlier = better terms.",    accent: COLORS.amber,  tag: "Creator" },
  { ico: "msg",      title: "DMs & Group Chats",   desc: "Offline-first queue. Auto-language detection. Translate any message with one tap.",                    accent: COLORS.teal,   tag: "Messaging" },
  { ico: "shield",   title: "Trust & Safety",      desc: "Progressive trust scoring. AI-assisted moderation. Fast transparent appeals.",                          accent: COLORS.violet, tag: "Safety" },
  { ico: "trending", title: "Culture Discovery",   desc: "Trending by language. Rising creators from underrepresented communities surfaced actively.",            accent: COLORS.teal,   tag: "Discovery" },
  { ico: "cpu",      title: "Creator Analytics",   desc: "AI growth recommendations. Cultural Reach Score tracking. Earnings in one dashboard.",                 accent: COLORS.violet, tag: "Analytics" },
];

export default function FeaturesPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <Label color={COLORS.violet}>Platform features</Label>
          <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 max-w-2xl leading-tight">
            Every feature built for a multilingual world.
          </h1>
          <p className="mt-5 text-xl font-dm leading-relaxed max-w-xl" style={{ color: sub }}>
            No add-ons. Translation, community, and creator tools on the same foundation.
          </p>
        </Wrap>
      </Sec>

      <Sec>
        <Wrap>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-xl flex flex-col" style={card}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}30` }}>
                    <Icon d={ic[f.ico]} s={18} style={{ color: f.accent }} />
                  </div>
                  <Label color={f.accent}>{f.tag}</Label>
                </div>
                <p className="font-sora font-bold mb-2">{f.title}</p>
                <p className="font-dm text-sm leading-relaxed flex-1" style={{ color: sub }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Icon, ic, Label, SectionLabel, Wrap, Sec, Btn, sectionBorder, textSub } from "../components/UI";
import { COLORS, STATS, IMAGES } from "../config";

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

const UNIQUE = [
  { label: STATS.languages,   desc: "Languages supported",          color: COLORS.teal },
  { label: STATS.members,     desc: "Founding members on waitlist", color: COLORS.violet },
  { label: STATS.creatorSplit,desc: "Revenue split for creators",   color: COLORS.amber },
  { label: "0",               desc: "Third-party translation APIs", color: COLORS.coral },
];

export default function FeaturesPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      {/* Header */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Label color={COLORS.violet}>Platform features</Label>
              <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 leading-tight">
                Every feature built for a<br />
                <span style={{ color: COLORS.violet }}>multilingual world.</span>
              </h1>
              <p className="mt-5 text-xl font-dm leading-relaxed" style={{ color: sub }}>
                No add-ons. No bolt-ons. Translation, community, live audio, and creator monetization on the same architectural foundation — built from scratch.
              </p>
              <div className="flex gap-3 mt-8">
                <Link to="/pricing"><Btn variant="primary">See pricing <Icon d={ic.arrow} s={13} /></Btn></Link>
                <Link to="/spaces"><Btn variant="outline">Try Spaces</Btn></Link>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.community} alt="Diverse community on Vylapp" className="w-full h-[380px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* Stats bar */}
      <div className="py-8" style={{ borderBottom: `1px solid ${border}`, background: dark ? "#0A0919" : "#F8F7FF" }}>
        <Wrap>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {UNIQUE.map(u => (
              <div key={u.desc} className="text-center">
                <p className="font-sora font-extrabold text-4xl" style={{ color: u.color }}>{u.label}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider mt-1" style={{ color: dark ? "#4A4962" : "#A0A0B0" }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </div>

      {/* Feature grid */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <SectionLabel color={COLORS.violet}>All features</SectionLabel>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
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

      {/* What makes us different */}
      <Sec>
        <Wrap>
          <div className="text-center mb-10">
            <SectionLabel color={COLORS.teal}>What makes us different</SectionLabel>
            <h2 className="font-sora font-bold text-3xl md:text-4xl mt-3">No platform does what Vylapp does</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              ["In-house translation", "We built our multilingual engine from scratch. No Google Translate, no third-party API, no privacy compromise. It runs in your browser, offline-first."],
              ["Owned community", "Your subscriber list is yours — always. Export it as CSV at any time, on any plan. No platform lock-in, ever."],
              ["Founding economics", "85/15 revenue split locked for life for Raven-tier early creators. The best economics in social media, guaranteed by our founding terms."],
            ].map(([t, d]) => (
              <div key={t} className="p-6 rounded-2xl" style={{ border: `2px solid ${COLORS.teal}20`, background: dark ? `${COLORS.teal}06` : `${COLORS.teal}04` }}>
                <Icon d={ic.check} s={20} style={{ color: COLORS.teal, marginBottom: 12 }} />
                <p className="font-sora font-bold mb-2">{t}</p>
                <p className="font-dm text-sm leading-relaxed" style={{ color: sub }}>{d}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

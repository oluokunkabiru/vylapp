import { Link } from "react-router-dom";
import { Icon, ic, Label, SectionLabel, Btn, Avatar, Wrap, Sec, Card, sectionBorder, textSub, textMuted } from "../components/UI";
import { COMMUNITIES, VIBES_TICKER } from "../data";
import { COLORS, BRAND, STATS, IMAGES } from "../config";

export default function HomePage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const muted  = textMuted(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="fade-up">
              <Label color={COLORS.violet}>Now in early access</Label>
              <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 leading-[1.06] tracking-tight">
                Vibe.<br />Learn.<br />
                <span style={{ color: COLORS.violet }}>Connect.</span>
              </h1>
              <p className="mt-7 text-lg font-dm font-light leading-relaxed max-w-md" style={{ color: sub }}>
                {BRAND.description} Real conversations, live Spaces, and creators who own what they build.
              </p>
              <div className="flex flex-wrap gap-3 mt-10">
                <Link to="/features">
                  <Btn variant="primary">
                    Explore the platform <Icon d={ic.arrow} s={15} />
                  </Btn>
                </Link>
                <Link to="/creators">
                  <Btn variant="outline">For creators</Btn>
                </Link>
              </div>
              <div className="flex flex-wrap gap-8 mt-12 pt-10" style={{ borderTop: `1px solid ${border}` }}>
                {[
                  [STATS.languages,    "Languages"],
                  [STATS.members,      "Founding members"],
                  [STATS.communities,  "Communities"],
                  [STATS.creatorSplit, "Creator split"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <p className="font-sora font-extrabold text-2xl">{n}</p>
                    <p className="font-mono text-[10px] tracking-wide uppercase mt-0.5" style={{ color: muted }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image with floating stat cards */}
            <div className="hidden lg:block relative">
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                <img
                  src={IMAGES.hero}
                  alt="Diverse global community collaborating"
                  className="w-full h-[480px] object-cover"
                  style={{ opacity: dark ? 0.85 : 0.95 }}
                />
              </div>
              <div className="absolute -bottom-4 -left-4 px-4 py-3 rounded-xl" style={{ ...card, backdropFilter: "blur(12px)" }}>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: muted }}>Active right now</p>
                <p className="font-sora font-bold text-lg mt-0.5">1,840 in Spaces</p>
              </div>
              <div className="absolute -top-4 -right-4 px-4 py-3 rounded-xl" style={{ ...card, backdropFilter: "blur(12px)" }}>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: muted }}>Languages live</p>
                <p className="font-sora font-bold text-lg mt-0.5" style={{ color: COLORS.teal }}>14+</p>
              </div>
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* ── VIBE TICKER ─────────────────────────────────────────────────── */}
      <div className="py-5 ticker-wrap" style={{ borderBottom: `1px solid ${border}`, background: dark ? "#0A0919" : "#F8F7FF" }}>
        <p className="font-mono text-[9px] tracking-[0.22em] uppercase px-6 md:px-12 mb-3" style={{ color: muted }}>
          Live from the community
        </p>
        <div className="ticker-inner">
          {[...VIBES_TICKER, ...VIBES_TICKER].map((v, i) => (
            <div key={i} className="flex-shrink-0 mx-3 w-72 rounded-xl p-4" style={card}>
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Avatar name={v.user} color={[COLORS.violet,COLORS.teal,COLORS.amber,COLORS.coral,COLORS.teal,COLORS.violet,COLORS.teal][i % 7]} size={28} />
                  <div>
                    <p className="font-dm font-semibold text-xs">{v.user}</p>
                    <p className="font-mono text-[9px]" style={{ color: muted }}>{v.handle}</p>
                  </div>
                </div>
                <Label color={COLORS.violet}>{v.cat}</Label>
              </div>
              <p className="font-dm text-xs leading-relaxed" style={{ color: sub }}>{v.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── COMMUNITIES ─────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <SectionLabel color={COLORS.teal}>Topic communities</SectionLabel>
          <h2 className="font-sora font-bold text-3xl md:text-4xl mb-10">Find where you belong</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {COMMUNITIES.map(c => (
              <Link key={c.key} to="/communities" className="text-left p-5 rounded-xl transition-all hover:scale-[1.02] block" style={card}>
                <span className="text-2xl block mb-3">{c.emoji}</span>
                <p className="font-sora font-bold text-sm mb-1" style={{ color: c.accent }}>{c.label}</p>
                <p className="font-dm text-xs leading-relaxed" style={{ color: sub }}>{c.desc}</p>
              </Link>
            ))}
          </div>
        </Wrap>
      </Sec>

      {/* ── TRANSLATION MOAT ────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.community} alt="Global community connecting" className="w-full h-[380px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
            <div>
              <SectionLabel color={COLORS.teal}>Translation moat</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mb-5">
                Your language is never<br />a barrier here.
              </h2>
              <p className="font-dm leading-relaxed mb-8" style={{ color: sub }}>
                We built an organic multilingual engine — no third-party APIs, no Google Translate, no compromise. Real-time translation in 14–20 languages including Yoruba, Hausa, Igbo, Amharic, and Swahili.
              </p>
              {["Real-time captions in Spaces — auto-detected, zero setup", "Cultural Reach Score: see how many countries you've reached", "AI Vibe Assistant: post confidently in any language", "Organic engine built in-house. No external API dependency."].map(f => (
                <div key={f} className="flex items-start gap-3 mb-3">
                  <Icon d={ic.check} s={14} style={{ color: COLORS.teal, marginTop: 2, flexShrink: 0 }} />
                  <span className="font-dm text-sm" style={{ color: sub }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* ── SPACES ──────────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel color={COLORS.violet}>Live Spaces</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mb-5">
                Live rooms where real<br />conversations happen.
              </h2>
              <p className="font-dm leading-relaxed mb-8" style={{ color: sub }}>
                Join any Space in under 2 seconds. Host AMAs, community calls, or weekly drops. Charge tickets. The room lives on with auto-generated transcripts.
              </p>
              <Link to="/spaces"><Btn variant="teal">Explore Spaces <Icon d={ic.arrow} s={14} /></Btn></Link>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.spaces} alt="People in a live audio conversation" className="w-full h-[360px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* ── CREATOR ─────────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.creator} alt="Creator building their community" className="w-full h-[400px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
            <div>
              <SectionLabel color={COLORS.amber}>For creators</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mb-5">
                Your community.<br />Your revenue.
              </h2>
              <p className="font-dm leading-relaxed mb-8" style={{ color: sub }}>
                {STATS.creatorSplit} split, owned subscriber list, and live Spaces you monetize directly. Zero algorithm risk. Your audience is yours forever.
              </p>
              <div className="space-y-3 mb-8">
                {[["85%","Revenue goes to you, always"],["Super Vibes","Earn from tips on your content"],["Raven program","Founding creators lock rates for life"]].map(([v, l]) => (
                  <div key={l} className="flex items-center justify-between p-4 rounded-xl" style={card}>
                    <span className="font-mono text-sm font-semibold" style={{ color: COLORS.amber }}>{v}</span>
                    <span className="font-dm text-sm" style={{ color: sub }}>{l}</span>
                  </div>
                ))}
              </div>
              <Link to="/creators"><Btn variant="primary">See creator program <Icon d={ic.arrow} s={14} /></Btn></Link>
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <Sec>
        <Wrap>
          <div className="text-center max-w-2xl mx-auto">
            <Label color={COLORS.violet}>Join the founding community</Label>
            <h2 className="font-sora font-extrabold text-4xl md:text-5xl mt-6 mb-5 tracking-tight">Ready to vibe?</h2>
            <p className="font-dm leading-relaxed mb-10 text-lg" style={{ color: sub }}>
              Join thousands of creators and community members building in public — in their own language.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Btn variant="primary">Create free account</Btn>
              <Link to="/about"><Btn variant="ghost">Learn about Vylapp</Btn></Link>
            </div>
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

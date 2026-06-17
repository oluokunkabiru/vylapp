import { Link } from "react-router-dom";
import { useState } from "react";
import { Icon, ic, Label, SectionLabel, Btn, Avatar, Wrap, Sec, Card, sectionBorder, textSub, textMuted } from "../components/UI";
import { COMMUNITIES, VIBES_TICKER, LIVE_SPACES, TEAM_MEMBERS } from "../data";
import { COLORS, BRAND, STATS, IMAGES, COMPANY } from "../config";
import TranslationPlayground from "../components/TranslationPlayground";
import WaitlistModal from "../components/WaitlistModal";

export default function HomePage({ dark }) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
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
              <h1 className="font-sora font-extrabold text-5xl md:text-7xl mt-6 leading-[1.0] tracking-tight">
                Vibe.<br />Learn.<br />
                <span style={{ color: COLORS.violet }}>Connect.</span>
              </h1>
              <p className="mt-7 text-xl font-dm font-light leading-relaxed max-w-md" style={{ color: sub }}>
                The global community platform where your language is never a barrier. Real conversations, live Spaces, and creators who own what they build — in every language.
              </p>
              <div className="flex flex-wrap gap-3 mt-10">
                <Btn variant="primary" onClick={() => setWaitlistOpen(true)}>
                  Join the waitlist <Icon d={ic.arrow} s={15} />
                </Btn>
                <Link to="/features">
                  <Btn variant="outline">Explore features</Btn>
                </Link>
              </div>
              <div className="flex flex-wrap gap-8 mt-12 pt-10" style={{ borderTop: `1px solid ${border}` }}>
                {[
                  [STATS.languages,    "Languages supported"],
                  [STATS.members,      "Founding members"],
                  [STATS.communities,  "Communities"],
                  [STATS.creatorSplit, "Creator revenue split"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <p className="font-sora font-extrabold text-3xl">{n}</p>
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
                  className="w-full h-[520px] object-cover"
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

      {/* ── MISSION + VISION ────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionLabel color={COLORS.violet}>Our mission</SectionLabel>
              <h2 className="font-sora font-extrabold text-4xl md:text-5xl mt-4 leading-tight">
                Language is not a barrier.<br />
                <span style={{ color: COLORS.violet }}>It is a bridge.</span>
              </h2>
              <p className="mt-6 font-dm text-lg leading-loose" style={{ color: sub }}>
                The internet was invented in English. Most of it still thinks in English. But the 5 billion people who use it — do not. A creator in Lagos, a learner in Kano, an artist in Nairobi, and a builder in São Paulo should be in the same community, understanding each other in real time.
              </p>
              <p className="mt-4 font-dm text-lg leading-loose" style={{ color: sub }}>
                We refused to build another platform that asks them to adapt. Vylapp is built on one assumption: that the person sending a message and the person receiving it might speak different languages — and that this should not matter.
              </p>
              <Link to="/manifesto" className="inline-flex items-center gap-2 mt-6 font-dm font-semibold text-sm" style={{ color: COLORS.violet }}>
                Read the manifesto <Icon d={ic.arrow} s={13} />
              </Link>
            </div>
            <div className="p-8 rounded-2xl" style={{ border: `2px solid ${COLORS.violet}20`, background: dark ? `${COLORS.violet}06` : `${COLORS.violet}04` }}>
              <SectionLabel color={COLORS.teal}>The vision</SectionLabel>
              <p className="font-sora font-bold text-2xl mt-4 leading-snug" style={{ color: dark ? "#F5F4FF" : "#0D0C1A" }}>
                "To become the world's most culturally inclusive community platform — where every language, every creator, and every community matters equally."
              </p>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-wider" style={{ color: muted }}>
                — {COMPANY.founder}, Founder &amp; CEO, {COMPANY.name}
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Community trust is the most important asset a platform can have.",
                  "Revenue follows community health — never the other way around.",
                  "Creators should own their audience, not rent it from an algorithm.",
                ].map(b => (
                  <div key={b} className="flex gap-3 items-start">
                    <Icon d={ic.check} s={13} style={{ color: COLORS.teal, marginTop: 3, flexShrink: 0 }} />
                    <p className="font-dm text-sm leading-relaxed" style={{ color: sub }}>{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* ── CORE PILLARS ────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}`, background: dark ? "#0A0919" : "#F8F7FF" }}>
        <Wrap>
          <div className="text-center mb-12">
            <SectionLabel color={COLORS.violet}>Non-negotiable</SectionLabel>
            <h2 className="font-sora font-extrabold text-4xl md:text-5xl mt-4">Four core pillars</h2>
            <p className="mt-3 font-dm text-lg max-w-xl mx-auto" style={{ color: sub }}>
              This is how Vylapp avoids being just another app and becomes a daily universe.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "globe",    color: COLORS.teal,   title: "Translation First",     tag: "Unique",   desc: "Every feature assumes two people might speak different languages. Real-time captions, 14+ languages, zero third-party API dependency." },
              { icon: "mic",      color: COLORS.violet, title: "Live Spaces",            tag: "Live",     desc: "Audio rooms that go live in 2 seconds. Ticketed or open. Real-time multilingual captions. Transcripts stay on your profile." },
              { icon: "star",     color: COLORS.amber,  title: "Creator Economy",        tag: "Creator",  desc: "85% revenue split. Owned subscriber list. Raven program locks your rate for life. The highest guaranteed split in social media." },
              { icon: "users",    color: COLORS.coral,  title: "Topic Communities",      tag: "Core",     desc: "5 curated verticals — Tech, Global, Creative, Human Potential, AgriTech. Interest-ranked feeds with zero empty states from day one." },
            ].map(p => (
              <div key={p.title} className="p-6 rounded-2xl flex flex-col" style={card}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                  <Icon d={ic[p.icon]} s={20} style={{ color: p.color }} />
                </div>
                <Label color={p.color}>{p.tag}</Label>
                <p className="font-sora font-bold text-lg mt-3 mb-2">{p.title}</p>
                <p className="font-dm text-sm leading-relaxed flex-1" style={{ color: sub }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>

      {/* ── COMMUNITIES ─────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <SectionLabel color={COLORS.teal}>Topic communities</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mt-2">Find where you belong</h2>
            </div>
            <Link to="/communities">
              <Btn variant="outline">View all communities <Icon d={ic.arrow} s={13} /></Btn>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {COMMUNITIES.map(c => (
              <Link key={c.key} to="/communities" className="text-left p-5 rounded-xl transition-all hover:scale-[1.02] block" style={card}>
                <span className="text-3xl block mb-3">{c.emoji}</span>
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
            <div>
              <TranslationPlayground dark={dark} />
            </div>
            <div>
              <SectionLabel color={COLORS.teal}>Translation moat</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mb-5">
                Your language is never<br />a barrier here.
              </h2>
              <p className="font-dm leading-relaxed mb-6" style={{ color: sub }}>
                We built an organic multilingual engine — no third-party APIs, no Google Translate, no compromise. Real-time translation in 14–20 languages including Yoruba, Hausa, Igbo, Amharic, and Swahili. Built from the ground up by a team that understands what language actually means to culture.
              </p>
              {[
                "Real-time captions in Spaces — auto-detected, zero setup",
                "Cultural Reach Score: see how many countries you've reached",
                "AI Vibe Assistant: post confidently in any language",
                "Organic engine built in-house — no external API dependency",
                "Supports Yoruba, Hausa, Igbo, Amharic, Swahili, and more",
              ].map(f => (
                <div key={f} className="flex items-start gap-3 mb-3">
                  <Icon d={ic.check} s={14} style={{ color: COLORS.teal, marginTop: 2, flexShrink: 0 }} />
                  <span className="font-dm text-sm" style={{ color: sub }}>{f}</span>
                </div>
              ))}
              <Link to="/features" className="inline-flex items-center gap-2 mt-4 font-dm font-semibold text-sm" style={{ color: COLORS.teal }}>
                See all features <Icon d={ic.arrow} s={13} />
              </Link>
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* ── SPACES ──────────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}`, background: dark ? "#0A0919" : "#F8F7FF" }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel color={COLORS.violet}>Live Spaces</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mb-5">
                Live rooms where real<br />conversations happen.
              </h2>
              <p className="font-dm leading-relaxed mb-6" style={{ color: sub }}>
                Join any Space in under 2 seconds. Host AMAs, community calls, or weekly drops. Charge tickets. The room lives on with auto-generated transcripts and AI summaries — in every language your audience speaks.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  ["Open",     "Free rooms — anyone can join and listen"],
                  ["Ticketed", "Charge $1–$100+ per listener. You keep 80–90%."],
                  ["Private",  "Invite-only rooms for your inner community."],
                ].map(([v, d]) => (
                  <div key={v} className="flex items-center gap-4 p-4 rounded-xl" style={card}>
                    <span className="font-mono text-xs font-bold w-16 flex-shrink-0" style={{ color: COLORS.violet }}>{v}</span>
                    <span className="font-dm text-sm" style={{ color: sub }}>{d}</span>
                  </div>
                ))}
              </div>
              <Link to="/spaces"><Btn variant="teal">Explore Spaces <Icon d={ic.arrow} s={14} /></Btn></Link>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.spaces} alt="People in a live audio conversation" className="w-full h-[400px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
          </div>
        </Wrap>
      </Sec>

      {/* ── LIVE SPACES PREVIEW ──────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="flex items-center gap-2.5 mb-8">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: COLORS.coral }} />
            <SectionLabel color={COLORS.coral}>Live now</SectionLabel>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {LIVE_SPACES.map(s => (
              <div key={s.id} className="p-5 rounded-xl" style={card}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
                  <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: COLORS.coral }}>Live</span>
                </div>
                <p className="font-sora font-bold text-sm leading-snug mb-2">{s.title}</p>
                <p className="font-mono text-[10px]" style={{ color: muted }}>{s.host} · {s.cat}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="font-mono text-xs font-semibold" style={{ color: s.accent }}>{s.listeners.toLocaleString()} listening</span>
                  <Link to="/spaces"><Btn variant="outline">Join</Btn></Link>
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>

      {/* ── CREATOR ─────────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.creator} alt="Creator building their community" className="w-full h-[440px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
            <div>
              <SectionLabel color={COLORS.amber}>For creators</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mb-5">
                Your community.<br />Your revenue.<br />
                <span style={{ color: COLORS.amber }}>Not the algorithm's.</span>
              </h2>
              <p className="font-dm leading-relaxed mb-6" style={{ color: sub }}>
                Vylapp is the first platform where walking away never means starting over. You own your subscriber list, you keep 85% of every dollar, and your Raven rate is locked for life — the earlier you join, the better the terms.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  ["85%",          "Revenue goes to you — always"],
                  ["Super Vibes",  "Earn from tips on your content and Spaces"],
                  ["Raven Program","Founding creators lock 85/15 for life"],
                  ["0% Lock-in",   "Export your subscriber list any time — it's yours"],
                ].map(([v, l]) => (
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

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}`, background: dark ? "#0A0919" : "#F8F7FF" }}>
        <Wrap>
          <div className="text-center mb-12">
            <SectionLabel color={COLORS.teal}>Simple to start</SectionLabel>
            <h2 className="font-sora font-extrabold text-4xl mt-4">How Vylapp works</h2>
            <p className="mt-3 font-dm text-lg max-w-xl mx-auto" style={{ color: sub }}>
              From sign-up to your first live Space in under 5 minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              ["01", "Create your profile",     "Pick your communities, set your language, and introduce yourself with your first Vibe."],
              ["02", "Join communities",         "Five topic verticals — Tech, Global, Creative, Human Potential, and AgriTech. Find your people."],
              ["03", "Go live in Spaces",        "Start or join a live audio room. Real-time captions in every listener's language. Zero setup."],
              ["04", "Own your audience",        "Build your subscriber list. It belongs to you — export it any time, forever, no matter what."],
            ].map(([n, t, d]) => (
              <div key={n} className="p-6 rounded-2xl" style={card}>
                <p className="font-mono text-3xl font-bold mb-4" style={{ color: `${COLORS.violet}30` }}>{n}</p>
                <p className="font-sora font-bold mb-2">{t}</p>
                <p className="font-dm text-sm leading-relaxed" style={{ color: sub }}>{d}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>

      {/* ── TEAM PREVIEW ─────────────────────────────────────────────────── */}
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <SectionLabel color={COLORS.violet}>The team</SectionLabel>
              <h2 className="font-sora font-bold text-3xl md:text-4xl mt-2">Built by people who get it</h2>
              <p className="mt-2 font-dm" style={{ color: sub }}>Finance, engineering, creative direction, and culture — in one team.</p>
            </div>
            <Link to="/about">
              <Btn variant="outline">Meet the full team <Icon d={ic.arrow} s={13} /></Btn>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {TEAM_MEMBERS.map((m) => (
              <div key={m.name} className="p-5 rounded-xl flex flex-col items-center text-center" style={card}>
                {m.photo ? (
                  <img src={m.photo} alt={m.name} className="w-14 h-14 rounded-full object-cover object-top" style={{ border: `2px solid ${m.avatarColor}40` }} />
                ) : (
                  <Avatar name={m.name} color={m.avatarColor} size={56} />
                )}
                <p className="font-sora font-bold mt-3 text-sm">{m.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider mt-1 leading-tight" style={{ color: m.avatarColor }}>{m.role}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <Sec>
        <Wrap>
          <div className="text-center max-w-2xl mx-auto">
            <Label color={COLORS.violet}>Join the founding community</Label>
            <h2 className="font-sora font-extrabold text-4xl md:text-5xl mt-6 mb-5 tracking-tight">Ready to vibe?</h2>
            <p className="font-dm leading-relaxed mb-4 text-lg" style={{ color: sub }}>
              Join thousands of creators and community members building in public — in their own language. Early members lock the best rates forever.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider mb-10" style={{ color: muted }}>
              {COMPANY.name} · {COMPANY.address}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Btn variant="primary" onClick={() => setWaitlistOpen(true)}>Join early access</Btn>
              <Link to="/about"><Btn variant="ghost">Learn about Vylapp</Btn></Link>
            </div>
          </div>
        </Wrap>
      </Sec>

      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} dark={dark} />
    </div>
  );
}

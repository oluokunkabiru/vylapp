import { Label, SectionLabel, Btn, Wrap, Sec, Icon, ic, sectionBorder, textSub, textMuted } from "../components/UI";
import { CHANGELOG } from "../data";
import { COLORS, COMPANY, IMAGES } from "../config";

// ─── MANIFESTO ────────────────────────────────────────────────────────────────
export function ManifestoPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);

  return (
    <div className="pt-16">
      <div style={{ borderBottom: `1px solid ${border}` }}>
        <img src={IMAGES.manifesto} alt="Words matter" className="w-full max-h-64 object-cover object-center" style={{ opacity: dark ? 0.5 : 0.7 }} />
      </div>
      <Sec>
        <div className="max-w-2xl mx-auto px-6 md:px-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-16" style={{ color: dark ? "#4A4962" : "#BABAC8" }}>
            Vylapp Manifesto · {COMPANY.year}
          </p>
          <div className="space-y-10 font-dm text-lg leading-loose" style={{ color: sub }}>
            <p className="font-sora font-extrabold text-4xl leading-tight" style={{ color: dark ? "#F5F4FF" : "#0D0C1A" }}>
              Language is not a barrier. It is a bridge. We built the bridge.
            </p>
            <p>The internet was invented in English. Most of it still thinks in English. But the people who use it — 5 billion of them — do not.</p>
            <p>A farmer in Kano building a soil advisory startup. An artist in Kyoto making generative art from satellite data. A DAO builder in Lagos designing governance for the next internet. A learner in São Paulo growing her second brain. They are not edge cases. They are the whole point.</p>
            <p>Every platform they join expects them to adapt. To translate themselves. To shrink. To perform fluency in a language that is not their first, not the language of their community.</p>
            <p className="font-sora font-bold text-2xl" style={{ color: COLORS.violet }}>We refused to build that platform.</p>
            <p>Vylapp is built on one assumption: that the person sending a message and the person receiving it might speak different languages, and that this should not matter. That assumption changes everything.</p>
            <p>We believe community is the only moat that matters. We believe creators should own their audience. We believe revenue should follow community health, never precede it.</p>
            <p className="font-sora font-bold text-2xl" style={{ color: dark ? "#F5F4FF" : "#0D0C1A" }}>Vibe. Learn. Connect.</p>
            <p>These are not marketing words. They are an architecture. Vibe: create and share who you are. Learn: grow through the people around you. Connect: build relationships that outlast any algorithm.</p>
            <p>The world has always been multilingual. The internet should be too.</p>
            <p className="font-mono text-[11px] mt-12" style={{ color: dark ? "#4A4962" : "#BABAC8" }}>
              — {COMPANY.founder}, Founder, {COMPANY.name}
            </p>
          </div>
        </div>
      </Sec>
    </div>
  );
}

// ─── CHANGELOG ────────────────────────────────────────────────────────────────
export function ChangelogPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <Label color={COLORS.violet}>Changelog</Label>
          <h1 className="font-sora font-extrabold text-5xl mt-6">What's changed</h1>
        </Wrap>
      </Sec>
      <Sec>
        <Wrap narrow>
          <div className="space-y-8">
            {CHANGELOG.map(e => (
              <div key={e.version} className="flex gap-6">
                <div className="flex-shrink-0 w-14 text-right pt-0.5">
                  <p className="font-mono text-sm font-semibold" style={{ color: COLORS.violet }}>{e.version}</p>
                  <p className="font-mono text-[9px] mt-1" style={{ color: dark ? "#4A4962" : "#BABAC8" }}>{e.date}</p>
                </div>
                <div className="flex-1 pb-8" style={{ borderBottom: `1px solid ${border}` }}>
                  <Label color={e.accent}>{e.tag}</Label>
                  <ul className="mt-4 space-y-2">
                    {e.items.map(it => (
                      <li key={it} className="flex gap-3 text-sm font-dm" style={{ color: sub }}>
                        <span style={{ color: COLORS.violet, flexShrink: 0 }}>·</span>{it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

// ─── INVESTORS ────────────────────────────────────────────────────────────────
export function InvestorsPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap narrow>
          <Label color={COLORS.amber}>Investors</Label>
          <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 leading-tight">
            The community platform for the next 5 billion.
          </h1>
          <p className="mt-4 font-dm text-xl leading-relaxed" style={{ color: sub }}>
            Raising a pre-seed SAFE note (YC-style, post-money). Building for multilingual, underrepresented markets worldwide.
          </p>
        </Wrap>
      </Sec>
      <Sec>
        <Wrap>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[["Instrument","SAFE Note","YC post-money style · Indiana LLC"],["Stage","Pre-seed","Working product & full legal suite"],["Market","$500B+","Creator economy + multilingual community"],["Moat","4-layer","Feed + Spaces + Creator economy + Translation"]].map(([l,v,s]) => (
              <div key={l} className="p-6 rounded-xl" style={card}>
                <p className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: dark ? "#4A4962" : "#A0A0B0" }}>{l}</p>
                <p className="font-sora font-extrabold text-2xl" style={{ color: COLORS.amber }}>{v}</p>
                <p className="font-dm text-sm mt-1" style={{ color: sub }}>{s}</p>
              </div>
            ))}
          </div>

          <SectionLabel color={COLORS.amber}>Why now</SectionLabel>
          <div className="max-w-3xl space-y-3 mb-10">
            {["Creator economy reaching $500B by 2027","Live audio proven — Clubhouse, X Spaces, Discord","AI translation now fast enough for real-time use","Gen Z demands authenticity over algorithmic feeds","Community platforms outperform social in long-term retention","No platform combines feed + live + creator economy + translation"].map(w => (
              <div key={w} className="flex gap-3 items-start p-4 rounded-xl" style={card}>
                <Icon d={ic.check} s={13} style={{ color: COLORS.amber, marginTop: 2, flexShrink: 0 }} />
                <span className="font-dm text-sm" style={{ color: sub }}>{w}</span>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-xl max-w-3xl" style={{ border: `2px solid ${COLORS.amber}40`, background: `${COLORS.amber}06` }}>
            <p className="font-sora font-bold mb-2">Request the investor deck</p>
            <p className="font-dm text-sm mb-4" style={{ color: sub }}>
              Email <strong>{COMPANY.investorEmail}</strong> with subject line <em>"Investor inquiry"</em> — we respond within 48 hours.
              Our SAFE instrument is based on the standard YC post-money form, adapted for an Indiana LLC.
            </p>
            <a href={`mailto:${COMPANY.investorEmail}?subject=Investor inquiry`}>
              <Btn variant="primary">Request the deck</Btn>
            </a>
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

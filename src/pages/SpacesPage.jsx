import { useState } from "react";
import { Icon, ic, Label, SectionLabel, Btn, Wrap, Sec, sectionBorder, textSub, textMuted } from "../components/UI";
import { LIVE_SPACES } from "../data";
import { COLORS, IMAGES } from "../config";
import LiveSpacePlayer from "../components/LiveSpacePlayer";

export default function SpacesPage({ dark }) {
  const [activeSpace, setActiveSpace] = useState(null);
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
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Label color={COLORS.teal}>Spaces</Label>
              <h1 className="font-sora font-extrabold text-5xl md:text-6xl mt-6 leading-tight">
                Live rooms where real conversations happen.
              </h1>
              <p className="mt-5 font-dm text-xl leading-relaxed" style={{ color: sub }}>
                Join under 2 seconds. Real-time multilingual captions. Open, ticketed, or private.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <img src={IMAGES.spaces} alt="Live conversation Space" className="w-full h-[360px] object-cover" style={{ opacity: dark ? 0.8 : 0.95 }} />
            </div>
          </div>
        </Wrap>
      </Sec>

      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: COLORS.coral }} />
            <SectionLabel color={COLORS.coral}>Live now</SectionLabel>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-12">
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
                  <Btn variant="outline" onClick={() => setActiveSpace(s)}>Join</Btn>
                </div>
              </div>
            ))}
          </div>

          <SectionLabel color={COLORS.teal}>How it works</SectionLabel>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              ["01","Create","Open, ticketed, or invite-only. Choose your community."],
              ["02","Set language","Pick yours. Listeners auto-get captions in theirs."],
              ["03","Go live","Tap go live. Your community gets notified immediately."],
              ["04","It lives on","Transcript, AI summary, and highlights stay on your profile."],
            ].map(([n, t, d]) => (
              <div key={n} className="p-5 rounded-xl" style={card}>
                <p className="font-mono text-2xl font-bold mb-3" style={{ color: `${COLORS.violet}30` }}>{n}</p>
                <p className="font-sora font-bold text-sm mb-2">{t}</p>
                <p className="font-dm text-xs leading-relaxed" style={{ color: sub }}>{d}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>

      {activeSpace && (
        <LiveSpacePlayer
          space={activeSpace}
          onClose={() => setActiveSpace(null)}
          dark={dark}
        />
      )}
    </div>
  );
}

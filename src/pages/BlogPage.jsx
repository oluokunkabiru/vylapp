// ─── BLOG PAGE ───────────────────────────────────────────────────────────────
import { Icon, ic, Label, Wrap, Sec, sectionBorder, textSub, textMuted } from "../components/UI";
import { BLOG_POSTS } from "../data";
import { COLORS } from "../config";

export function BlogPage({ dark }) {
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
          <Label color={COLORS.violet}>Blog</Label>
          <h1 className="font-sora font-extrabold text-5xl mt-6">Stories from the team</h1>
        </Wrap>
      </Sec>
      <Sec>
        <Wrap>
          <div className="grid md:grid-cols-2 gap-5">
            {BLOG_POSTS.map(p => (
              <article key={p.slug} className="p-6 rounded-xl cursor-pointer transition-all hover:scale-[1.01]" style={card}>
                <div className="flex items-center justify-between mb-4">
                  <Label color={p.accent}>{p.tag}</Label>
                  <span className="font-mono text-[10px]" style={{ color: muted }}>{p.date}</span>
                </div>
                <h2 className="font-sora font-bold text-lg leading-snug mb-3">{p.title}</h2>
                <p className="font-dm text-sm leading-relaxed" style={{ color: sub }}>{p.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-sm font-semibold font-dm" style={{ color: p.accent }}>
                  Read more <Icon d={ic.arrow} s={13} />
                </div>
              </article>
            ))}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

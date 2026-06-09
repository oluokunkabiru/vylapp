import { Label, Wrap, Sec, sectionBorder, textSub } from "../components/UI";
import { COLORS, COMPANY } from "../config";

// Reusable legal page component — used for Terms, Privacy, Guidelines
export default function LegalPage({ title, labelColor, sections, dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap narrow>
          <Label color={labelColor || COLORS.violet}>Legal</Label>
          <h1 className="font-sora font-extrabold text-4xl mt-6">{title}</h1>
          <p className="font-mono text-[11px] mt-3" style={{ color: dark ? "#4A4962" : "#BABAC8" }}>
            Effective date: {COMPANY.year} · {COMPANY.name}
          </p>
        </Wrap>
      </Sec>
      <Sec>
        <Wrap narrow>
          <div className="space-y-8 font-dm leading-relaxed" style={{ color: sub }}>
            {sections.map(s => (
              <div key={s.title}>
                <h2 className="font-sora font-bold text-lg mb-3" style={{ color: dark ? "#F5F4FF" : "#0D0C1A" }}>
                  {s.title}
                </h2>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

import { Link } from "react-router-dom";
import { FOOTER_LINKS } from "../data";
import { COLORS, COMPANY, BRAND } from "../config";
import { textSub, textMuted, sectionBorder } from "./UI";

export default function Footer({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const muted  = textMuted(dark);

  return (
    <footer style={{ borderTop: `1px solid ${border}` }}>
      <div className="max-w-6xl mx-auto px-6 md:px-12 pt-16 pb-10">

        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="font-sora font-extrabold text-xl tracking-tight">
              <span style={{ color: COLORS.violet }}>Vyl</span>app
            </Link>
            <p className="mt-3 text-sm font-dm leading-relaxed" style={{ color: sub }}>
              {BRAND.tagline}<br />
              The community for a multilingual world.
            </p>
            <p className="mt-4 font-mono text-[10px] tracking-wider" style={{ color: muted }}>
              {COMPANY.email}
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(col => (
            <div key={col.title}>
              <p
                className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase mb-4"
                style={{ color: muted }}
              >
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map(([path, label]) => (
                  <li key={path}>
                    <Link
                      to={path}
                      className="text-sm font-dm transition-opacity hover:opacity-60"
                      style={{ color: sub }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${border}` }} className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[11px]" style={{ color: muted }}>
            © {COMPANY.year} {COMPANY.name} · Indianapolis, Indiana
          </p>
          <Link
            to="/manifesto"
            className="font-mono text-[10px] tracking-wider uppercase transition-opacity hover:opacity-60"
            style={{ color: COLORS.violet }}
          >
            Read our Manifesto →
          </Link>
        </div>
      </div>
    </footer>
  );
}

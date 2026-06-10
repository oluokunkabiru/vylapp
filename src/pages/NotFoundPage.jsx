import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { COLORS } from "../config";
import { Icon, ic, Btn, Wrap, Sec, sectionBorder, textSub } from "../components/UI";

const TRANSLATED_404 = [
  { lang: "English", text: "Page not found", flag: "🇺🇸" },
  { lang: "Swahili", text: "Ukurasa haujapatikana", flag: "🌍" },
  { lang: "Yoruba", text: "A kò rí ojú-iwé yìí", flag: "🇳🇬" },
  { lang: "Igbo", text: "Ahụghị ibe a", flag: "🇳🇬" },
  { lang: "Amharic", text: "ገጽ አልተገኘም", flag: "🇪🇹" },
  { lang: "French", text: "Page non trouvée", flag: "🇫🇷" }
];

export default function NotFoundPage({ dark }) {
  const border = sectionBorder(dark);
  const sub = textSub(dark);
  const [langIdx, setLangIdx] = useState(0);

  // Rotate translation text every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLangIdx((prev) => (prev + 1) % TRANSLATED_404.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentTranslation = TRANSLATED_404[langIdx];

  const cardStyle = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-24 min-h-[80vh] flex items-center">
      <Sec className="w-full">
        <Wrap narrow>
          <div className="text-center space-y-8">
            {/* Animated Glow Circle */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full blur-xl animate-pulse opacity-40"
                style={{ background: COLORS.violet }}
              />
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center relative border"
                style={{
                  borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)"
                }}
              >
                <span className="font-sora font-black text-3xl" style={{ color: COLORS.violet }}>
                  404
                </span>
              </div>
            </div>

            {/* Multilingual Translation Banner */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono font-medium shadow-sm transition-all duration-300"
              style={cardStyle}
            >
              <span>{currentTranslation.flag}</span>
              <span className="opacity-60">{currentTranslation.lang}:</span>
              <span style={{ color: COLORS.teal }} className="font-bold">
                "{currentTranslation.text}"
              </span>
            </div>

            {/* Main headings */}
            <div>
              <h1 className="font-sora font-extrabold text-4xl md:text-5xl tracking-tight leading-tight">
                Lost in translation.
              </h1>
              <p className="mt-4 text-sm md:text-base font-dm max-w-md mx-auto leading-relaxed" style={{ color: sub }}>
                The page you are looking for does not exist or has been translated into an unknown dialect.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link to="/">
                <Btn variant="primary">
                  Back to safety <Icon d={ic.arrow} s={14} className="ml-1" />
                </Btn>
              </Link>
              <Link to="/spaces">
                <Btn variant="outline">Explore live Spaces</Btn>
              </Link>
            </div>
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}

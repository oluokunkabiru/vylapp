import { useState, useEffect } from "react";
import { COLORS } from "../config";
import { Icon, ic } from "./UI";
import { TRANSLATION_SENTENCES, TRANSLATION_LANGUAGES } from "../data";

export default function TranslationPlayground({ dark }) {
  const [selectedSentence, setSelectedSentence] = useState(TRANSLATION_SENTENCES[0]);
  const [selectedLang, setSelectedLang] = useState("swahili");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Trigger translation when sentence or language changes
  useEffect(() => {
    setIsTranslating(true);
    setTranslatedText("");
    setTypedText("");
    setIsPlayingAudio(false);

    const timer = setTimeout(() => {
      const translation = TRANSLATION_LANGUAGES[selectedLang][selectedSentence.id];
      setTranslatedText(translation);
      setIsTranslating(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedSentence, selectedLang]);

  // Simulate word-by-word streaming/typing effect once translation completes
  useEffect(() => {
    if (!isTranslating && translatedText) {
      let currentIdx = 0;
      const words = translatedText.split(" ");
      setTypedText("");

      const interval = setInterval(() => {
        if (currentIdx < words.length) {
          const nextWord = words[currentIdx];
          if (nextWord !== undefined) {
            setTypedText((prev) => (prev ? prev + " " + nextWord : nextWord));
          }
          currentIdx++;
        } else {
          clearInterval(interval);
        }
      }, 120);

      return () => clearInterval(interval);
    }
  }, [isTranslating, translatedText]);

  const langInfo = TRANSLATION_LANGUAGES[selectedLang];

  return (
    <div
      style={{
        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        borderRadius: "16px",
        padding: "24px",
      }}
      className="w-full"
    >
      <p className="font-mono text-[10px] tracking-wider uppercase mb-3 opacity-60">
        multilingual caption simulator
      </p>

      {/* Step 1: Select Phrase */}
      <div className="mb-6">
        <label className="block text-xs font-mono mb-2 opacity-75">
          1. Select input sentence (English)
        </label>
        <div className="flex flex-col gap-2">
          {TRANSLATION_SENTENCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSentence(s)}
              className={`text-left text-xs md:text-sm p-3 rounded-lg border transition-all duration-150 ${
                selectedSentence.id === s.id
                  ? `border-[var(--primary)] bg-[var(--primary-light)] font-medium`
                  : `border-transparent hover:bg-neutral-500/10`
              }`}
              style={{
                "--primary": COLORS.violet,
                "--primary-light": dark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.05)",
                color: selectedSentence.id === s.id ? COLORS.violet : "inherit",
              }}
            >
              "{s.text}"
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Select Target Language */}
      <div className="mb-6">
        <label className="block text-xs font-mono mb-2 opacity-75">
          2. Target Language
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TRANSLATION_LANGUAGES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setSelectedLang(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5 transition-all duration-150 border ${
                selectedLang === key
                  ? `border-neutral-500/20 shadow-sm font-semibold`
                  : `border-transparent opacity-60 hover:opacity-100`
              }`}
              style={{
                background: selectedLang === key ? `${value.accent}18` : "transparent",
                color: selectedLang === key ? value.accent : "inherit",
              }}
            >
              <span>{value.flag}</span>
              <span>{value.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Result Viewer */}
      <div
        className="rounded-xl p-5 relative min-h-[140px] flex flex-col justify-between"
        style={{
          background: dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.6)",
          border: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <span
            className="font-mono text-[9px] px-2 py-0.5 rounded uppercase font-semibold"
            style={{ background: `${langInfo.accent}15`, color: langInfo.accent }}
          >
            {langInfo.name} Caption
          </span>

          <div className="mt-4 font-dm text-sm md:text-base leading-relaxed font-light">
            {isTranslating ? (
              <span className="flex items-center gap-2 text-neutral-400 font-mono text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping"></span>
                Vylapp Translation Engine processing...
              </span>
            ) : (
              <span>
                {typedText}
                {typedText !== translatedText && (
                  <span className="inline-block w-1 h-4 ml-1 bg-teal-500 animate-pulse align-middle"></span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Caption Soundwave simulation */}
        {!isTranslating && typedText === translatedText && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-500/10">
            <button
              onClick={() => {
                setIsPlayingAudio(true);
                setTimeout(() => setIsPlayingAudio(false), 2400);
              }}
              disabled={isPlayingAudio}
              className="flex items-center gap-1.5 text-xs font-mono hover:opacity-80 transition-opacity"
              style={{ color: langInfo.accent }}
            >
              <Icon d={isPlayingAudio ? ic.mic : ic.zap} s={14} />
              <span>{isPlayingAudio ? "Simulating audio feed..." : "Simulate live captions"}</span>
            </button>

            {/* Simulated soundwave */}
            <div className="flex items-end gap-0.5 h-6">
              {[6, 12, 18, 10, 15, 8, 12, 4, 16, 10].map((h, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full"
                  style={{
                    backgroundColor: langInfo.accent,
                    height: isPlayingAudio ? `${h}px` : "3px",
                    opacity: isPlayingAudio ? 0.85 : 0.25,
                    transition: "height 0.15s ease-in-out",
                    animation: isPlayingAudio ? `wave 0.5s ease-in-out infinite alternate ${i * 0.05}s` : "none",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes wave {
          0% { height: 4px; }
          100% { height: 20px; }
        }
      `}</style>
    </div>
  );
}

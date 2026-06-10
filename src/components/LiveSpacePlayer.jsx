import { useState, useEffect, useRef } from "react";
import { COLORS } from "../config";
import { Icon, ic, Avatar } from "./UI";
import { SPACES_SIMULATED_TRANSCRIPT } from "../data";

export default function LiveSpacePlayer({ space, onClose, dark }) {
  const [lang, setLang] = useState("english");
  const [activeSpeaker, setActiveSpeaker] = useState("Leon Chen");
  const [lineIdx, setLineIdx] = useState(0);
  const [history, setHistory] = useState([]);
  const [isRequestedToSpeak, setIsRequestedToSpeak] = useState(false);
  const [reactions, setReactions] = useState([]);
  const chatEndRef = useRef(null);

  // Play transcription loop
  useEffect(() => {
    // Reset
    setHistory([]);
    setLineIdx(0);

    const dialogs = SPACES_SIMULATED_TRANSCRIPT[lang] || SPACES_SIMULATED_TRANSCRIPT.english;
    const interval = setInterval(() => {
      setLineIdx((prevIdx) => {
        const nextIdx = (prevIdx + 1) % dialogs.length;
        const nextLine = dialogs[prevIdx];
        
        setActiveSpeaker(nextLine.speaker);
        setHistory((h) => [...h.slice(-4), nextLine]); // keep last 5 lines

        return nextIdx;
      });
    }, 3200);

    // Initial line
    setActiveSpeaker(dialogs[0].speaker);
    setHistory([dialogs[0]]);

    return () => clearInterval(interval);
  }, [lang, space]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Floating emojis logic
  const triggerReaction = (emoji) => {
    const id = Date.now() + Math.random();
    setReactions((prev) => [...prev, { id, emoji, x: Math.random() * 80 + 10 }]);

    // Remove reaction after animation ends
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const bgStyle = dark ? "#0F0E1A" : "#FFFFFF";
  const borderStyle = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = dark ? "#F5F4FF" : "#0D0C1A";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(8, 7, 15, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "20px"
      }}
    >
      <div
        style={{
          background: bgStyle,
          border: `1px solid ${borderStyle}`,
          width: "100%",
          maxWidth: "520px",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.25)",
          color: textColor,
          position: "relative",
          overflow: "hidden"
        }}
        className="font-dm flex flex-col max-h-[90vh]"
      >
        {/* Floating Emojis Container */}
        <div className="absolute inset-x-0 bottom-24 top-0 pointer-events-none overflow-hidden z-10">
          {reactions.map((r) => (
            <span
              key={r.id}
              className="absolute text-2xl animate-float-up opacity-0"
              style={{
                left: `${r.x}%`,
                bottom: "10px"
              }}
            >
              {r.emoji}
            </span>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-500/10 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-red-500 font-bold">
                live audio space
              </p>
              <h4 className="font-sora font-extrabold text-sm md:text-base leading-snug mt-0.5">
                {space.title}
              </h4>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-500/10 hover:bg-neutral-500/20 transition-colors"
          >
            <Icon d={ic.close} s={16} />
          </button>
        </div>

        {/* Speaker Room Mockup */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { name: "Leon Chen", role: "Host", avatarColor: COLORS.violet, speaking: activeSpeaker === "Leon Chen" },
            { name: "Aisha Kamara", role: "Speaker", avatarColor: COLORS.teal, speaking: activeSpeaker === "Aisha Kamara" },
            { name: "Marcus Osei", role: "Listener", avatarColor: COLORS.coral, speaking: false }
          ].map((sp) => (
            <div key={sp.name} className="flex flex-col items-center text-center">
              <div className="relative">
                {sp.speaking && (
                  <span className="absolute -inset-1.5 rounded-full border border-teal-500 animate-ping opacity-60" />
                )}
                <Avatar name={sp.name} color={sp.avatarColor} size={54} />
                {sp.speaking && (
                  <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full p-1" style={{ border: `2px solid ${bgStyle}` }}>
                    <Icon d={ic.mic} s={10} />
                  </div>
                )}
              </div>
              <p className="font-sora font-bold text-xs mt-3 leading-tight">{sp.name}</p>
              <p className="font-mono text-[8px] uppercase tracking-wider opacity-50 mt-0.5">{sp.role}</p>
            </div>
          ))}
        </div>

        {/* Translation Caption Feed */}
        <div className="flex-1 flex flex-col min-h-[160px] bg-neutral-500/5 rounded-xl p-4 mb-6 border border-neutral-500/5">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-neutral-500/5">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">
              real-time translation
            </span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-[10px] font-mono font-semibold bg-neutral-500/10 border-0 rounded px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="english">🇺🇸 English</option>
              <option value="swahili">🌍 Swahili</option>
              <option value="yoruba">🇳🇬 Yoruba</option>
              <option value="igbo">🇳🇬 Igbo</option>
            </select>
          </div>

          {/* Scrolling Transcription dialog */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {history.map((h, i) => {
              const isSpeaker = h.speaker === activeSpeaker;
              return (
                <div
                  key={i}
                  className={`flex flex-col gap-1 transition-all duration-300 ${
                    isSpeaker ? "opacity-100 scale-100" : "opacity-50"
                  }`}
                >
                  <p className="font-mono text-[9px] font-semibold text-neutral-400">
                    {h.speaker}
                  </p>
                  <div className="p-2.5 rounded-lg bg-neutral-500/5 font-light leading-relaxed">
                    {h.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-500/10 z-20">
          <button
            onClick={() => setIsRequestedToSpeak(!isRequestedToSpeak)}
            className={`px-4 py-2 rounded-lg text-xs font-dm font-semibold transition-all duration-150 flex items-center gap-1.5 border ${
              isRequestedToSpeak
                ? "border-teal-500 bg-teal-500/10 text-teal-400"
                : "border-neutral-500/20 bg-transparent"
            }`}
          >
            <Icon d={ic.mic} s={12} />
            <span>{isRequestedToSpeak ? "Requested" : "Request to Speak"}</span>
          </button>

          {/* Super Vibes reactions */}
          <div className="flex items-center gap-2">
            {[
              { emoji: "⚡", label: "Vibe" },
              { emoji: "💖", label: "Heart" },
              { emoji: "🔥", label: "Fire" },
              { emoji: "👏", label: "Clap" }
            ].map((re) => (
              <button
                key={re.emoji}
                onClick={() => triggerReaction(re.emoji)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-500/10 hover:bg-neutral-500/20 transition-transform active:scale-90"
                title={`Send ${re.label}`}
              >
                <span className="text-sm">{re.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-120px) scale(1.2);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: floatUp 2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

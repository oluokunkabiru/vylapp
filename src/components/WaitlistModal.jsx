import { useState, useEffect } from "react";
import { COLORS } from "../config";
import { Icon, ic } from "./UI";

export default function WaitlistModal({ isOpen, onClose, dark }) {
  const [email, setEmail] = useState("");
  const [community, setCommunity] = useState("tech");
  const [lang, setLang] = useState("swahili");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [position, setPosition] = useState(14840);
  const [copied, setCopied] = useState(false);

  // Check if already registered in localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("vylapp_waitlist");
      if (stored) {
        setSuccess(true);
        const parsed = JSON.parse(stored);
        setEmail(parsed.email || "");
        setPosition(parsed.position || 14840);
      } else {
        setSuccess(false);
        setEmail("");
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const randomPos = Math.floor(Math.random() * 500) + 12400;
      setPosition(randomPos);
      localStorage.setItem(
        "vylapp_waitlist",
        JSON.stringify({ email, community, lang, position: randomPos })
      );
      setIsSubmitting(false);
      setSuccess(true);
    }, 1200);
  };

  const copyRefLink = () => {
    navigator.clipboard.writeText(`https://vylapp.com/join?ref=vyl-${email.slice(0, 3)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bgStyle = dark ? "#0F0E1A" : "#FFFFFF";
  const borderStyle = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = dark ? "#F5F4FF" : "#0D0C1A";
  const subText = dark ? "#8B8AA8" : "#6B6B80";

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
          maxWidth: "460px",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.25)",
          color: textColor,
          position: "relative",
          overflow: "hidden"
        }}
        className="font-dm"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-500/10 mb-6">
          <h3 className="font-sora font-extrabold text-lg">
            {success ? "You're on the list!" : "Join early access"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-500/10 hover:bg-neutral-500/20 transition-colors"
          >
            <Icon d={ic.close} s={16} />
          </button>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: subText }}>
              Sign up today to lock your early access slot. We are slowly boarding community leaders and creators.
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5 opacity-70">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-violet-500 transition-colors"
                style={{
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  borderColor: borderStyle,
                  color: "inherit"
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5 opacity-70">
                  Topic Vertical
                </label>
                <select
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:border-violet-500 outline-none"
                  style={{
                    background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderColor: borderStyle,
                    color: "inherit"
                  }}
                >
                  <option value="tech">Tech Vibes</option>
                  <option value="global">Global Connect</option>
                  <option value="creative">Creative Learn</option>
                  <option value="human">Human Potential</option>
                  <option value="agri">AgriTech</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5 opacity-70">
                  Target Language
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:border-violet-500 outline-none"
                  style={{
                    background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderColor: borderStyle,
                    color: "inherit"
                  }}
                >
                  <option value="swahili">Swahili</option>
                  <option value="yoruba">Yoruba</option>
                  <option value="hausa">Hausa</option>
                  <option value="igbo">Igbo</option>
                  <option value="amharic">Amharic</option>
                  <option value="english">English</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: COLORS.violet }}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                <span>Request Invitation</span>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-5">
            {/* Success Animation Ring */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Icon d={ic.check} s={24} style={{ color: COLORS.teal }} />
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                Your queue position
              </p>
              <h2 className="font-sora font-extrabold text-3xl md:text-4xl mt-1 text-emerald-500">
                #{position.toLocaleString()}
              </h2>
              <p className="text-xs opacity-75 mt-2">
                We'll email invite links to <strong>{email}</strong> in cohorts.
              </p>
            </div>

            {/* Referral system */}
            <div
              className="p-4 rounded-xl border text-xs text-left space-y-2.5"
              style={{ borderColor: borderStyle, background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}
            >
              <p className="font-semibold">Want to jump the queue?</p>
              <p className="opacity-75 leading-relaxed text-[11px]">
                Refer 3 founding members to automatically advance 5,000 slots. Share your unique code:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://vylapp.com/join?ref=vyl-${email.slice(0, 3)}`}
                  className="flex-1 px-3 py-1.5 rounded bg-neutral-500/10 font-mono text-[9px] border-0 focus:outline-none"
                />
                <button
                  onClick={copyRefLink}
                  className="px-3 py-1 rounded bg-violet-600 text-white font-semibold text-[10px] cursor-pointer hover:bg-violet-700 transition-colors"
                  style={{ background: COLORS.violet }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

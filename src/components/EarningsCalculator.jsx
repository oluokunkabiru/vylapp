import { useState } from "react";
import { COLORS } from "../config";
import { Card } from "./UI";

export default function EarningsCalculator({ dark }) {
  const [members, setMembers] = useState(2000);
  const [fee, setFee] = useState(8);

  const monthlyVylapp = Math.round(members * fee * 0.85);
  const annualVylapp = monthlyVylapp * 12;

  const monthlyYoutube = Math.round(members * fee * 0.70);
  const annualYoutube = monthlyYoutube * 12;

  const monthlyTwitch = Math.round(members * fee * 0.50);
  const annualTwitch = monthlyTwitch * 12;

  const extraPatreonTake = Math.round(members * fee * (0.85 - 0.78)); // Patreon takes platform + processing (~22% total cut vs Vylapp's flat 15% inclusive split)

  const cardBorder = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const inputBg = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <div
      style={{
        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        borderRadius: "16px",
        padding: "28px",
      }}
      className="w-full font-dm"
    >
      <p className="font-mono text-[10px] tracking-wider uppercase mb-5 opacity-60">
        interactive earnings calculator
      </p>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Sliders Control Panel */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-sora font-semibold">Monthly Subscribers</label>
              <span className="font-mono font-bold text-sm px-2 py-0.5 rounded" style={{ background: `${COLORS.amber}15`, color: COLORS.amber }}>
                {members.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="20000"
              step="100"
              value={members}
              onChange={(e) => setMembers(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1 bg-neutral-700/20 rounded-lg appearance-none"
              style={{ accentColor: COLORS.amber }}
            />
            <div className="flex justify-between text-[10px] font-mono opacity-50 mt-1">
              <span>100</span>
              <span>10,000</span>
              <span>20,000+</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-sora font-semibold">Subscription Fee</label>
              <span className="font-mono font-bold text-sm px-2 py-0.5 rounded" style={{ background: `${COLORS.teal}15`, color: COLORS.teal }}>
                ${fee}/mo
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1 bg-neutral-700/20 rounded-lg appearance-none"
              style={{ accentColor: COLORS.teal }}
            />
            <div className="flex justify-between text-[10px] font-mono opacity-50 mt-1">
              <span>$2</span>
              <span>$25</span>
              <span>$50</span>
            </div>
          </div>
        </div>

        {/* Math Display Panel */}
        <div className="space-y-4">
          <div
            className="p-5 rounded-xl text-center relative overflow-hidden"
            style={{
              background: dark ? "rgba(124,58,237,0.06)" : "rgba(124,58,237,0.03)",
              border: `1.5px solid ${COLORS.violet}`,
            }}
          >
            <div className="absolute top-0 right-0 bg-violet-600/10 text-violet-400 font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-bl">
              85% creator split
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest opacity-60">
              Vylapp annual revenue
            </p>
            <h3 className="font-sora font-black text-3xl md:text-4xl mt-1.5" style={{ color: COLORS.violet }}>
              ${annualVylapp.toLocaleString()}
            </h3>
            <p className="text-xs opacity-75 mt-1">
              (${monthlyVylapp.toLocaleString()} / month net earnings)
            </p>
          </div>

          {/* Competitor list */}
          <div className="space-y-2">
            {[
              { name: "YouTube Channel Memberships", annual: annualYoutube, pct: 70, color: COLORS.coral },
              { name: "Twitch Channel Subscribers", annual: annualTwitch, pct: 50, color: COLORS.amber },
            ].map((comp) => {
              const diff = annualVylapp - comp.annual;
              return (
                <div
                  key={comp.name}
                  className="p-3.5 rounded-lg flex items-center justify-between text-xs border"
                  style={{ borderColor: cardBorder, background: inputBg }}
                >
                  <div>
                    <p className="font-semibold">{comp.name}</p>
                    <p className="opacity-60 text-[10px] mt-0.5">{comp.pct}% creator split</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">${comp.annual.toLocaleString()}/yr</p>
                    <p className="font-semibold text-[10px] text-emerald-500 mt-0.5">
                      +${diff.toLocaleString()} on Vylapp
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

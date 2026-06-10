import { useState } from "react";
import { COLORS } from "../config";
import { Icon, ic } from "./UI";
import { FAQ_ITEMS } from "../data";

export default function FAQAccordion({ dark }) {
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const cardBorder = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const itemBg = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)";

  return (
    <div className="w-full max-w-3xl mx-auto font-dm">
      <div className="text-center mb-10">
        <h2 className="font-sora font-extrabold text-2xl md:text-3xl">Frequently Asked Questions</h2>
        <p className="opacity-60 text-sm mt-2">Everything you need to know about the platform.</p>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border transition-all duration-200 overflow-hidden"
              style={{
                borderColor: isOpen ? COLORS.violet : cardBorder,
                background: isOpen
                  ? dark
                    ? "rgba(124,58,237,0.04)"
                    : "rgba(124,58,237,0.02)"
                  : itemBg
              }}
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left font-sora font-bold text-sm md:text-base cursor-pointer"
              >
                <span>{faq.q}</span>
                <span
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    color: isOpen ? COLORS.violet : "inherit"
                  }}
                  className="flex-shrink-0 ml-4"
                >
                  <Icon d={ic.chevD} s={16} />
                </span>
              </button>

              <div
                style={{
                  maxHeight: isOpen ? "200px" : "0px",
                  opacity: isOpen ? 1 : 0,
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                className="overflow-hidden"
              >
                <p className="px-6 pb-5 text-xs md:text-sm leading-relaxed opacity-75 font-light">
                  {faq.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

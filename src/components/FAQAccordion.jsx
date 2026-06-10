import { useState } from "react";
import { COLORS } from "../config";
import { Icon, ic } from "./UI";

const FAQS = [
  {
    q: "How does the organic translation engine work?",
    a: "Vylapp does not rely on third-party translation APIs or remote services that compromise data privacy. Instead, we built a light, specialized client-side engine using locally cached vocabulary structures and phonetic matrices. This allows for near zero-latency captioning and offline-first queue translations."
  },
  {
    q: "What is the Raven Program, and how does the locked rate work?",
    a: "The Raven Program is our exclusive tier for early-cohort creators. By registering now, you lock in an 85% creator split forever. Even as the platform introduces new merchant products or tiered services, your standard community splits are guaranteed by our founding agreement terms."
  },
  {
    q: "Is there a limit to the number of languages I can use?",
    a: "Free tier users can select one default target language for translation. Pro tier members get simultaneous caption translation of up to 5 active languages, allowing you to run global community groups where Swahili, Yoruba, Amharic, and English speakers converse in a single stream."
  },
  {
    q: "Can I export my subscriber list or community data?",
    a: "Yes, always. Vylapp operates on a user-owned model. Your subscriber lists, community structure, and transcripts belong to you. You can export your entire data folder as standard JSON/CSV files at any time. There are no lock-in mechanisms."
  },
  {
    q: "How does real-time sound captioning work in Spaces?",
    a: "When you host a Space, our in-browser multilingual parser listens to audio chunks on the fly. It translates and feeds text captions onto listeners' dashboards in their chosen dialect. This creates a caption stream that operates under a 120ms network window."
  }
];

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
        {FAQS.map((faq, idx) => {
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

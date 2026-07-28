// ════════════════════════════════════════════════════════════════════════════
//  LANGUAGE DETECTOR
//
//  Wraps franc-min (offline, zero-dependency, trigram-based detection) and
//  restricts output to Vylapp's supported language list. franc-min is
//  ESM-only, so it's loaded via dynamic import() from this CommonJS module.
//
//  Social posts are short, so this is intentionally conservative: below
//  MIN_LENGTH characters, or when franc can't confidently pick one of our
//  supported languages, we fall back to the author's own UI language
//  instead of guessing wrong.
// ════════════════════════════════════════════════════════════════════════════
import TranslationEngine from "./translationEngine";

// Derived from TranslationEngine.LANGUAGES' `franc` field — single source of
// truth, so adding a language there automatically extends what can be
// auto-detected too (as long as franc-min actually supports it).
const TO_ISO6393: Record<string, string> = Object.fromEntries(
  TranslationEngine.LANGUAGES.filter(l => l.franc).map(l => [l.code, l.franc as string]),
);
const FROM_ISO6393: Record<string, string> = Object.fromEntries(Object.entries(TO_ISO6393).map(([k, v]) => [v, k]));
const SUPPORTED_ISO6393 = Object.values(TO_ISO6393);

const MIN_LENGTH = 12; // below this, trigram detection is unreliable — don't guess

type FrancFn = (text: string, opts: { only: string[]; minLength: number }) => string;

let francPromise: Promise<FrancFn> | null = null;
function loadFranc(): Promise<FrancFn> {
  if (!francPromise) francPromise = import("franc-min").then((m: any) => m.franc);
  return francPromise;
}

const LanguageDetector = {
  // Returns a 2-letter code from TranslationEngine.LANGUAGES, or `fallbackLang` if unsure.
  async detect(text: string | null | undefined, fallbackLang = "en"): Promise<string> {
    const clean = (text || "").trim();
    if (clean.length < MIN_LENGTH) return fallbackLang;

    try {
      const franc = await loadFranc();
      const iso = franc(clean, { only: SUPPORTED_ISO6393, minLength: MIN_LENGTH });
      if (iso === "und") return fallbackLang;
      return FROM_ISO6393[iso] || fallbackLang;
    } catch {
      return fallbackLang; // never let detection failure block a post
    }
  },
};

export = LanguageDetector;

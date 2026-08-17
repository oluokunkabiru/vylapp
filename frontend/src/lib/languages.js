// ════════════════════════════════════════════════════════════════════════════
//  SUPPORTED LANGUAGES — single source of truth for every language picker.
//  Mirrors backend/src/services/translationEngine.ts's LANGUAGES list (codes
//  must match exactly, since they're sent straight through as ?lang=).
//  This is the picker's option set, not a hard limit on what can be
//  translated — the backend will still translate to/from any language code
//  via Claude once ANTHROPIC_API_KEY is set; this list is just what's
//  offered as a one-tap choice instead of free-text entry.
// ════════════════════════════════════════════════════════════════════════════
export const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақша" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbekcha" },
  { code: "fa", name: "Persian", nativeName: "فارسی" },
  { code: "ku", name: "Kurdish", nativeName: "Kurdî" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
  { code: "ps", name: "Pashto", nativeName: "پښتو" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာ" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "jv", name: "Javanese", nativeName: "Basa Jawa" },
  { code: "su", name: "Sundanese", nativeName: "Basa Sunda" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
  { code: "ceb", name: "Cebuano", nativeName: "Cebuano" },
  { code: "ilo", name: "Ilocano", nativeName: "Ilokano" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "so", name: "Somali", nativeName: "Soomaali" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "ha", name: "Hausa", nativeName: "Hausa" },
  { code: "ff", name: "Fulah", nativeName: "Fulfulde" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá" },
  { code: "ig", name: "Igbo", nativeName: "Igbo" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda" },
  { code: "rn", name: "Rundi", nativeName: "Ikirundi" },
  { code: "ny", name: "Chichewa", nativeName: "Nyanja" },
  { code: "ln", name: "Lingala", nativeName: "Lingála" },
  { code: "mg", name: "Malagasy", nativeName: "Malagasy" },
  { code: "qu", name: "Quechua", nativeName: "Runa Simi" },
  { code: "za", name: "Zhuang", nativeName: "Vahcuengh" },
];

export const LANG_NAMES = Object.fromEntries(LANGUAGES.map(l => [l.code, l.name]));

// A short, curated subset for compact UI (TopBar's pill selector) — the
// full list is better suited to a scrollable menu (Sidebar).
export const COMMON_LANGUAGE_CODES = ["en", "es", "fr", "pt", "ar", "hi", "sw", "yo", "ha", "am", "zh", "ur"];

// D-15 — right-to-left languages among the launch set. Used to set dir="rtl"
// on the specific element holding that text (not the whole page — a Yoruba
// reader viewing an Arabic post's translation still reads their own UI
// left-to-right; only the foreign-script content itself mirrors).
const RTL_CODES = new Set(["ar", "ur", "fa", "ps"]);
export function isRtl(code) {
  return RTL_CODES.has(code);
}

// D-06 — numeral system per locale. The rule ("decide per locale, apply
// consistently, never mix them in one view") matters more than any single
// choice, so the policy here is deliberately conservative: Western digits
// (0-9) are the default for every language, including Arabic and Urdu,
// where digital-native content overwhelmingly uses Western digits already
// (this platform, X, Instagram) even though Eastern Arabic-Indic (٠-٩) is
// still correct in some formal/print Gulf contexts. Persian is the one
// launch language where Extended Arabic-Indic digits (۰-۹, distinct from
// the Arabic set) are the actual digital norm, not just a formal register,
// so it's the one override. Add more overrides here if correction data
// (T-21) shows a language's speakers consistently want otherwise — don't
// guess further ahead of that signal.
const EXTENDED_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹"; // Persian digit forms, distinct from Arabic's ٠-٩
const NUMERAL_OVERRIDES = { fa: EXTENDED_ARABIC_DIGITS };

export function formatNumeral(value, langCode) {
  const digits = NUMERAL_OVERRIDES[langCode];
  const str = String(value);
  if (!digits) return str;
  return str.replace(/[0-9]/g, d => digits[Number(d)]);
}

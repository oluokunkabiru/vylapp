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

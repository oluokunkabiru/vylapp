// ─── VYLAPP CONFIG ────────────────────────────────────────────────────────────
// All values sourced from .env via Vite's import.meta.env
// Change .env to retheme or reconfigure the site — no code changes needed.

export const BRAND = {
  name:        import.meta.env.VITE_PLATFORM_NAME       || "Vylapp",
  tagline:     import.meta.env.VITE_PLATFORM_TAGLINE    || "Vibe. Learn. Connect.",
  description: import.meta.env.VITE_PLATFORM_DESCRIPTION|| "The global community platform where your language is never a barrier.",
};

export const COMPANY = {
  name:    import.meta.env.VITE_COMPANY_NAME    || "Vylapp LLC",
  email:   import.meta.env.VITE_COMPANY_EMAIL   || "hello@vylapp.com",
  website: import.meta.env.VITE_COMPANY_WEBSITE || "www.vylapp.com",
  address: import.meta.env.VITE_COMPANY_ADDRESS || "1680 Foyt Dr, Apt D, Indianapolis, Indiana 46224",
  state:   import.meta.env.VITE_COMPANY_STATE   || "Indiana",
  year:    import.meta.env.VITE_COMPANY_YEAR    || "2025",
  founder: import.meta.env.VITE_COMPANY_FOUNDER || "Temim Bashiru",
  supportEmail: import.meta.env.VITE_COMPANY_SUPPORT_EMAIL || "hello@vylapp.com",
  legalEmail:   import.meta.env.VITE_COMPANY_LEGAL_EMAIL   || "hello@vylapp.com",
  pressEmail:   import.meta.env.VITE_COMPANY_PRESS_EMAIL   || "hello@vylapp.com",
  investorEmail:import.meta.env.VITE_COMPANY_INVESTOR_EMAIL|| "hello@vylapp.com",
};

export const COLORS = {
  violet:      import.meta.env.VITE_COLOR_VIOLET       || "#7C3AED",
  violetLight: import.meta.env.VITE_COLOR_VIOLET_LIGHT || "#EDE9FE",
  teal:        import.meta.env.VITE_COLOR_TEAL         || "#1D9E75",
  tealLight:   import.meta.env.VITE_COLOR_TEAL_LIGHT   || "#CCFBEE",
  coral:       import.meta.env.VITE_COLOR_CORAL        || "#FF6B6B",
  amber:       import.meta.env.VITE_COLOR_AMBER        || "#FFB830",
};

export const DARK = {
  bg:      import.meta.env.VITE_BG_DARK   || "#08070F",
  bg2:     import.meta.env.VITE_BG_DARK_2 || "#0F0E1A",
  bg3:     import.meta.env.VITE_BG_DARK_3 || "#1A1929",
  text:    import.meta.env.VITE_TEXT_PRIMARY_DARK   || "#F5F4FF",
  text2:   import.meta.env.VITE_TEXT_SECONDARY_DARK || "#8B8AA8",
  text3:   import.meta.env.VITE_TEXT_MUTED_DARK     || "#4A4962",
  border:  import.meta.env.VITE_BORDER_DARK || "rgba(255,255,255,0.08)",
};

export const LIGHT = {
  bg:      import.meta.env.VITE_BG_LIGHT   || "#FFFFFF",
  bg2:     import.meta.env.VITE_BG_LIGHT_2 || "#F8F7FF",
  bg3:     import.meta.env.VITE_BG_LIGHT_3 || "#F1F0FA",
  text:    import.meta.env.VITE_TEXT_PRIMARY_LIGHT   || "#0D0C1A",
  text2:   import.meta.env.VITE_TEXT_SECONDARY_LIGHT || "#6B6B80",
  text3:   import.meta.env.VITE_TEXT_MUTED_LIGHT     || "#A0A0B0",
  border:  import.meta.env.VITE_BORDER_LIGHT || "rgba(0,0,0,0.08)",
};

export const FONTS = {
  display: import.meta.env.VITE_FONT_DISPLAY || "Sora",
  body:    import.meta.env.VITE_FONT_BODY    || "DM Sans",
  mono:    import.meta.env.VITE_FONT_MONO    || "JetBrains Mono",
};

export const PRICING = {
  free:    Number(import.meta.env.VITE_PRICE_FREE)     || 0,
  pro:     Number(import.meta.env.VITE_PRICE_PRO)      || 9,
  orgFrom: Number(import.meta.env.VITE_PRICE_ORG_FROM) || 49,
};

export const STATS = {
  languages:     import.meta.env.VITE_STAT_LANGUAGES      || "14+",
  members:       import.meta.env.VITE_STAT_MEMBERS        || "20K+",
  communities:   import.meta.env.VITE_STAT_COMMUNITIES    || "5",
  creatorSplit:  import.meta.env.VITE_STAT_CREATOR_SPLIT  || "85/15",
};

export const FEATURES_FLAGS = {
  blog:       import.meta.env.VITE_FEATURE_BLOG       === "true",
  changelog:  import.meta.env.VITE_FEATURE_CHANGELOG  === "true",
  investors:  import.meta.env.VITE_FEATURE_INVESTORS  === "true",
  press:      import.meta.env.VITE_FEATURE_PRESS      === "true",
  careers:    import.meta.env.VITE_FEATURE_CAREERS    === "true",  // false by default
};

export const API = {
  base:     import.meta.env.VITE_API_BASE_URL      || "",
  waitlist: import.meta.env.VITE_API_WAITLIST      || "/waitlist",
  contact:  import.meta.env.VITE_API_CONTACT       || "/contact",
  login:    import.meta.env.VITE_API_AUTH_LOGIN    || "/auth/login",
  register: import.meta.env.VITE_API_AUTH_REGISTER || "/auth/register",
};

export const SOCIAL = {
  twitter:   import.meta.env.VITE_SOCIAL_TWITTER   || "#",
  instagram: import.meta.env.VITE_SOCIAL_INSTAGRAM || "#",
  linkedin:  import.meta.env.VITE_SOCIAL_LINKEDIN  || "#",
};

export const APP_STORES = {
  ios:     import.meta.env.VITE_APP_IOS     || "#",
  android: import.meta.env.VITE_APP_ANDROID || "#",
};

// Images — swap any entry via .env or update URL below.
// Unsplash photos chosen specifically for ethnic diversity and African representation.
export const IMAGES = {
  // Hero: diverse African tech community collaborating
  hero:      import.meta.env.VITE_IMG_HERO      || "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=85&auto=format&fit=crop",
  // Community: African professionals in conversation
  community: import.meta.env.VITE_IMG_COMMUNITY || "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=900&q=80&auto=format&fit=crop",
  // Creator: African woman creating content
  creator:   import.meta.env.VITE_IMG_CREATOR   || "https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?w=900&q=80&auto=format&fit=crop",
  // Spaces: diverse group in live audio discussion
  spaces:    import.meta.env.VITE_IMG_SPACES     || "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&q=80&auto=format&fit=crop",
  // About page banner: African professionals/community
  africa:    import.meta.env.VITE_IMG_AFRICA     || "https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=900&q=80&auto=format&fit=crop",
  // Phone mockup (app download section)
  phone:     import.meta.env.VITE_IMG_PHONE      || "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80&auto=format&fit=crop",
  // Manifesto: inspiring African cityscape / community
  manifesto: import.meta.env.VITE_IMG_MANIFESTO  || "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85&auto=format&fit=crop",
};

// Team member photos — local public/ files
export const TEAM_PHOTOS = {
  temim:   "/temim.jpeg",
  yemi:    "/yemi.png",
  adesina: "/adesina.jpeg",
};

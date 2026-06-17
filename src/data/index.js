// ─── VYLAPP SHARED DATA ───────────────────────────────────────────────────────
// Single source of truth for all content used across pages

export const COMMUNITIES = [
  { key: "tech",     label: "Tech Vibes",      emoji: "⚡", accent: "#1D9E75", desc: "AI, Web3, DAOs, build in public" },
  { key: "global",   label: "Global Connect",  emoji: "🌍", accent: "#7C3AED", desc: "AgriTech, climate, global impact" },
  { key: "creative", label: "Creative Learn",  emoji: "🎨", accent: "#FFB830", desc: "Art, design, culture, creator economy" },
  { key: "human",    label: "Human Potential", emoji: "🧠", accent: "#1D9E75", desc: "Learning, accountability, growth" },
  { key: "agri",     label: "AgriTech",        emoji: "🌾", accent: "#FF6B6B", desc: "Farming innovation, food security" },
];

export const VIBES_TICKER = [
  { user: "Aisha Kamara",  handle: "@aisha.k",  cat: "Tech Vibes",      text: "Just open-sourced our DAO governance toolkit. Built in public. 3 months on Vylapp. 🌱" },
  { user: "Marcus Osei",   handle: "@marcus.o", cat: "Global Connect",  text: "10,000 farmers onboarded across 5 African nations. Started here 18 months ago. 🌾" },
  { user: "Jade Nakamura", handle: "@jade.n",   cat: "Creative Learn",  text: "Generative art collection tonight — every piece reacts to real-time climate data. 🎨" },
  { user: "Remi Kowalski", handle: "@remi.k",   cat: "AgriTech",        text: "Cross-language Space on sustainable irrigation tomorrow. Join from anywhere. 🌍" },
  { user: "Tanvi Patel",   handle: "@t.patel",  cat: "Human Potential", text: "Week 12 of my second brain challenge. Community accountability makes the difference. 🧠" },
  { user: "Leon Chen",     handle: "@l.chen",   cat: "Tech Vibes",      text: "Hot take: the best AI models are trained on community knowledge. Vylapp is the dataset. ⚡" },
  { user: "Sena Osei",     handle: "@s.osei",   cat: "Global Connect",  text: "Real-time Yoruba captions in today's Space changed everything for our Lagos members. 🙌" },
];

export const LIVE_SPACES = [
  { id: "s1", title: "Building Your Second Brain in 2026", host: "Leon Chen",    cat: "Human Potential", listeners: 1840, accent: "#7C3AED" },
  { id: "s2", title: "Web3 DAO Governance — Deep Vibe",   host: "Aisha Kamara", cat: "Tech Vibes",      listeners: 423,  accent: "#1D9E75" },
  { id: "s3", title: "African AgriTech: Scale & Impact",  host: "Remi Kowalski",cat: "Global Connect",  listeners: 612,  accent: "#FFB830" },
];

export const BLOG_POSTS = [
  { slug: "cultural-reach-score",  tag: "Product",     title: "Introducing the Cultural Reach Score",               date: "May 2025",      desc: "A new metric showing creators how far their voice travels across languages and borders.",        accent: "#7C3AED" },
  { slug: "10k-farmers",           tag: "Community",   title: "How Remi Kowalski onboarded 10,000 farmers",         date: "April 2025",    desc: "Community and technology combined for real agricultural impact across 5 African nations.",      accent: "#1D9E75" },
  { slug: "translation-engine",    tag: "Engineering", title: "Building an organic translation engine",             date: "March 2025",    desc: "Why we built multilingual support from scratch — and what it means for Yoruba and Amharic.",    accent: "#FF6B6B" },
  { slug: "raven-program",         tag: "Creators",    title: "The Raven program: why 85/15 is the only fair split", date: "February 2025", desc: "Platform take rates are broken. Here's how Vylapp's creator economics fix that from day one.", accent: "#FFB830" },
];

export const CHANGELOG = [
  { version: "v0.9", date: "June 2025",     tag: "Feature",  accent: "#1D9E75", items: ["Launched Cultural Reach Score on all creator profiles", "Fatigue-aware notification scheduling", "Patched 23 platform engine loopholes in consistency audit"] },
  { version: "v0.8", date: "May 2025",      tag: "Feature",  accent: "#1D9E75", items: ["Translation engine expanded to 18 languages incl. Igbo and Amharic", "Autopilot rebuilt with zero third-party dependencies", "Weekly Digest feature launched"] },
  { version: "v0.7", date: "April 2025",    tag: "Platform", accent: "#7C3AED", items: ["81-table PostgreSQL schema finalized", "Real-time Spaces with WebSocket infrastructure", "Mobile prototype complete across 6 screens"] },
  { version: "v0.6", date: "March 2025",    tag: "Legal",    accent: "#FFB830", items: ["Full legal suite completed: Operating Agreement, NDA, Terms, Privacy Policy", "SAFE Note Term Sheet drafted", "Articles of Organization filed in Indiana"] },
  { version: "v0.5", date: "February 2025", tag: "Brand",    accent: "#FF6B6B", items: ["Vylapp brand system v1.0: Electric Violet, Teal, Coral", "Logo mark created", "Platform vocabulary: Vibes, Spaces, Connects, Super Vibes"] },
];

export const NAV_MAIN = [
  { path: "/about",       label: "About" },
  { path: "/features",    label: "Features" },
  { path: "/communities", label: "Communities" },
  { path: "/creators",    label: "For Creators" },
  { path: "/pricing",     label: "Pricing" },
];

export const NAV_MORE = [
  { path: "/spaces",    label: "Spaces" },
  { path: "/press",     label: "Press" },
  { path: "/help",      label: "Help" },
  { path: "/manifesto", label: "Manifesto" },
  { path: "/investors", label: "Investors" },
  { path: "/contact",   label: "Contact" },
];

export const FOOTER_LINKS = [
  { title: "Platform", links: [["/features","Features"],["/communities","Communities"],["/spaces","Spaces"],["/pricing","Pricing"]] },
  { title: "Creators",  links: [["/creators","For Creators"],["/investors","Investors"],["/manifesto","Manifesto"]] },
  { title: "Company",  links: [["/about","About"],["/press","Press"],["/contact","Contact"],["/help","Help"]] },
  { title: "Legal",    links: [["/terms","Terms"],["/privacy","Privacy"],["/guidelines","Guidelines"]] },
];

export const TRANSLATION_SENTENCES = [
  { id: 1, text: "Welcome to our community, we are glad to have you here!" },
  { id: 2, text: "Real conversations happen when we speak from our hearts." },
  { id: 3, text: "Let's build agricultural innovation together for the future." }
];

export const TRANSLATION_LANGUAGES = {
  swahili: {
    name: "Swahili (Kiswahili)",
    flag: "🌍",
    accent: "#1D9E75",
    1: "Karibu kwenye jumuiya yetu, tuna furaha kuwa nawe hapa!",
    2: "Mazungumzo ya kweli hutokea tunapozungumza kutoka mioyoni mwetu.",
    3: "Tujenge uvumbuzi wa kilimo pamoja kwa ajili ya siku zijazo."
  },
  yoruba: {
    name: "Yoruba (Èdè Yorùbá)",
    flag: "🇳🇬",
    accent: "#7C3AED",
    1: "Kaabo si agbegbe wa, inu wa dun lati ni o nibi!",
    2: "Awọn ibaraẹnisọrọ gidi n ṣẹlẹ nigbati a ba sọrọ lati ọkan wa.",
    3: "Jẹ ki a kọ isọdọtun iṣẹ-ogbin papọ fun ọjọ iwaju."
  },
  igbo: {
    name: "Igbo (Asụsụ Igbo)",
    flag: "🇳🇬",
    accent: "#FF6B6B",
    1: "Nnọọ na obodo anyị, anyị nwere obi ụtọ inwe gị ebe a!",
    2: "Ezigbo mkparịta ụka na-eme mgbe anyị siri n'obi anyị kwuo okwu.",
    3: "Ka anyị mekọọ ihe ọhụrụ n'ọrụ ugbo ọnụ maka ọdịnihu."
  },
  amharic: {
    name: "Amharic (አማርኛ)",
    flag: "🇪🇹",
    accent: "#FFB830",
    1: "ወደ ማህበረሰባችን እንኳን በደህና መጡ፣ እዚህ በመገኘትዎ ደስ ብሎናል!",
    2: "እውነተኛ ውይይቶች የሚከናወኑት ከልባችን ስንናገር ነው።",
    3: "ለወደፊቱ የእርሻ ፈጠራን አብረን እንገንባ።"
  },
  hausa: {
    name: "Hausa (Harshen Hausa)",
    flag: "🇳🇬",
    accent: "#1D9E75",
    1: "Barka da zuwa ga al'ummarmu, muna farin cikin samun ku a nan!",
    2: "Tattaunawa ta gari tana faruwa ne lokacin da muke magana daga cikin zukatanmu.",
    3: "Bari mu gina dabarun aikin gona tare don gaba."
  }
};

export const FAQ_ITEMS = [
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

export const TEAM_MEMBERS = [
  { name: "Temim Bashiru",          role: "Founder & CEO · Finance & Business Systems Lead", photo: "/temim.jpeg",   desc: "A seasoned banker and management professional with deep experience in financial operations, compliance, and organizational performance. Oversees management, financial planning, budgeting, and business workflows for Vylapp LLC.", avatarColor: "#7C3AED" },
  { name: "Shefiu Azeez",           role: "Creative Director & Strategic Lead",               photo: null,            desc: "A visionary video director specializing in AI-enhanced and futuristic content. Leads creative direction, brand identity, content production, and long-term platform strategy for Vylapp.", avatarColor: "#FF6B6B" },
  { name: "Oluokun Kabiru Adesina", role: "Software Engineering & Data Systems Lead",         photo: "/adesina.jpeg", desc: "A software engineer with hands-on experience building backend systems, APIs, and data-driven platforms across fintech, edtech, and enterprise. Leads backend architecture, data pipelines, and scalable infrastructure.", avatarColor: "#1D9E75" },
  { name: "Huswat Lawal",           role: "Brand Partnerships, R&D & Customer Success Lead",  photo: null,            desc: "An experienced banker and data analysis specialist. Passionate about Yoruba language and culture, she brings a unique cultural lens to brand development, user engagement, and community-centered innovation.", avatarColor: "#FFB830" },
];

export const SPACES_SIMULATED_TRANSCRIPT = {
  english: [
    { speaker: "Leon Chen", text: "Welcome to today's Space on Building Your Second Brain." },
    { speaker: "Leon Chen", text: "The main idea is that our brains are for having ideas, not holding them." },
    { speaker: "Leon Chen", text: "When you externalize your thinking, you free up cognitive load." },
    { speaker: "Aisha Kamara", text: "Absolutely, I've been using this to manage all my Web3 project docs." },
    { speaker: "Leon Chen", text: "Exactly! And the organic translation lets us share these frameworks globally." }
  ],
  swahili: [
    { speaker: "Leon Chen", text: "Karibu kwenye Space ya leo kuhusu Kujenga Ubongo Wako wa Pili." },
    { speaker: "Leon Chen", text: "Wazo kuu ni kwamba akili zetu ni kwa ajili ya kupata mawazo, sio kuyashikilia." },
    { speaker: "Leon Chen", text: "Unapoweka wazi fikra zako, unapunguza mzigo wa kiakili." },
    { speaker: "Aisha Kamara", text: "Kabisa, nimekuwa nikitumia hii kudhibiti hati zote za mradi wangu wa Web3." },
    { speaker: "Leon Chen", text: "Kabisa! Na tafsiri ya kikaboni inaruhusu kushiriki mifumo hii ulimwenguni kote." }
  ],
  yoruba: [
    { speaker: "Leon Chen", text: "Kaabo si Aaye oni lori Kikọ Brain Keji Rẹ." },
    { speaker: "Leon Chen", text: "Eto akọkọ ni pe awọn ọpọlọ wa jẹ fun nini awọn imọran, kii ṣe idaduro wọn." },
    { speaker: "Leon Chen", text: "Nigbati o ba sọ ero rẹ di ita, o tu ero inu silẹ." },
    { speaker: "Aisha Kamara", text: "Lootọ, Mo ti n lo eyi lati ṣakoso gbogbo awọn iwe aṣẹ iṣẹ akanṣe Web3 mi." },
    { speaker: "Leon Chen", text: "Gangan! Ati pe translation yii n jẹ ki a pin awọn ilana wọnyi kaakiri agbaye." }
  ],
  igbo: [
    { speaker: "Leon Chen", text: "Nnọọ na oghere nke taa gbasara iwu ụbụrụ nke abụọ gị." },
    { speaker: "Leon Chen", text: "Isi echiche bụ na ụbụrụ anyị bụ maka inwe echiche, ọ bụghị ijide ha." },
    { speaker: "Leon Chen", text: "Mgbe ị wepụrụ echiche gị n'èzí, ị na-ahapụ ibu ọrụ ọgụgụ isi." },
    { speaker: "Aisha Kamara", text: "N'ezie, ejirila m ihe a jikwaa akwụkwọ ọrụ Web3 m niile." },
    { speaker: "Leon Chen", text: "Kpọmkwem! Ma organic translation na-enye anyị ohere ịkekọrịta usoro ndị a n'ụwa niile." }
  ]
};

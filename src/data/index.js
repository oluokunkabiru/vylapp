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
  { path: "/blog",      label: "Blog" },
  { path: "/press",     label: "Press" },
  { path: "/help",      label: "Help" },
  { path: "/manifesto", label: "Manifesto" },
  { path: "/changelog", label: "Changelog" },
  { path: "/investors", label: "Investors" },
  { path: "/contact",   label: "Contact" },
];

export const FOOTER_LINKS = [
  { title: "Platform", links: [["/features","Features"],["/communities","Communities"],["/spaces","Spaces"],["/pricing","Pricing"]] },
  { title: "Creators",  links: [["/creators","For Creators"],["/changelog","Changelog"],["/blog","Blog"],["/investors","Investors"]] },
  { title: "Company",  links: [["/about","About"],["/press","Press"],["/contact","Contact"],["/help","Help"]] },
  { title: "Legal",    links: [["/terms","Terms"],["/privacy","Privacy"],["/guidelines","Guidelines"]] },
];

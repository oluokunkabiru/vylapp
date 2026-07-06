// ════════════════════════════════════════════════════════════════════════════
//  ONBOARDING ENGINE — ported from vylapp-organic-api.jsx
//  60-second onboarding: step flow, interest matching, first-vibe prompts
// ════════════════════════════════════════════════════════════════════════════
const STEPS = ["welcome", "interests", "handle", "avatar", "follow_suggestions", "complete"];

const INTEREST_MAP = {
  tech: ["#DAOs", "#BuildInPublic", "#AI", "#Web3", "#OpenSource"],
  global: ["#GlobalConnect", "#Languages", "#Travel", "#Culture", "#Diaspora"],
  human: ["#SecondBrain", "#PKM", "#DeepWork", "#Accountability", "#Growth"],
  creative: ["#ClimateArt", "#Music", "#Design", "#Writing", "#Creativity"],
  spaces: ["#LiveSpace", "#AMA", "#BuildInPublic", "#Community", "#Podcast"],
};

// FIX LP-020: All 7 interest categories now have specific prompts.
// AgriTech, Spaces, DAO, and Learn were missing — these are core Vylapp demographics.
// The first vibe a user sees determines whether they stay.
const FIRST_VIBE_PROMPTS = {
  tech:     `Just joined Vylapp 🚀 Excited to connect with builders, thinkers, and DAO explorers. What are you building right now? #TechVibes #BuildInPublic`,
  global:   `Hello from [your city] 🌍 Here to connect with people across cultures and time zones. Let's vibe across borders! #GlobalConnect`,
  human:    `Starting my Vylapp learning journey 🧠 Who's building their second brain here? Drop a follow. #HumanPotential`,
  creative: `First vibe from a creative 🎨 Here to share work, get feedback, and collaborate with other makers. #CreativeLearn`,
  agri:     `Feeding the future with technology 🌱 Farmers, AgriTech builders, and climate-resilient agriculture advocates — let's connect. Who's doing interesting work in food systems? #AgriTech #Africa`,
  spaces:   `Just discovered Vylapp Spaces — the live audio experience is different from anything else I've tried 🎙️ Who should I listen to? Drop your Space recommendations. #LiveSpaces #Community`,
  dao:      `Web3 and DAO governance explorer here 🔗 Interested in decentralized community decision-making that actually works at scale. What governance tools are you using? #DAOs #Web3`,
  learn:    `Lifelong learner, showing up on Vylapp to grow alongside a real community 📚 What are you learning right now? I'll share mine if you share yours. #Learning #Accountability`,
};

const OnboardingEngine = {
  STEPS, INTEREST_MAP,

  nextStep(currentStep) {
    const idx = STEPS.indexOf(currentStep);
    return STEPS[idx + 1] || "complete";
  },

  matchCreators(interests, creatorPool) {
    const relevant = creatorPool.filter(c => interests.some(i => (c.interests || []).includes(i)));
    const diverse = creatorPool.filter(c => !relevant.includes(c)).slice(0, 2);
    return [...relevant.slice(0, 5), ...diverse];
  },

  generateFirstVibePrompt(interests = []) {
    const key = interests[0] || "global";
    return FIRST_VIBE_PROMPTS[key] || FIRST_VIBE_PROMPTS.global;
  },

  completionScore(events) {
    const weights = { welcome: 10, interests: 25, handle: 15, avatar: 10, follow_suggestions: 20, complete: 20 };
    const total = events.reduce((s, e) => s + (weights[e.step] || 0), 0);
    return { score: total, max: 100, pct: total + "%", missing: Object.keys(weights).filter(s => !events.find(e => e.step === s)) };
  },
};

module.exports = OnboardingEngine;

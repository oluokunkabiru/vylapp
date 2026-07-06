// ════════════════════════════════════════════════════════════════════════════
//  AUTOPILOT ENGINE — ported from vylapp-autopilot.jsx
//
//  Same honesty note as translation: the original artifact called Claude's
//  API directly for generation. Default here is a fully organic,
//  template + topic-bank generator (zero external calls, matches the
//  "self-contained AI posting system" framing from memory). If
//  ANTHROPIC_API_KEY is set, posts get genuinely AI-written instead.
// ════════════════════════════════════════════════════════════════════════════
const env = require("../config/env");

const TOPIC_BANK = {
  TECH_VIBES: ["open-sourcing a governance toolkit", "shipping a DAO voting module", "a new AI pair-programming workflow", "decentralized identity standards", "the latest Web3 tooling release"],
  GLOBAL_CONNECT: ["10,000 farmers onboarded to AI crop advisory", "a diaspora mentorship circle launching", "climate-resilient farming techniques spreading", "a cross-border remittance pilot", "language access programs in rural schools"],
  CREATIVE_LEARN: ["a generative art collection reacting to climate data", "a collaborative mural project", "AI-assisted music composition", "a typography experiment", "a community photo-essay series"],
  HUMAN_POTENTIAL: ["weekly accountability reviews", "building a second brain system", "a 30-day deep work challenge", "journaling for clarity", "habit stacking that actually works"],
  SPACES_INVITE: ["a live AMA on second brains", "a deep-dive on DAO governance", "a collector preview for generative art", "an AgriTech scale-up roundtable", "a Q&A on cross-border community building"],
};

const TEMPLATES = {
  TECH_VIBES: (topic) => `Just made progress on ${topic}. Three months of building with the community kept me accountable. What are you building right now? #BuildInPublic #TechVibes`,
  GLOBAL_CONNECT: (topic) => `Update from the community: ${topic}. Technology plus community equals real change. What's a win you've seen lately? #GlobalConnect`,
  CREATIVE_LEARN: (topic) => `New work in progress: ${topic}. Art and ideas worth sharing. What are you creating this week? #CreativeLearn`,
  HUMAN_POTENTIAL: (topic) => `Hot take: ${topic} changed how I show up daily. None of the apps worked until the community held me accountable. What's keeping you growing? #HumanPotential`,
  SPACES_INVITE: (topic) => `Hosting ${topic} soon. Bring your questions, this one's worth your time. Set a reminder. #LiveSpace #Community`,
};

const HASHTAG_BANK = {
  TECH_VIBES: ["#DAOs", "#Web3", "#AI", "#BuildInPublic", "#OpenSource"],
  GLOBAL_CONNECT: ["#AgriTech", "#Africa", "#Impact", "#Community"],
  CREATIVE_LEARN: ["#GenArt", "#ClimateArt", "#Design", "#Create"],
  HUMAN_POTENTIAL: ["#Learning", "#Accountability", "#SecondBrain", "#Growth"],
  SPACES_INVITE: ["#LiveSpace", "#AMA", "#DeepDive", "#Community"],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function claudeGenerate(category, topic) {
  const prompt = `Write a short, authentic, high-engagement social media post (2-4 sentences, max 280 chars) for Vylapp's ${category.replace("_", " ")} feed about: "${topic}". Include a genuine hook and 2-3 relevant hashtags. End with a question. Output only the post text.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env.anthropicApiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("").trim();
  if (!text) throw new Error("Autopilot generation returned no content");
  return text;
}

const AutopilotEngine = {
  TOPIC_BANK, HASHTAG_BANK,

  pickTopic(category) {
    return pick(TOPIC_BANK[category] || TOPIC_BANK.TECH_VIBES);
  },

  async generatePost(category, topic) {
    const t = topic || this.pickTopic(category);
    if (env.anthropicApiKey) {
      try {
        const content = await claudeGenerate(category, t);
        return { content, topic: t, method: "claude" };
      } catch {
        // fall through to organic
      }
    }
    const fn = TEMPLATES[category] || TEMPLATES.TECH_VIBES;
    return { content: fn(t), topic: t, method: "template" };
  },

  estimateEngagement(content, category) {
    const len = content.length;
    const hasQuestion = content.includes("?");
    const hashCount = (content.match(/#\w+/g) || []).length;
    const catMultiplier = { TECH_VIBES: 1.1, GLOBAL_CONNECT: 1.4, CREATIVE_LEARN: 1.2, HUMAN_POTENTIAL: 1.3, SPACES_INVITE: 1.0 }[category] || 1;
    let base = 400 + Math.floor(Math.random() * 600);
    if (hasQuestion) base *= 1.3;
    if (hashCount >= 2) base *= 1.2;
    if (len > 150 && len < 260) base *= 1.15;
    base *= catMultiplier;
    const likes = Math.floor(base * (0.7 + Math.random() * 0.6));
    return { est_likes: likes, est_reposts: Math.floor(likes * 0.25), est_replies: Math.floor(likes * 0.15) };
  },
};

module.exports = AutopilotEngine;

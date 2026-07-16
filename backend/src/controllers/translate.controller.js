const { ok, fail } = require("../utils/respond");
const TranslationEngine = require("../services/translationEngine");
const prisma = require("../config/prisma");

function listLanguages(req, res) {
  return ok(res, { languages: TranslationEngine.LANGUAGES });
}

async function translateText(req, res) {
  const { text, fromLang, toLang, context } = req.body;
  if (!text || !toLang) return fail(res, 400, "text and toLang are required");
  const result = await TranslationEngine.translate(text, fromLang || "en", toLang, context || "post");
  return ok(res, result);
}

async function translateVibe(req, res) {
  const { toLang } = req.body;
  if (!toLang) return fail(res, 400, "toLang is required");
  const vibe = await prisma.vibes.findUnique({
    where: { id: req.params.id },
    select: { content: true, language: true },
  });
  if (!vibe) return fail(res, 404, "Vibe not found");
  const result = await TranslationEngine.translate(vibe.content, vibe.language || "en", toLang, "post");
  return ok(res, result);
}

module.exports = { listLanguages, translateText, translateVibe };

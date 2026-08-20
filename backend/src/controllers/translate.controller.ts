import { Request, Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import TranslationEngine from "../services/translationEngine";
import prisma from "../config/prisma";

const { ok, fail } = respond;

function listLanguages(req: Request, res: Response) {
  return ok(res, { languages: TranslationEngine.LANGUAGES });
}

async function translateText(req: Request, res: Response) {
  const { text, fromLang, toLang, context } = req.body;
  if (!text || !toLang) return fail(res, 400, "text and toLang are required");
  const result = await TranslationEngine.translate(text, fromLang || "en", toLang, context || "post");
  return ok(res, result);
}

async function translateVibe(req: Request, res: Response) {
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

// ── POST /translate/corrections — T-21/T-22 ────────────────────────────────
// Captures the suggestion against the exact cache entry a fix would need to
// update (T-24, not built yet) — this endpoint only records it; nothing
// reviews or applies it. sourceText/originalTranslation are stored in full,
// not just their hash, since T-23's review queue doesn't exist and a human
// will eventually need to read what's being proposed.
async function submitCorrection(req: AuthedRequest, res: Response) {
  const { text, targetLang, originalTranslation, suggestedText } = req.body;
  if (!text?.trim() || !targetLang || !originalTranslation?.trim() || !suggestedText?.trim()) {
    return fail(res, 400, "text, targetLang, originalTranslation, and suggestedText are all required");
  }
  if (suggestedText.trim() === originalTranslation.trim()) {
    return fail(res, 400, "suggestedText must actually differ from the current translation");
  }
  const textHash = TranslationEngine.hashText(text);
  const correction = await prisma.translationCorrections.create({
    data: {
      textHash, targetLang, sourceText: text, originalTranslation: originalTranslation.trim(),
      suggestedText: suggestedText.trim(), submittedBy: req.user.id,
    },
    select: { id: true, createdAt: true },
  });
  return ok(res, { correction }, 201);
}

export = { listLanguages, translateText, translateVibe, submitCorrection };

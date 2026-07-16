import { Request, Response } from "express";
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

export = { listLanguages, translateText, translateVibe };

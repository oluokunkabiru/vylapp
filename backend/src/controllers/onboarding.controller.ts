import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import OnboardingEngine from "../services/onboardingEngine";
import TranslationEngine from "../services/translationEngine";
import prisma from "../config/prisma";
import { OnboardingStep } from "../generated/prisma";

const { ok, fail } = respond;

// OnboardingEngine.nextStep is still plain JS returning a string — narrow it
// to the Prisma enum type at the boundary where it's written to the DB.
const nextStep = (from: string): OnboardingStep => OnboardingEngine.nextStep(from) as OnboardingStep;

// ── GET /onboarding/flow ─────────────────────────────────────────────────
async function flow(req: AuthedRequest, res: Response) {
  return ok(res, { steps: OnboardingEngine.STEPS, interestMap: OnboardingEngine.INTEREST_MAP });
}

// ── POST /onboarding/interests ───────────────────────────────────────────
async function setInterests(req: AuthedRequest, res: Response) {
  const { interests, contentLanguages } = req.body;
  if (!Array.isArray(interests) || !interests.length) return fail(res, 400, "interests must be a non-empty array");

  let languages: string[] | null = null;
  if (contentLanguages !== undefined) {
    if (!Array.isArray(contentLanguages) || !contentLanguages.length) return fail(res, 400, "contentLanguages must be a non-empty array");
    const validCodes = new Set(TranslationEngine.LANGUAGES.map((l: any) => l.code));
    languages = contentLanguages.filter((c: string) => validCodes.has(c));
    if (!languages.length) return fail(res, 400, "contentLanguages must contain at least one supported language code");
  }

  await prisma.users.update({
    where: { id: req.user.id },
    data: {
      interests,
      onboardingStep: nextStep("interests"),
      ...(languages ? { contentLanguage: languages } : {}),
    },
  });
  await prisma.onboardingEvents.create({
    data: { userId: req.user.id, step: "interests", data: { interests } },
  }).catch(() => {});

  const creators = await prisma.users.findMany({
    where: { id: { not: req.user.id } },
    select: { id: true, handle: true, displayName: true, interests: true },
    take: 50,
  });
  const suggested = OnboardingEngine.matchCreators(interests, creators.map(c => ({ id: c.id, handle: c.handle, display_name: c.displayName, interests: c.interests })));
  const firstVibePrompt = OnboardingEngine.generateFirstVibePrompt(interests);

  return ok(res, { suggestedCreators: suggested.slice(0, 7), firstVibePrompt, nextStep: nextStep("interests") });
}

// ── POST /onboarding/handle (check + set display handle) ────────────────
async function setHandle(req: AuthedRequest, res: Response) {
  const { handle } = req.body;
  if (!handle || !/^[a-z0-9._]{3,20}$/i.test(handle)) return fail(res, 400, "Handle must be 3-20 characters, letters/numbers/./_ only");
  const dupe = await prisma.users.findFirst({ where: { handle, id: { not: req.user.id } }, select: { id: true } });
  if (dupe) return fail(res, 409, "Handle already taken");
  await prisma.users.update({ where: { id: req.user.id }, data: { handle, onboardingStep: nextStep("handle") } });
  return ok(res, { handle, nextStep: nextStep("handle") });
}

// ── POST /onboarding/avatar (set avatar color) ───────────────────────────
async function setAvatar(req: AuthedRequest, res: Response) {
  const { avatarColor } = req.body;
  if (!avatarColor || !/^#[0-9a-f]{6}$/i.test(avatarColor)) return fail(res, 400, "avatarColor must be a #RRGGBB hex string");
  await prisma.users.update({ where: { id: req.user.id }, data: { avatarColor, onboardingStep: nextStep("avatar") } });
  return ok(res, { avatarColor, nextStep: nextStep("avatar") });
}

// ── POST /onboarding/location (current country/city + optional heritage) ─
async function setLocation(req: AuthedRequest, res: Response) {
  const { currentCountry, currentCity, heritageCountries } = req.body;
  if (!currentCountry || !/^[A-Za-z]{2}$/.test(currentCountry)) return fail(res, 400, "currentCountry must be a 2-letter country code");

  let heritage: string[] = [];
  if (heritageCountries !== undefined) {
    if (!Array.isArray(heritageCountries)) return fail(res, 400, "heritageCountries must be an array");
    heritage = heritageCountries.filter((c: string) => /^[A-Za-z]{2}$/.test(c)).map((c: string) => c.toUpperCase());
  }

  const cc = currentCountry.toUpperCase();
  const city = currentCity?.trim() || null;
  const locationLabel = city ? `${city}, ${cc}` : cc;

  await prisma.users.update({
    where: { id: req.user.id },
    data: {
      currentCountry: cc,
      currentCity: city,
      heritageCountries: heritage,
      location: locationLabel,
      onboardingStep: nextStep("location"),
    },
  });
  return ok(res, { currentCountry: cc, currentCity: city, heritageCountries: heritage, nextStep: nextStep("location") });
}

// ── POST /onboarding/follow-suggestions ──────────────────────────────────
async function followSuggestions(req: AuthedRequest, res: Response) {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) return fail(res, 400, "userIds must be an array");
  for (const targetId of userIds) {
    if (targetId === req.user.id) continue;
    await prisma.connections.upsert({
      where: { followerId_followingId: { followerId: req.user.id, followingId: targetId } },
      create: { followerId: req.user.id, followingId: targetId },
      update: {},
    });
  }
  await prisma.users.update({ where: { id: req.user.id }, data: { onboardingStep: nextStep("follow_suggestions") } });
  return ok(res, { followed: userIds.length, nextStep: nextStep("follow_suggestions") });
}

// ── POST /onboarding/complete ─────────────────────────────────────────────
async function complete(req: AuthedRequest, res: Response) {
  await prisma.users.update({ where: { id: req.user.id }, data: { onboardingStep: "complete", onboardingDone: true } });
  const events = await prisma.onboardingEvents.findMany({ where: { userId: req.user.id }, select: { step: true } }).catch(() => [] as { step: string }[]);
  const score = OnboardingEngine.completionScore(events.map(e => ({ step: e.step })).concat([{ step: "complete" }]));
  return ok(res, { done: true, completionScore: score });
}

export = { flow, setInterests, setHandle, setAvatar, setLocation, followSuggestions, complete };

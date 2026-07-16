const { ok, fail } = require("../utils/respond");
const OnboardingEngine = require("../services/onboardingEngine");
const TranslationEngine = require("../services/translationEngine");
const prisma = require("../config/prisma");

// ── GET /onboarding/flow ─────────────────────────────────────────────────
async function flow(req, res) {
  return ok(res, { steps: OnboardingEngine.STEPS, interestMap: OnboardingEngine.INTEREST_MAP });
}

// ── POST /onboarding/interests ───────────────────────────────────────────
async function setInterests(req, res) {
  const { interests, contentLanguages } = req.body;
  if (!Array.isArray(interests) || !interests.length) return fail(res, 400, "interests must be a non-empty array");

  let languages = null;
  if (contentLanguages !== undefined) {
    if (!Array.isArray(contentLanguages) || !contentLanguages.length) return fail(res, 400, "contentLanguages must be a non-empty array");
    const validCodes = new Set(TranslationEngine.LANGUAGES.map(l => l.code));
    languages = contentLanguages.filter(c => validCodes.has(c));
    if (!languages.length) return fail(res, 400, "contentLanguages must contain at least one supported language code");
  }

  await prisma.users.update({
    where: { id: req.user.id },
    data: {
      interests,
      onboardingStep: OnboardingEngine.nextStep("interests"),
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

  return ok(res, { suggestedCreators: suggested.slice(0, 7), firstVibePrompt, nextStep: OnboardingEngine.nextStep("interests") });
}

// ── POST /onboarding/handle (check + set display handle) ────────────────
async function setHandle(req, res) {
  const { handle } = req.body;
  if (!handle || !/^[a-z0-9._]{3,20}$/i.test(handle)) return fail(res, 400, "Handle must be 3-20 characters, letters/numbers/./_ only");
  const dupe = await prisma.users.findFirst({ where: { handle, id: { not: req.user.id } }, select: { id: true } });
  if (dupe) return fail(res, 409, "Handle already taken");
  await prisma.users.update({ where: { id: req.user.id }, data: { handle, onboardingStep: OnboardingEngine.nextStep("handle") } });
  return ok(res, { handle, nextStep: OnboardingEngine.nextStep("handle") });
}

// ── POST /onboarding/avatar (set avatar color) ───────────────────────────
async function setAvatar(req, res) {
  const { avatarColor } = req.body;
  if (!avatarColor || !/^#[0-9a-f]{6}$/i.test(avatarColor)) return fail(res, 400, "avatarColor must be a #RRGGBB hex string");
  await prisma.users.update({ where: { id: req.user.id }, data: { avatarColor, onboardingStep: OnboardingEngine.nextStep("avatar") } });
  return ok(res, { avatarColor, nextStep: OnboardingEngine.nextStep("avatar") });
}

// ── POST /onboarding/location (current country/city + optional heritage) ─
async function setLocation(req, res) {
  const { currentCountry, currentCity, heritageCountries } = req.body;
  if (!currentCountry || !/^[A-Za-z]{2}$/.test(currentCountry)) return fail(res, 400, "currentCountry must be a 2-letter country code");

  let heritage = [];
  if (heritageCountries !== undefined) {
    if (!Array.isArray(heritageCountries)) return fail(res, 400, "heritageCountries must be an array");
    heritage = heritageCountries.filter(c => /^[A-Za-z]{2}$/.test(c)).map(c => c.toUpperCase());
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
      onboardingStep: OnboardingEngine.nextStep("location"),
    },
  });
  return ok(res, { currentCountry: cc, currentCity: city, heritageCountries: heritage, nextStep: OnboardingEngine.nextStep("location") });
}

// ── POST /onboarding/follow-suggestions ──────────────────────────────────
async function followSuggestions(req, res) {
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
  await prisma.users.update({ where: { id: req.user.id }, data: { onboardingStep: OnboardingEngine.nextStep("follow_suggestions") } });
  return ok(res, { followed: userIds.length, nextStep: OnboardingEngine.nextStep("follow_suggestions") });
}

// ── POST /onboarding/complete ─────────────────────────────────────────────
async function complete(req, res) {
  await prisma.users.update({ where: { id: req.user.id }, data: { onboardingStep: "complete", onboardingDone: true } });
  const events = await prisma.onboardingEvents.findMany({ where: { userId: req.user.id }, select: { step: true } }).catch(() => []);
  const score = OnboardingEngine.completionScore(events.map(e => ({ step: e.step })).concat([{ step: "complete" }]));
  return ok(res, { done: true, completionScore: score });
}

module.exports = { flow, setInterests, setHandle, setAvatar, setLocation, followSuggestions, complete };

import { Response } from "express";
import { AuthedRequest } from "../types/express";
import prisma from "../config/prisma";
import respond from "../utils/respond";
import ModerationEngine from "../services/moderationEngine";
import LanguageDetector from "../services/languageDetector";
import TranslationEngine from "../services/translationEngine";
import mediaController from "./media.controller";

const { ok, fail } = respond;

function shapeStory(story: any) {
  return {
    id: story.id,
    caption: story.caption,
    language: story.language,
    viewsCount: story.viewsCount,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    viewed: !!story.storyViews?.length,
    media: mediaController.shapeMediaAsset(story.mediaAsset),
    author: {
      id: story.users.id,
      handle: story.users.handle,
      displayName: story.users.displayName,
      avatarColor: story.users.avatarColor,
      avatarInitials: story.users.avatarInitials,
      avatarUrl: story.users.avatarUrl,
      verified: story.users.verificationTier !== "none",
    },
  };
}

async function list(req: AuthedRequest, res: Response) {
  const [following, mutes, blocks] = await Promise.all([
    prisma.connections.findMany({ where: { followerId: req.user.id }, select: { followingId: true } }),
    prisma.userMutes.findMany({ where: { muterId: req.user.id }, select: { mutedId: true } }),
    prisma.userBlocks.findMany({
      where: { OR: [{ blockerId: req.user.id }, { blockedId: req.user.id }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);
  const excluded = new Set([
    ...mutes.map(row => row.mutedId),
    ...blocks.map(row => row.blockerId === req.user.id ? row.blockedId : row.blockerId),
  ]);
  const visibleUserIds = [req.user.id, ...following.map(row => row.followingId)].filter(id => !excluded.has(id));
  const stories = await prisma.stories.findMany({
    where: { userId: { in: visibleUserIds }, expiresAt: { gt: new Date() }, deletedAt: null },
    include: {
      mediaAsset: true,
      users: true,
      storyViews: { where: { viewerId: req.user.id }, select: { viewerId: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return ok(res, { stories: stories.map(shapeStory) });
}

async function create(req: AuthedRequest, res: Response) {
  const { mediaId, caption, language: declaredLanguage } = req.body;
  if (!mediaId) return fail(res, 400, "mediaId is required");
  const cleanCaption = typeof caption === "string" ? caption.trim() : "";
  if (cleanCaption.length > 500) return fail(res, 400, "caption must be 500 characters or fewer");

  const asset = await prisma.mediaAssets.findUnique({ where: { id: mediaId } });
  if (!asset || asset.uploadedBy !== req.user.id) return fail(res, 404, "Uploaded media not found");
  if (asset.mediaType !== "image" && asset.mediaType !== "video") return fail(res, 400, "Stories require an image or video");

  if (cleanCaption) {
    const moderation = await ModerationEngine.analyzeContent(cleanCaption, { is_minor: req.user.isMinor });
    if (moderation.action === "remove" || moderation.action === "remove_and_support") {
      return fail(res, 422, `Story blocked: ${moderation.label}`, { moderation });
    }
  }
  const language = (typeof declaredLanguage === "string" && TranslationEngine.getLang(declaredLanguage))
    ? declaredLanguage
    : cleanCaption ? await LanguageDetector.detect(cleanCaption, "en") : "en";

  const story = await prisma.stories.create({
    data: {
      userId: req.user.id,
      mediaAssetId: asset.id,
      caption: cleanCaption || null,
      language,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    include: { mediaAsset: true, users: true, storyViews: true },
  });
  return ok(res, { story: shapeStory(story) }, 201);
}

async function markViewed(req: AuthedRequest, res: Response) {
  const story = await prisma.stories.findFirst({
    where: { id: req.params.id, deletedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  });
  if (!story) return fail(res, 404, "Story not found");
  if (story.userId === req.user.id) return ok(res, { viewed: true });

  const [followsAuthor, blocked] = await Promise.all([
    prisma.connections.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: story.userId } },
      select: { followerId: true },
    }),
    prisma.userBlocks.findFirst({
      where: {
        OR: [
          { blockerId: req.user.id, blockedId: story.userId },
          { blockerId: story.userId, blockedId: req.user.id },
        ],
      },
      select: { blockerId: true },
    }),
  ]);
  if (!followsAuthor || blocked) return fail(res, 404, "Story not found");

  await prisma.$transaction(async tx => {
    const inserted = await tx.storyViews.createMany({
      data: [{ storyId: story.id, viewerId: req.user.id }],
      skipDuplicates: true,
    });
    if (inserted.count) {
      await tx.stories.update({ where: { id: story.id }, data: { viewsCount: { increment: 1 } } });
    }
  });
  return ok(res, { viewed: true });
}

async function remove(req: AuthedRequest, res: Response) {
  const story = await prisma.stories.findUnique({ where: { id: req.params.id }, select: { userId: true } });
  if (!story || story.userId !== req.user.id) return fail(res, 404, "Story not found");
  await prisma.stories.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { deleted: true });
}

export = { list, create, markViewed, remove };

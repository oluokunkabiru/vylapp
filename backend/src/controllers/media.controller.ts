import { Response } from "express";
import { AuthedRequest } from "../types/express";
import prisma from "../config/prisma";
import respond from "../utils/respond";
import { processUpload, removeStoredFiles } from "../services/mediaStorage";

const { ok, fail } = respond;

function shapeMediaAsset(asset: any) {
  return {
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    mediaType: asset.mediaType,
    width: asset.width,
    height: asset.height,
    durationMs: asset.durationMs,
    sizeBytes: Number(asset.sizeBytes),
    mimeType: asset.mimeType,
  };
}

async function upload(req: AuthedRequest, res: Response) {
  if (!req.file) return fail(res, 400, "file is required");
  let processed;
  try {
    processed = await processUpload(req.file);
    const asset = await prisma.mediaAssets.create({
      data: {
        uploadedBy: req.user.id,
        url: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
        cdnKey: processed.cdnKey,
        mediaType: processed.mediaType,
        width: processed.width,
        height: processed.height,
        durationMs: processed.durationMs,
        sizeBytes: processed.sizeBytes,
        mimeType: processed.mimeType,
      },
    });
    return ok(res, { media: shapeMediaAsset(asset) }, 201);
  } catch (error: any) {
    if (processed) await removeStoredFiles(processed.cdnKey, processed.thumbnailUrl);
    return fail(res, 422, error?.message || "Media processing failed");
  }
}

async function remove(req: AuthedRequest, res: Response) {
  const asset = await prisma.mediaAssets.findUnique({ where: { id: req.params.id } });
  if (!asset || asset.uploadedBy !== req.user.id) return fail(res, 404, "Media not found");
  const [vibeUses, storyUses] = await Promise.all([
    prisma.vibeMedia.count({ where: { url: asset.url } }),
    prisma.stories.count({ where: { mediaAssetId: asset.id, deletedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  if (vibeUses || storyUses) return fail(res, 409, "Media is already attached to published content");
  await prisma.mediaAssets.delete({ where: { id: asset.id } });
  await removeStoredFiles(asset.cdnKey, asset.thumbnailUrl);
  return ok(res, { deleted: true });
}

export = { upload, remove, shapeMediaAsset };

import { execFile } from "child_process";
import crypto from "crypto";
import fs, { promises as fsp } from "fs";
import path from "path";
import { promisify } from "util";
import multer from "multer";
import sharp from "sharp";
import env from "../config/env";

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(env.mediaStoragePath, ".tmp");
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(env.mediaStoragePath, { recursive: true });

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const AUDIO_MIMES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav"]);
const DOCUMENT_MIMES = new Set(["application/pdf"]);
const MAX_VIDEO_DURATION_MS = 10 * 60 * 1000;
const MAX_AUDIO_DURATION_MS = 10 * 60 * 1000;

const uploader = multer({
  storage: multer.diskStorage({
    destination: TEMP_DIR,
    filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`),
  }),
  limits: { files: 1, fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.has(file.mimetype) || VIDEO_MIMES.has(file.mimetype) || AUDIO_MIMES.has(file.mimetype) || DOCUMENT_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error("Only images, videos, audio, and PDF documents are supported"));
  },
});

export const uploadSingle = uploader.single("file");

export type ProcessedMedia = {
  cdnKey: string;
  url: string;
  thumbnailUrl: string | null;
  mediaType: "image" | "video" | "audio" | "document";
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sizeBytes: bigint;
  mimeType: string;
};

function publicUrl(filename: string) {
  return `${env.mediaPublicBaseUrl}/${encodeURIComponent(filename)}`;
}

async function probeVideo(filePath: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration", "-of", "json", filePath,
  ], { maxBuffer: 1024 * 1024, timeout: 30_000 });
  const data = JSON.parse(stdout);
  const stream = data.streams?.[0] || {};
  return {
    width: Number(stream.width) || null,
    height: Number(stream.height) || null,
    durationMs: data.format?.duration ? Math.round(Number(data.format.duration) * 1000) : null,
  };
}

async function processImage(inputPath: string): Promise<ProcessedMedia> {
  const cdnKey = `${crypto.randomUUID()}.webp`;
  const outputPath = path.join(env.mediaStoragePath, cdnKey);
  try {
    // rotate() applies EXIF orientation, while Sharp's default output behavior
    // drops EXIF/GPS and other metadata. The result is bounded for feed use.
    const info = await sharp(inputPath, { failOn: "error" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 })
      .toFile(outputPath);
    return {
      cdnKey, url: publicUrl(cdnKey), thumbnailUrl: null, mediaType: "image",
      width: info.width, height: info.height, durationMs: null,
      sizeBytes: BigInt(info.size), mimeType: "image/webp",
    };
  } catch (error) {
    await fsp.unlink(outputPath).catch(() => {});
    throw error;
  }
}

async function processVideo(inputPath: string): Promise<ProcessedMedia> {
  const id = crypto.randomUUID();
  const cdnKey = `${id}.mp4`;
  const thumbnailKey = `${id}-thumb.jpg`;
  const outputPath = path.join(env.mediaStoragePath, cdnKey);
  const thumbnailPath = path.join(env.mediaStoragePath, thumbnailKey);
  try {
    const inputProbe = await probeVideo(inputPath);
    if (!inputProbe.width || !inputProbe.height) throw new Error("The upload does not contain a playable video track");
    if (!inputProbe.durationMs || inputProbe.durationMs > MAX_VIDEO_DURATION_MS) {
      throw new Error("Videos must be 10 minutes or shorter");
    }
    await execFileAsync("ffmpeg", [
      "-y", "-i", inputPath, "-map_metadata", "-1",
      "-vf", "scale=min(1080\\,iw):-2",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath,
    ], { maxBuffer: 8 * 1024 * 1024, timeout: 10 * 60 * 1000 });
    await execFileAsync("ffmpeg", [
      "-y", "-ss", "0.2", "-i", outputPath, "-frames:v", "1", "-map_metadata", "-1",
      "-vf", "scale=min(720\\,iw):-2", "-q:v", "3", thumbnailPath,
    ], { maxBuffer: 4 * 1024 * 1024, timeout: 60_000 });
    const [probe, stat] = await Promise.all([probeVideo(outputPath), fsp.stat(outputPath)]);
    return {
      cdnKey, url: publicUrl(cdnKey), thumbnailUrl: publicUrl(thumbnailKey), mediaType: "video",
      width: probe.width, height: probe.height, durationMs: probe.durationMs,
      sizeBytes: BigInt(stat.size), mimeType: "video/mp4",
    };
  } catch (error) {
    await Promise.all([fsp.unlink(outputPath).catch(() => {}), fsp.unlink(thumbnailPath).catch(() => {})]);
    throw error;
  }
}

async function probeAudio(filePath: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-select_streams", "a:0",
    "-show_entries", "stream=codec_type:format=duration", "-of", "json", filePath,
  ], { maxBuffer: 1024 * 1024, timeout: 30_000 });
  const data = JSON.parse(stdout);
  return {
    hasAudio: data.streams?.[0]?.codec_type === "audio",
    durationMs: data.format?.duration ? Math.round(Number(data.format.duration) * 1000) : null,
  };
}

async function processAudio(inputPath: string): Promise<ProcessedMedia> {
  const cdnKey = `${crypto.randomUUID()}.m4a`;
  const outputPath = path.join(env.mediaStoragePath, cdnKey);
  try {
    const inputProbe = await probeAudio(inputPath);
    if (!inputProbe.hasAudio) throw new Error("The upload does not contain playable audio");
    if (!inputProbe.durationMs || inputProbe.durationMs > MAX_AUDIO_DURATION_MS) {
      throw new Error("Audio recordings must be 10 minutes or shorter");
    }
    await execFileAsync("ffmpeg", [
      "-y", "-i", inputPath, "-vn", "-map_metadata", "-1",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath,
    ], { maxBuffer: 8 * 1024 * 1024, timeout: 10 * 60 * 1000 });
    const [probe, stat] = await Promise.all([probeAudio(outputPath), fsp.stat(outputPath)]);
    return {
      cdnKey, url: publicUrl(cdnKey), thumbnailUrl: null, mediaType: "audio",
      width: null, height: null, durationMs: probe.durationMs,
      sizeBytes: BigInt(stat.size), mimeType: "audio/mp4",
    };
  } catch (error) {
    await fsp.unlink(outputPath).catch(() => {});
    throw error;
  }
}

async function processDocument(inputPath: string): Promise<ProcessedMedia> {
  const handle = await fsp.open(inputPath, "r");
  try {
    const signature = Buffer.alloc(5);
    await handle.read(signature, 0, signature.length, 0);
    if (signature.toString("ascii") !== "%PDF-") throw new Error("The uploaded document is not a valid PDF");
  } finally {
    await handle.close();
  }

  const cdnKey = `${crypto.randomUUID()}.pdf`;
  const outputPath = path.join(env.mediaStoragePath, cdnKey);
  try {
    await fsp.copyFile(inputPath, outputPath);
    const stat = await fsp.stat(outputPath);
    return {
      cdnKey, url: publicUrl(cdnKey), thumbnailUrl: null, mediaType: "document",
      width: null, height: null, durationMs: null,
      sizeBytes: BigInt(stat.size), mimeType: "application/pdf",
    };
  } catch (error) {
    await fsp.unlink(outputPath).catch(() => {});
    throw error;
  }
}

export async function processUpload(file: Express.Multer.File): Promise<ProcessedMedia> {
  try {
    if (IMAGE_MIMES.has(file.mimetype)) return await processImage(file.path);
    if (VIDEO_MIMES.has(file.mimetype)) return await processVideo(file.path);
    if (AUDIO_MIMES.has(file.mimetype)) return await processAudio(file.path);
    if (DOCUMENT_MIMES.has(file.mimetype)) return await processDocument(file.path);
    throw new Error("Unsupported media type");
  } finally {
    await fsp.unlink(file.path).catch(() => {});
  }
}

export async function removeStoredFiles(cdnKey: string, thumbnailUrl?: string | null) {
  const files = [cdnKey];
  if (thumbnailUrl) files.push(path.basename(new URL(thumbnailUrl, "http://local").pathname));
  await Promise.all(files.map(filename => fsp.unlink(path.join(env.mediaStoragePath, filename)).catch(() => {})));
}

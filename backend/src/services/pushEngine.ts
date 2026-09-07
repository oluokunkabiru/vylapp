// ════════════════════════════════════════════════════════════════════════════
//  PUSH ENGINE — Firebase Cloud Messaging delivery for background/closed-app
//  notifications (chat messages, etc). Complements — does not replace —
//  the Socket.IO real-time channel: sockets cover the app-open case, FCM
//  covers "app is backgrounded or closed" the way Socket.IO physically can't.
//
//  Multiple devices per user are supported via the push_tokens table (one
//  row per device/token, `platform` distinguishes web/ios/android). Tokens
//  that FCM reports as dead (uninstalled app, revoked permission, expired
//  registration) are deactivated so we stop paying the send cost on them.
// ════════════════════════════════════════════════════════════════════════════
import { initializeApp, cert, App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import env from "../config/env";
import prisma from "../config/prisma";
import logger from "../utils/logger";

function isConfigured(): boolean {
  return !!(env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey);
}

let app: App | null = null;
function getApp(): App | null {
  if (app) return app;
  if (!isConfigured()) return null;
  app = initializeApp({
    credential: cert({
      projectId: env.firebase.projectId as string,
      clientEmail: env.firebase.clientEmail as string,
      privateKey: env.firebase.privateKey as string,
    }),
  });
  return app;
}

// The FCM error codes that mean "this token will never work again" —
// anything else (rate limits, transient server errors) is left alone so a
// blip doesn't silently unregister a perfectly good device.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

// G: quiet hours. quiet_hours_start/end/timezone existed on
// NotificationPreferences with nothing reading them — every push went out
// regardless of the hour. Postgres TIME columns are timezone-naive; the
// wall-clock hour:minute stored there is interpreted against
// quietHoursTimezone here, using Intl rather than pulling in a date
// library for one lookup. Suppresses the push only — the in-app/socket
// notification the caller already created is untouched, so it's still
// there next time the person opens the app; this only stops the buzz.
function minutesOfDay(h: number, m: number) { return h * 60 + m; }

function isWithinQuietHours(prefs: { quietHoursStart: Date | null; quietHoursEnd: Date | null; quietHoursTimezone: string | null }): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
  let hour: number, minute: number;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: prefs.quietHoursTimezone || "UTC", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    hour = parseInt(parts.find(p => p.type === "hour")!.value, 10) % 24; // some locales report midnight as "24"
    minute = parseInt(parts.find(p => p.type === "minute")!.value, 10);
  } catch {
    return false; // unrecognized timezone string — fail open (send it) rather than going silently, permanently quiet
  }
  const nowMin = minutesOfDay(hour, minute);
  const startMin = minutesOfDay(prefs.quietHoursStart.getUTCHours(), prefs.quietHoursStart.getUTCMinutes());
  const endMin = minutesOfDay(prefs.quietHoursEnd.getUTCHours(), prefs.quietHoursEnd.getUTCMinutes());
  if (startMin === endMin) return false; // zero-length window = not configured
  return startMin < endMin
    ? nowMin >= startMin && nowMin < endMin
    : nowMin >= startMin || nowMin < endMin; // wraps midnight, e.g. 22:00 -> 07:00
}

async function sendToUser(
  userId: string,
  notification: { title: string; body: string },
  data: Record<string, string> = {},
) {
  const fbApp = getApp();
  if (!fbApp) return;

  const prefs = await prisma.notificationPreferences.findUnique({
    where: { userId },
    select: { quietHoursStart: true, quietHoursEnd: true, quietHoursTimezone: true },
  });
  if (prefs && isWithinQuietHours(prefs)) return;

  const tokens = await prisma.pushTokens.findMany({
    where: { userId, active: true },
    select: { id: true, token: true },
  });
  if (!tokens.length) return;

  let response;
  try {
    response = await getMessaging(fbApp).sendEachForMulticast({
      tokens: tokens.map(t => t.token),
      notification,
      data,
    });
  } catch (err: any) {
    logger.warn("FCM send failed", { userId, error: err.message });
    return;
  }

  const deadIds = tokens
    .filter((_, i) => !response.responses[i].success && DEAD_TOKEN_CODES.has(response.responses[i].error?.code || ""))
    .map(t => t.id);
  if (deadIds.length) {
    await prisma.pushTokens.updateMany({ where: { id: { in: deadIds } }, data: { active: false } }).catch(() => {});
  }
}

export = { isConfigured, sendToUser };

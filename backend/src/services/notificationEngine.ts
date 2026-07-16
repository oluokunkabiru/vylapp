// ════════════════════════════════════════════════════════════════════════════
//  NOTIFICATION ENGINE — ported from vylapp-organic-api.jsx
//  Priority ranking, batching, digest generation, delivery scheduling
// ════════════════════════════════════════════════════════════════════════════
const TYPE_WEIGHTS: Record<string, number> = {
  space_invite: 8, space_live: 10, space_reminder: 6,
  reply: 7, mention: 8, dm: 9, group_message: 6,
  like: 5, repost: 4, follow: 4, connection_request: 5,
  creator_tip: 10, creator_sub: 9, creator_milestone: 6,
  pro_renewal: 5, pro_trial: 5,
  autopilot_posted: 3, autopilot_cycle_done: 3,
  content_moderation: 9, badge_earned: 5, system: 4,
};

const NotificationEngine = {
  TYPE_WEIGHTS,

  rankNotifications(raw: any[], userPrefs: any = {}) {
    return raw
      .map(n => ({ ...n, priority_score: this._priorityScore(n, userPrefs), should_push: this._shouldPush(n, userPrefs) }))
      .sort((a, b) => b.priority_score - a.priority_score);
  },

  batchNotifications(notifications: any[]) {
    const groups: Record<string, any[]> = {};
    for (const n of notifications) {
      const k = n.batch_key || n.type;
      if (!groups[k]) groups[k] = [];
      groups[k].push(n);
    }
    return Object.entries(groups).map(([key, items]) => ({
      batch_key: key, count: items.length, summary: this._batchSummary(items), items: items.slice(0, 3),
    }));
  },

  generateDigest(userActivity: any, period = "weekly") {
    return {
      period,
      generated_at: new Date().toISOString(),
      stats: {
        new_followers: userActivity.new_followers || 0,
        vibe_impressions: userActivity.impressions || 0,
        top_vibe_likes: userActivity.top_likes || 0,
        spaces_attended: userActivity.spaces || 0,
        earnings_usd: userActivity.earnings || 0,
      },
      call_to_action: this._digestCTA(userActivity),
    };
  },

  optimalDeliveryWindow(userTimezone = "UTC", engagementHistory: { ts: string | Date }[] = []) {
    if (!engagementHistory.length) return { recommended_hours: [8, 12, 18, 20], timezone: userTimezone, confidence: "low" };
    const hourCounts = new Array(24).fill(0);
    engagementHistory.forEach(e => hourCounts[new Date(e.ts).getHours()]++);
    const topHours = hourCounts.map((c, h) => ({ h, c })).sort((a, b) => b.c - a.c).slice(0, 4).map(x => x.h);
    return { recommended_hours: topHours.sort((a, b) => a - b), timezone: userTimezone, confidence: "high" };
  },

  // ── Build the title/body text for a notification type ─────────────────
  formatBody(type: string, actorName: string | null | undefined, extra: Record<string, any> = {}): string {
    const map: Record<string, string> = {
      like: `${actorName} liked your vibe`,
      repost: `${actorName} reposted your vibe`,
      reply: `${actorName} replied to your vibe`,
      mention: `${actorName} mentioned you`,
      follow: `${actorName} started connecting with you`,
      connection_request: `${actorName} sent you a connection request`,
      space_invite: `${actorName} invited you to a Space${extra.title ? `: ${extra.title}` : ""}`,
      space_live: `${actorName} just went live${extra.title ? `: ${extra.title}` : ""}`,
      space_reminder: `${extra.title || "A Space you saved"} starts soon`,
      dm: `${actorName} sent you a message`,
      group_message: `${actorName} sent a message in ${extra.groupName || "a group"}`,
      creator_tip: `${actorName} sent you a Super Vibe${extra.amount ? ` ($${extra.amount})` : ""}`,
      creator_sub: `${actorName} subscribed to you`,
      creator_milestone: extra.milestone || "You hit a creator milestone!",
      pro_renewal: "Your Vylapp Pro subscription renewed",
      pro_trial: "Your Vylapp Pro trial is ending soon",
      autopilot_posted: `Autopilot posted ${extra.count || 1} new vibe(s)`,
      autopilot_cycle_done: "Autopilot finished its run",
      content_moderation: extra.body || "One of your posts was reviewed",
      badge_earned: `You earned the ${extra.badge || "a new"} badge`,
      system: extra.body || "Vylapp update",
    };
    return map[type] || "You have a new notification";
  },

  _priorityScore(n: any, prefs: any): number {
    const base = TYPE_WEIGHTS[n.type] ?? 3;
    const muteBonus = prefs.muted_types?.includes(n.type) ? -20 : 0;
    const socialBonus = n.from_followed ? 3 : 0;
    return base + muteBonus + socialBonus;
  },
  _shouldPush(n: any, prefs: any): boolean {
    return this._priorityScore(n, prefs) >= 7 && !prefs.quiet_mode;
  },
  _batchSummary(items: any[]): string {
    if (items.length === 1) return items[0].body;
    return `${items.length} new updates`;
  },
  _digestCTA(activity: any): string {
    if ((activity.earnings || 0) > 0) return "Your earnings are growing! Check your creator dashboard.";
    if ((activity.new_followers || 0) > 10) return "Your audience is growing fast. Time to host a Space!";
    return "You have fresh content waiting in your communities.";
  },
};

export = NotificationEngine;

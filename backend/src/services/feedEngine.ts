// ════════════════════════════════════════════════════════════════════════════
//  FEED ENGINE — ported from vylapp-organic-api.jsx
//  Cold-start algorithm, interest signals, dwell time weighting, diversity
// ════════════════════════════════════════════════════════════════════════════
const FeedEngine = {
  scoreVibe(vibe: any, userProfile: any, config: Record<string, number> = {}) {
    const w = {
      interest: config.interestWeight ?? 0.35,
      engagement: config.engagementWeight ?? 0.25,
      recency: config.recencyWeight ?? 0.20,
      socialGraph: config.socialGraphWeight ?? 0.12,
      diversity: config.diversityWeight ?? 0.08,
    };
    const interestScore = this._interestScore(vibe, userProfile);
    const engageScore = this._engagementScore(vibe);
    const recencyScore = this._recencyScore(vibe.created_at);
    const socialScore = this._socialGraphScore(vibe, userProfile);
    const diversityScore = this._diversityScore(vibe, userProfile);

    const rawScore =
      w.interest * interestScore +
      w.engagement * engageScore +
      w.recency * recencyScore +
      w.socialGraph * socialScore +
      w.diversity * diversityScore;

    let boost = 1.0;
    if (vibe.is_live) boost *= 1.8;
    if (vibe.is_trending) boost *= 1.4;
    if (vibe.is_featured) boost *= 1.2;
    if (vibe.author_verified) boost *= 1.1;
    if (vibe.is_paid_content && !userProfile.is_pro) boost *= 0.7;

    return { score: rawScore * boost, components: { interestScore, engageScore, recencyScore, socialScore, diversityScore }, boost };
  },

  rankFeed(vibes: any[], userProfile: any, options: { page?: number; pageSize?: number } = {}) {
    const { page = 0, pageSize = 20 } = options;
    const scored = vibes.map(v => ({ ...v, _rank: this.scoreVibe(v, userProfile) }));
    scored.sort((a, b) => b._rank.score - a._rank.score);
    return scored.slice(page * pageSize, (page + 1) * pageSize);
  },

  processEvent(event: { type: string; dwell_ms?: number; explicit?: boolean }) {
    const weights: Record<string, number> = {
      like: 5, repost: 8, comment: 6, reply: 7, share: 9, save: 10,
      click: 2, dwell_3s: 1, dwell_10s: 2, dwell_30s: 4, scroll_50: 1, scroll_100: 2,
    };
    const score = weights[event.type] ?? 1;
    const dwellBonus = (event.dwell_ms || 0) > 30000 ? 3 : (event.dwell_ms || 0) > 10000 ? 1 : 0;
    return { signal_weight: score + dwellBonus, update_interest_vector: event.explicit || score >= 5 };
  },

  _interestScore(vibe: any, user: any): number {
    if (!user.interests?.length) return 0.3;
    const overlap = (vibe.tags || []).filter((t: string) => user.interests.includes(t.replace(/^#/, "").toLowerCase())).length;
    return Math.min(1, overlap / 3);
  },
  _engagementScore(vibe: any): number {
    const total = (vibe.likes_count || 0) + (vibe.replies_count || 0) * 2 + (vibe.reposts_count || 0) * 3;
    return Math.min(1, total / 500);
  },
  _recencyScore(createdAt: string | Date | undefined): number {
    const ageHours = (Date.now() - new Date(createdAt || Date.now()).getTime()) / 3600000;
    return Math.max(0, 1 - ageHours / 72);
  },
  _socialGraphScore(vibe: any, user: any): number {
    return user.followingIds?.includes(vibe.user_id) ? 1 : 0.2;
  },
  _diversityScore(vibe: any, user: any): number {
    return user.recentAuthorIds?.includes(vibe.user_id) ? 0.2 : 1;
  },
};

export = FeedEngine;

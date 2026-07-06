const TIERS = {
  new_user:    { label: "New User",    min_points: 0,    badge: "🌱", perks: [] },
  contributor: { label: "Contributor", min_points: 100,  badge: "⚡", perks: ["priority_support"] },
  raven:       { label: "Raven",       min_points: 500,  badge: "🪶", perks: ["raven_badge", "private_spaces", "founder_amas"] },
  verified:    { label: "Verified",    min_points: 2000, badge: "✦",  perks: ["all_raven_perks", "verified_checkmark", "revenue_share_boost"] },
};

const POINT_MAP = {
  vibe_posted: 5, space_joined: 3, space_hosted: 20,
  comment_left: 2, super_vibe_sent: 10, referral_signup: 50,
  referral_pro_convert: 200, pro_subscribed: 100,
  daily_streak_7: 25, daily_streak_30: 100,
  first_vibe: 10, first_follow: 5,
};

const RavenEngine = {
  TIERS, POINT_MAP,

  // FIX LP-021: ordered threshold checks with >= — no sort-dependent find()
  // Boundary behaviour: exactly 500 points → raven. Exactly 2000 → verified.
  getTier(points) {
    let key, tier;
    if      (points >= 2000) { key = "verified";    tier = TIERS.verified;    }
    else if (points >= 500)  { key = "raven";       tier = TIERS.raven;       }
    else if (points >= 100)  { key = "contributor"; tier = TIERS.contributor; }
    else                     { key = "new_user";    tier = TIERS.new_user;    }
    return { key, ...tier, points, points_to_next: this._pointsToNext(points) };
  },

  pointsFor(action, multiplier = 1) {
    return Math.round((POINT_MAP[action] ?? 1) * multiplier);
  },

  processReferral(converted = false) {
    const points = converted ? POINT_MAP.referral_pro_convert : POINT_MAP.referral_signup;
    return { event: converted ? "pro_conversion" : "signup", points_awarded: points, unlock: converted ? "Pro free month" : null };
  },

  _pointsToNext(p) {
    if (p < 100)  return 100  - p;
    if (p < 500)  return 500  - p;
    if (p < 2000) return 2000 - p;
    return 0; // verified — no next tier
  },
};

module.exports = RavenEngine;

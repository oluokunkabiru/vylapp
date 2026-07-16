// ════════════════════════════════════════════════════════════════════════════
//  TRENDING ENGINE — ported from vylapp-organic-api.jsx
//  Momentum scoring, velocity tracking, regional trending, decay
// ════════════════════════════════════════════════════════════════════════════
const TrendingEngine = {
  scoreTrend(tag: any) {
    const velocity = this._velocityScore(tag.recent_count, tag.prev_count);
    const volume = Math.min(1, Math.log10((tag.total_count || 0) + 1) / 5);
    const recency = Math.max(0, 1 - (Date.now() - new Date(tag.last_vibe_at || Date.now()).getTime()) / 86400000);
    const regional = (tag.regions?.length || 0) > 2 ? 1.2 : 1.0;
    const heat = Math.round((velocity * 0.45 + volume * 0.3 + recency * 0.25) * 100 * regional);
    const momentum = heat > 85 ? "viral" : heat > 70 ? "peak" : heat > 50 ? "rising" : heat > 30 ? "emerging" : "declining";
    return { tag: tag.tag, heat: Math.min(99, heat), momentum, velocity: parseFloat(velocity.toFixed(3)), volume: parseFloat(volume.toFixed(3)), recency: parseFloat(recency.toFixed(3)) };
  },

  getTrending(tags: any[], region = "Global", category: string | null = null, limit = 10) {
    let filtered = category ? tags.filter(t => t.category === category) : tags;
    if (region !== "Global") filtered = filtered.filter(t => !t.regions || t.regions.includes(region));
    return filtered.map(t => ({ ...t, ...this.scoreTrend(t) })).sort((a, b) => b.heat - a.heat).slice(0, limit);
  },

  applyDecay(tags: any[], decayRatePerHour = 0.02) {
    return tags.map(t => {
      const ageHours = (Date.now() - new Date(t.last_vibe_at || Date.now()).getTime()) / 3600000;
      const decayed = Math.max(0, t.score * Math.pow(1 - decayRatePerHour, ageHours));
      return { ...t, score: parseFloat(decayed.toFixed(2)) };
    });
  },

  detectBreakout(tags: any[]) {
    return tags.map(t => ({ ...t, ...this.scoreTrend(t) }))
      .filter(t => t.velocity > 0.6 && t.momentum !== "declining")
      .map(t => ({ ...t, alert: "BREAKOUT" }));
  },

  _velocityScore(recent = 0, prev = 1): number {
    if (prev === 0) return recent > 0 ? 1 : 0;
    return Math.min(1, (recent - prev) / prev);
  },
};

export = TrendingEngine;

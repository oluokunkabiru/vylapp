// ════════════════════════════════════════════════════════════════════════════
//  SEARCH ENGINE — ported from vylapp-organic-api.jsx
//  Used to RANK rows that Postgres already filtered with ILIKE/trigram —
//  Postgres does the heavy lifting (pg_trgm), this adds field-weighted
//  relevance scoring and fuzzy handle matching on top.
// ════════════════════════════════════════════════════════════════════════════
const SearchEngine = {
  rank(query, items, fieldWeights) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .map(item => ({ ...item, _score: this._score(item, tokens, fieldWeights) }))
      .filter(r => r._score > 0)
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...r }) => ({ ...r, relevance: parseFloat(_score.toFixed(3)) }));
  },

  _score(item, tokens, fieldWeights) {
    let score = 0;
    for (const [field, weight] of Object.entries(fieldWeights)) {
      const v = item[field];
      if (!v) continue;
      const text = String(v).toLowerCase();
      for (const t of tokens) {
        if (text.includes(t)) score += weight;
        if (text.startsWith(t)) score += weight * 0.5;
      }
    }
    if (item.verified) score *= 1.2;
    if (item.connections_count > 1000) score *= 1.1;
    return score;
  },

  levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
  },

  fuzzyHandle(query, users) {
    const q = query.toLowerCase().replace(/^@/, "");
    return users
      .map(u => ({ ...u, _dist: this.levenshtein(q, u.handle.toLowerCase()) }))
      .sort((a, b) => a._dist - b._dist)
      .map(({ _dist, ...u }) => ({ ...u, similarity: Math.max(0, 1 - _dist / Math.max(q.length, u.handle.length)) }));
  },
};

module.exports = SearchEngine;

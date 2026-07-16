// ════════════════════════════════════════════════════════════════════════════
//  ANALYTICS ENGINE — ported from vylapp-organic-api.jsx
//  DAU/MAU, retention cohorts, LTV, funnel analysis, creator dashboards
// ════════════════════════════════════════════════════════════════════════════
const AnalyticsEngine = {
  stickinessRatio(dau: number, mau: number) {
    const ratio = mau > 0 ? parseFloat((dau / mau).toFixed(3)) : 0;
    return {
      dau, mau, ratio, pct: (ratio * 100).toFixed(1) + "%",
      grade: ratio >= 0.3 ? "A" : ratio >= 0.2 ? "B" : ratio >= 0.1 ? "C" : "D",
      target: "30%+", on_track: ratio >= 0.3,
    };
  },

  retentionCohort(cohort: { cohort_size: number; week: number[] }) {
    return {
      cohort_size: cohort.cohort_size,
      day1: this._retRate(cohort.week[0], cohort.cohort_size),
      day7: this._retRate(cohort.week[1], cohort.cohort_size),
      day30: this._retRate(cohort.week[2], cohort.cohort_size),
      day90: this._retRate(cohort.week[3], cohort.cohort_size),
      target: { day1: "60%", day7: "40%", day30: "20%", day90: "10%" },
    };
  },

  calculateLTV(arpu: number, churnRate: number, grossMargin = 0.72) {
    const avgLifetimeMonths = churnRate > 0 ? 1 / churnRate : 60;
    const ltv = parseFloat((arpu * avgLifetimeMonths * grossMargin).toFixed(2));
    return { arpu, churn_rate: churnRate, avg_lifetime_months: parseFloat(avgLifetimeMonths.toFixed(1)), gross_margin: grossMargin, ltv };
  },

  analyzeFunnel(steps: { name: string; count: number }[]) {
    return steps.map((s, i) => ({
      step: s.name, count: s.count,
      rate_from_top: i === 0 ? 1 : parseFloat((s.count / steps[0].count).toFixed(3)),
      dropoff_from_prev: i === 0 ? 0 : parseFloat((1 - s.count / steps[i - 1].count).toFixed(3)),
    }));
  },

  creatorSnapshot(data: any) {
    const engRate = data.impressions > 0 ? parseFloat((data.engagements / data.impressions).toFixed(4)) : 0;
    return {
      ...data, engagement_rate: engRate,
      engagement_grade: engRate >= 0.05 ? "Excellent" : engRate >= 0.02 ? "Good" : "Needs Work",
      growth_rate: data.prev_followers > 0 ? parseFloat(((data.followers - data.prev_followers) / data.prev_followers).toFixed(4)) : 0,
      est_monthly_earnings: parseFloat(((data.subscribers || 0) * (data.sub_price || 0) * 0.80).toFixed(2)),
    };
  },

  _retRate: (n: number, total: number): string => total > 0 ? (n / total * 100).toFixed(1) + "%" : "0%",
};

export = AnalyticsEngine;

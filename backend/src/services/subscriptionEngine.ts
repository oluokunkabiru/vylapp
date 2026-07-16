// ════════════════════════════════════════════════════════════════════════════
//  SUBSCRIPTION ENGINE — ported from vylapp-organic-api.jsx (Vylapp Pro)
//  Plan tiers, feature gates, churn prediction
// ════════════════════════════════════════════════════════════════════════════
const PLANS: Record<string, { name: string; price: number; features: Record<string, number | boolean> }> = {
  free: { name: "Free", price: 0, features: { translation_langs: 1, space_duration_min: 60, analytics: false, badge: false, ad_free: false, pro_badge: false } },
  pro_monthly: { name: "Pro Monthly", price: 9, features: { translation_langs: 5, space_duration_min: 999, analytics: true, badge: true, ad_free: true, pro_badge: true } },
  pro_annual: { name: "Pro Annual", price: 84, features: { translation_langs: 5, space_duration_min: 999, analytics: true, badge: true, ad_free: true, pro_badge: true } },
  creator: { name: "Creator", price: 0, features: { translation_langs: 5, space_duration_min: 999, analytics: true, badge: true, ad_free: true, pro_badge: true, creator_tools: true } },
  business: { name: "Business", price: 49, features: { seats: 25, custom_branding: true, admin_dashboard: true, analytics: true } },
};

const SubscriptionEngine = {
  PLANS,

  hasFeature(userPlan: string, featureKey: string): boolean {
    const plan = PLANS[userPlan];
    return !!plan?.features[featureKey];
  },

  planDetails(planId: string) {
    return PLANS[planId] || null;
  },

  billingPeriodEnd(planId: string, billingPeriod: string): Date {
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + (billingPeriod === "annual" || planId.includes("annual") ? 365 : 30));
    return next;
  },

  churnScore(subscriber: any) {
    let risk = 30;
    const lastLogin = (Date.now() - new Date(subscriber.last_login || Date.now()).getTime()) / 86400000;
    if (lastLogin > 14) risk += 25;
    if (lastLogin > 30) risk += 20;
    if ((subscriber.sessions_last_30d || 1) < 3) risk += 20;
    if (subscriber.support_tickets > 2) risk += 10;
    // FIX LP-017: Payment failure raises score but ALSO sets a separate urgent_action
    // flag that is visible at any churn score level. Prevents masking by the 100 ceiling.
    if (subscriber.payment_failed) risk += 30;
    risk = Math.min(100, risk);
    const urgent_action = subscriber.payment_failed ? "payment_recovery" : null;
    return {
      risk_score: risk,
      risk_level: risk >= 70 ? "high" : risk >= 40 ? "medium" : "low",
      recommended_action: risk >= 70 ? "personal_outreach" : risk >= 40 ? "retention_email" : "none",
      urgent_action, // payment_recovery fires regardless of overall churn score
      flags: { payment_failed: !!subscriber.payment_failed },
    };
  },

  usageSummary(planId: string, usage: Record<string, number> = {}) {
    const plan = PLANS[planId] || PLANS.free;
    return Object.entries(plan.features).map(([key, limit]) => {
      const used = usage[key] ?? 0;
      const pct = typeof limit === "number" && limit > 0 ? used / limit : 0;
      return { feature: key, limit, used, pct: parseFloat(pct.toFixed(2)), near_limit: pct > 0.8 };
    });
  },
};

export = SubscriptionEngine;

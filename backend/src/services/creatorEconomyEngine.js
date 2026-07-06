// ════════════════════════════════════════════════════════════════════════════
//  CREATOR ECONOMY ENGINE — ported from vylapp-organic-api.jsx
//  Super Vibes, subscriptions, payout splits, tax metadata.
//
//  NOTE ON PAYMENTS: take-rate math, ledger entries, and payout eligibility
//  are fully organic (computed in-house). Actually *moving money* requires
//  a regulated payment processor (Stripe Connect, etc.) — that's a real
//  external dependency no platform can avoid, and the schema already has
//  stripe_* columns reserved for it. This engine computes the numbers and
//  writes the ledger; wiring a live processor is a deliberate later step.
// ════════════════════════════════════════════════════════════════════════════
const TAKE_RATES = {
  founding_cohort: 0.15,
  standard: 0.20,
  spaces_ticket: 0.15,
  super_vibe: 0.20,
  paid_dm: 0.20,
  digital_product: 0.15,
};

const CreatorEconomyEngine = {
  TAKE_RATES,

  splitSuperVibe(amount, creatorTier = "standard") {
    const rate = creatorTier === "founding" ? TAKE_RATES.founding_cohort : TAKE_RATES.super_vibe;
    const platform_cut = parseFloat((amount * rate).toFixed(2));
    const creator_net = parseFloat((amount - platform_cut).toFixed(2));
    return { gross: amount, platform_cut, creator_net, rate };
  },

  splitSubscription(monthlyAmount) {
    const platform_cut = parseFloat((monthlyAmount * TAKE_RATES.standard).toFixed(2));
    const creator_net = parseFloat((monthlyAmount - platform_cut).toFixed(2));
    return { gross: monthlyAmount, platform_cut, creator_net, annual_est: parseFloat((creator_net * 12).toFixed(2)) };
  },

  splitSpaceTicket(price) {
    const platform_cut = parseFloat((price * TAKE_RATES.spaces_ticket).toFixed(2));
    const creator_net = parseFloat((price - platform_cut).toFixed(2));
    return { gross: price, platform_cut, creator_net };
  },

  splitDigitalProduct(price) {
    const platform_cut = parseFloat((price * TAKE_RATES.digital_product).toFixed(2));
    const creator_net = parseFloat((price - platform_cut).toFixed(2));
    return { gross: price, platform_cut, creator_net };
  },

  calculatePayout(ledgerEntries, minThreshold = 10) {
    const total = ledgerEntries.reduce((sum, e) => sum + parseFloat(e.net_usd), 0);
    const rounded = parseFloat(total.toFixed(2));
    const fee = rounded > 100 ? 0 : 0.25;
    return {
      gross_period: rounded,
      eligible: rounded >= minThreshold,
      hold_reason: rounded < minThreshold ? `Below $${minThreshold} minimum` : null,
      fee_usd: fee,
      net_payout: parseFloat((rounded - fee).toFixed(2)),
      entry_count: ledgerEntries.length,
    };
  },

  generateTaxMetadata(creator) {
    const annual_est = (creator.monthly_avg_earnings || 0) * 12;
    return {
      requires_1099: annual_est >= 600 && creator.country === "US",
      w9_required: annual_est >= 600 && creator.country === "US" && !creator.w9_on_file,
      vat_applicable: creator.country !== "US" && annual_est > 0,
      tax_year: new Date().getFullYear(),
      estimated_annual_earnings: parseFloat(annual_est.toFixed(2)),
    };
  },
};

module.exports = CreatorEconomyEngine;

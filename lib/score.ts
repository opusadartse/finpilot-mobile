import type { CardRow, LoanPromotionRow } from "./db";

export type ScoreScenario =
  | "base"
  | "open_new_card"
  | "pay_down"
  | "util_up"
  | "util_down"
  | "missed_payment";

export type ScoreFactors = {
  utilization: { impact: number; summary: string };
  paymentHistory: { impact: number; summary: string };
  accountAge: { impact: number; summary: string };
  loans: { impact: number; summary: string };
  availableCredit: { impact: number; summary: string };
};

export type DynamicScoreResult = {
  baseScore: number | null;
  factors: ScoreFactors;
  factorTotal: number;
  additionalAdjustment: number;
  totalAdjustment: number;
  currentScore: number | null;
  /** Revolving utilization (card balances / card limits). */
  utilization: number;
};

export type DynamicScoreOptions = {
  additionalAdjustment?: number;
};

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export type RiskBand = "low" | "moderate" | "high" | "very_high";

export function calculateRisk(
  utilization: number,
  yearsOld: number,
  creditLimit: number,
  apr: number,
  profile: RiskProfile = "balanced"
) {
  const safeUtil = Number.isFinite(utilization) ? utilization : 0;
  const safeYears = Number.isFinite(yearsOld) ? yearsOld : 0;
  const safeLimit = Number.isFinite(creditLimit) ? creditLimit : 0;
  const safeApr = Number.isFinite(apr) ? apr : 0;

  const u = Math.max(0, Math.min(100, safeUtil));
  const y = Math.max(0, safeYears);
  const l = Math.max(0, safeLimit);
  const a = Math.max(0, Math.min(100, safeApr));

  let risk = u;

  const presets = {
    conservative: { newAcc: 1.7, midAcc: 1.3, oldAcc: 0.85, aprDiv: 160, lowLimit: 1.2, highLimit: 0.92 },
    balanced: { newAcc: 1.5, midAcc: 1.2, oldAcc: 0.8, aprDiv: 200, lowLimit: 1.15, highLimit: 0.9 },
    aggressive: { newAcc: 1.35, midAcc: 1.1, oldAcc: 0.75, aprDiv: 260, lowLimit: 1.1, highLimit: 0.88 },
  } as const;

  const p = presets[profile] ?? presets.balanced;

  if (y < 1) risk *= p.newAcc;
  else if (y < 3) risk *= p.midAcc;
  else if (y > 5) risk *= p.oldAcc;

  risk *= 1 + a / p.aprDiv;

  if (l < 1000) risk *= p.lowLimit;
  else if (l > 10000) risk *= p.highLimit;

  return Math.round(risk);
}

export function getRiskBand(risk: number): RiskBand {
  if (risk < 25) return "low";
  if (risk < 50) return "moderate";
  if (risk < 75) return "high";
  return "very_high";
}

export function getRiskColor(risk: number) {
  const band = getRiskBand(risk);
  if (band === "low") return "#16A34A";
  if (band === "moderate") return "#2563EB";
  if (band === "high") return "#F59E0B";
  return "#DC2626";
}

function clampScore(n: number) {
  return Math.max(300, Math.min(850, Math.round(n)));
}

function cardUtilization(cards: CardRow[]) {
  const debt = cards.reduce((s, c) => s + c.current_balance, 0);
  const credit = cards.reduce((s, c) => s + c.credit_limit, 0);
  const util = credit > 0 ? debt / credit : 0;
  return { debt, credit, util };
}

function avgAgeMonths(cards: CardRow[]) {
  if (cards.length === 0) return 48;
  const sum = cards.reduce((s, c) => {
    const ageMonths = Math.max(
      0,
      (Date.now() - new Date(c.opening_date).getTime()) / (1000 * 60 * 60 * 24 * 30.4)
    );
    return s + ageMonths;
  }, 0);
  return sum / cards.length;
}

function newestAccountMonths(cards: CardRow[]) {
  if (cards.length === 0) return 999;
  return Math.min(
    ...cards.map((c) =>
      Math.max(0, (Date.now() - new Date(c.opening_date).getTime()) / (1000 * 60 * 60 * 24 * 30.4))
    )
  );
}

function buildPaymentFactor(
  cards: CardRow[],
  loans: LoanPromotionRow[],
  cardPayments: { paid_at: string }[],
  loanPayments: { paid_at: string }[]
) {
  const now = Date.now();
  const ms45 = 45 * 86400000;
  const ms90 = 90 * 86400000;

  let recentCard = 0;
  for (const p of cardPayments) {
    if (now - new Date(p.paid_at).getTime() <= ms45) recentCard++;
  }
  let recentLoan = 0;
  for (const p of loanPayments) {
    if (now - new Date(p.paid_at).getTime() <= ms45) recentLoan++;
  }

  let impact = Math.min(10, recentCard * 2) + Math.min(5, recentLoan * 1);

  const debt =
    cards.reduce((s, c) => s + c.current_balance, 0) + loans.reduce((s, l) => s + l.current_balance, 0);

  const lastPaidTimes = [
    ...cardPayments.map((p) => new Date(p.paid_at).getTime()),
    ...loanPayments.map((p) => new Date(p.paid_at).getTime()),
  ];
  const lastPaid = lastPaidTimes.length ? Math.max(...lastPaidTimes) : 0;

  if (debt > 75 && lastPaid && now - lastPaid > ms90) {
    impact -= 28;
  }

  let summary = "Stable payment cadence.";
  if (impact >= 8) summary = "Recent on-time payments support score momentum.";
  else if (impact <= -15) summary = "Thin recent payment activity vs balances.";
  else if (recentCard + recentLoan > 0) summary = "Record of payments in the last 45 days.";

  return { impact, summary };
}

function buildUtilizationFactor(cards: CardRow[], util: number) {
  const credit = cards.reduce((s, c) => s + c.credit_limit, 0);
  if (cards.length === 0 || credit <= 0) {
    return { impact: 0, summary: "No revolving limits on file — utilization neutral." };
  }

  let impact = 0;
  let summary = "Utilization in a neutral range.";

  if (util < 0.1) {
    impact = 8;
    summary = "Under 10% utilization — strong for scoring.";
  } else if (util < 0.3) {
    impact = 4;
    summary = "Healthy revolving usage.";
  } else if (util < 0.5) {
    impact = 0;
    summary = "Moderate utilization.";
  } else if (util < 0.7) {
    impact = -12;
    summary = "Elevated utilization tends to weigh on scores.";
  } else {
    impact = -20;
    summary = "High utilization (70%+) is typically negative.";
  }

  const maxed = cards.some(
    (c) => c.credit_limit > 0 && c.current_balance / c.credit_limit >= 0.98
  );
  if (maxed) {
    impact -= 10;
    summary += " Maxed-out lines add risk.";
  }

  return { impact, summary };
}

function buildAccountAgeFactor(cards: CardRow[]) {
  if (cards.length === 0) {
    return { impact: 0, summary: "No card accounts — age factor neutral." };
  }

  const avg = avgAgeMonths(cards);
  const newest = newestAccountMonths(cards);

  let impact = 0;
  let summary = "Established account age helps stability.";

  if (avg < 12) {
    impact -= 15;
    summary = "Young average age of accounts.";
  } else if (avg < 24) {
    impact -= 8;
    summary = "Below-average account age.";
  } else if (avg < 48) {
    impact -= 3;
    summary = "Average profile age.";
  } else {
    impact += 5;
    summary = "Long-standing accounts support scoring.";
  }

  if (newest < 7) {
    impact -= Math.min(12, 4 + Math.floor((7 - newest) / 1.5));
    summary += " Very new trade lines create short-term drag.";
  }

  return { impact, summary };
}

function buildLoansFactor(loans: LoanPromotionRow[]) {
  let impact = 0;
  const active = loans.filter((l) => l.current_balance > 0);

  for (const loan of active) {
    const tier = Math.min(15, 5 + Math.floor(loan.current_balance / 3000));
    impact -= tier;
  }

  impact = Math.max(-42, impact);

  if (active.length >= 3) {
    impact -= 6;
  }

  let summary =
    active.length === 0
      ? "No active promo balances — neutral loan factor."
      : `${active.length} active promotion balance(s); carrying balances adds exposure.`;

  return { impact, summary };
}

function buildAvailableCreditFactor(cards: CardRow[], credit: number, cardDebt: number) {
  if (credit <= 0) {
    return { impact: 0, summary: "No revolving limits on file." };
  }
  const availRatio = (credit - cardDebt) / credit;

  let impact = 0;
  let summary = "Reasonable unused revolving capacity.";

  if (availRatio >= 0.72) {
    impact = 7;
    summary = "Strong unused credit vs limits.";
  } else if (availRatio >= 0.45) {
    impact = 3;
    summary = "Comfortable headroom on limits.";
  } else if (availRatio < 0.12 && cardDebt > 200) {
    impact = -10;
    summary = "Little available credit vs limits.";
  }

  return { impact, summary };
}

/**
 * Current score = base user score (manual) + dynamic adjustments from activity.
 * When base is unset, returns factors but `currentScore` is null.
 */
export function computeDynamicScore(
  baseScore: number | null,
  cards: CardRow[],
  loans: LoanPromotionRow[],
  cardPayments: { paid_at: string }[],
  loanPayments: { paid_at: string }[],
  options?: DynamicScoreOptions
): DynamicScoreResult {
  const { debt: cardDebt, credit, util } = cardUtilization(cards);

  const utilization = buildUtilizationFactor(cards, util);
  const paymentHistory = buildPaymentFactor(cards, loans, cardPayments, loanPayments);
  const accountAge = buildAccountAgeFactor(cards);
  const loanImpact = buildLoansFactor(loans);
  const availableCredit = buildAvailableCreditFactor(cards, credit, cardDebt);

  const factors: ScoreFactors = {
    utilization,
    paymentHistory,
    accountAge,
    loans: loanImpact,
    availableCredit,
  };

  const factorTotal =
    utilization.impact +
    paymentHistory.impact +
    accountAge.impact +
    loanImpact.impact +
    availableCredit.impact;

  const additionalAdjustment = options?.additionalAdjustment ?? 0;
  const totalAdjustment = factorTotal + additionalAdjustment;

  const currentScore =
    baseScore !== null ? clampScore(baseScore + totalAdjustment) : null;

  return {
    baseScore,
    factors,
    factorTotal,
    additionalAdjustment,
    totalAdjustment,
    currentScore,
    utilization: util,
  };
}

function cloneCards(cards: CardRow[]) {
  return cards.map((c) => ({ ...c }));
}

function cloneLoans(loans: LoanPromotionRow[]) {
  return loans.map((l) => ({ ...l }));
}

function applyScenarioHypothesis(
  cards: CardRow[],
  loans: LoanPromotionRow[],
  scenario: ScoreScenario
): { cards: CardRow[]; loans: LoanPromotionRow[]; extraAdjustment: number } {
  const c = cloneCards(cards);
  const l = cloneLoans(loans);
  let extraAdjustment = 0;

  switch (scenario) {
    case "open_new_card": {
      c.push({
        id: -1,
        name: "New account (simulated)",
        credit_limit: 3000,
        current_balance: 0,
        apr: 19.99,
        min_payment: 25,
        due_date: new Date().toISOString(),
        opening_date: new Date().toISOString(),
        purchases_this_month: 0,
        purchases_month: "",
      });
      extraAdjustment -= 6;
      break;
    }
    case "pay_down": {
      c.forEach((card) => {
        card.current_balance = Math.max(0, Math.round(card.current_balance * 0.84));
      });
      break;
    }
    case "util_up": {
      c.forEach((card) => {
        if (card.credit_limit <= 0) return;
        const cap = card.credit_limit * 0.99;
        card.current_balance = Math.min(cap, card.current_balance * 1.24);
      });
      break;
    }
    case "util_down": {
      c.forEach((card) => {
        card.current_balance *= 0.76;
      });
      break;
    }
    case "missed_payment": {
      extraAdjustment -= 58;
      break;
    }
    default:
      break;
  }

  return { cards: c, loans: l, extraAdjustment };
}

export function scenarioReason(scenario: ScoreScenario): string {
  switch (scenario) {
    case "base":
      return "Stable profile.";
    case "open_new_card":
      return "New inquiry and younger average age can dip score short-term; higher limits may lower utilization.";
    case "pay_down":
      return "Paying balances down improves utilization and usually supports score.";
    case "util_up":
      return "Higher utilization is often negative for score.";
    case "util_down":
      return "Reducing utilization can improve score health.";
    case "missed_payment":
      return "Missed payments can strongly hurt score.";
    default:
      return "Stable profile.";
  }
}

export function projectScenarioScore(
  baseScore: number | null,
  cards: CardRow[],
  loans: LoanPromotionRow[],
  cardPayments: { paid_at: string }[],
  loanPayments: { paid_at: string }[],
  scenario: ScoreScenario
): { baseline: DynamicScoreResult; projected: DynamicScoreResult; diff: number; reason: string } {
  const baseline = computeDynamicScore(baseScore, cards, loans, cardPayments, loanPayments);
  if (scenario === "base") {
    return {
      baseline,
      projected: baseline,
      diff: 0,
      reason: scenarioReason("base"),
    };
  }

  const hypo = applyScenarioHypothesis(cards, loans, scenario);
  const projected = computeDynamicScore(
    baseScore,
    hypo.cards,
    hypo.loans,
    cardPayments,
    loanPayments,
    { additionalAdjustment: hypo.extraAdjustment }
  );

  const b = baseline.currentScore ?? 0;
  const p = projected.currentScore ?? 0;
  const diff = baseScore !== null ? p - b : 0;

  return {
    baseline,
    projected,
    diff,
    reason: scenarioReason(scenario),
  };
}

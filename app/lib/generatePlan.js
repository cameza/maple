import OpenAI from "openai";
import { buildPlanPrompt } from "./planPromptTemplate";
import { getKnowledgeBase } from "./knowledgeBase";

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function monthLabelFromNow(months) {
  const safeMonths = Math.max(0, Math.ceil(asNumber(months, 0)));
  const date = new Date();
  date.setMonth(date.getMonth() + safeMonths);
  return date.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}

function normalizeDebt(debt, index) {
  return {
    name: debt?.name || `Debt ${index + 1}`,
    balance: Math.max(0, asNumber(debt?.balance)),
    apr: Math.max(0, asNumber(debt?.apr ?? debt?.interestRate)),
    minPayment: Math.max(0, asNumber(debt?.minPayment ?? debt?.minimumPayment)),
  };
}

export function normalizeProfileFromIntake(intakeData = {}) {
  const expenses = intakeData?.expenses || {};
  const accounts = intakeData?.accounts || {};
  const debts = Array.isArray(intakeData?.debts) ? intakeData.debts.map(normalizeDebt) : [];

  return {
    goal: intakeData?.profile?.goal || "Build a stable financial plan",
    age: Math.max(18, asNumber(intakeData?.profile?.age, 30)),
    province: intakeData?.profile?.province || "Ontario",
    isFirstTimeBuyer: Boolean(intakeData?.profile?.firstTimeBuyer),
    planType: intakeData?.profile?.planType || "individual",
    income: {
      monthly: Math.max(0, asNumber(intakeData?.monthlyIncome)),
      stability: intakeData?.incomeStability || "stable",
    },
    expenses: {
      housing: Math.max(0, asNumber(expenses?.housing)),
      transport: Math.max(0, asNumber(expenses?.transport)),
      utilities: Math.max(0, asNumber(expenses?.utilities)),
      groceries: Math.max(0, asNumber(expenses?.groceries)),
      otherFixed: Math.max(0, asNumber(expenses?.otherFixed)),
      discretionary: Math.max(0, asNumber(expenses?.discretionary)),
    },
    debts,
    accounts: {
      tfsa: {
        hasAccount: Boolean(accounts?.tfsa?.hasAccount),
        balance: Math.max(0, asNumber(accounts?.tfsa?.balance)),
        room: Math.max(0, asNumber(accounts?.tfsa?.roomAvailable ?? accounts?.tfsa?.room)),
      },
      rrsp: {
        hasAccount: Boolean(accounts?.rrsp?.hasAccount),
        balance: Math.max(0, asNumber(accounts?.rrsp?.balance)),
        room: Math.max(0, asNumber(accounts?.rrsp?.roomAvailable ?? accounts?.rrsp?.room)),
      },
      fhsa: {
        hasAccount: Boolean(accounts?.fhsa?.hasAccount),
        balance: Math.max(0, asNumber(accounts?.fhsa?.balance)),
        room: Math.max(0, asNumber(accounts?.fhsa?.roomAvailable ?? accounts?.fhsa?.room)),
      },
    },
    savings: {
      emergencyFund: Math.max(0, asNumber(intakeData?.emergencyFundAmount)),
      monthlySavings: Math.max(0, asNumber(intakeData?.currentMonthlySavings)),
    },
  };
}

export function computePlanMetrics(profile) {
  const monthlyEssentials =
    profile.expenses.housing
    + profile.expenses.transport
    + profile.expenses.utilities
    + profile.expenses.groceries
    + profile.expenses.otherFixed;

  const totalDebtMinimums = profile.debts.reduce((sum, debt) => sum + asNumber(debt.minPayment), 0);
  const monthlySurplus = profile.income.monthly - monthlyEssentials - totalDebtMinimums;
  const emergencyFundMonths = monthlyEssentials > 0
    ? profile.savings.emergencyFund / monthlyEssentials
    : 0;
  const emergencyFundTarget1Month = Math.round(monthlyEssentials);
  const emergencyFundTarget3Month = Math.round(monthlyEssentials * 3);
  const hasHighInterestDebt = profile.debts.some((d) => d.apr >= 8 && d.balance > 0);
  const fhsaEligible = profile.isFirstTimeBuyer && profile.accounts.fhsa.room > 0;

  const debtBalance = profile.debts.reduce((sum, debt) => sum + debt.balance, 0);
  const weightedApr = debtBalance > 0
    ? profile.debts.reduce((sum, debt) => sum + (debt.balance * debt.apr), 0) / debtBalance
    : 0;

  const debtMonthlyRate = weightedApr > 0 ? weightedApr / 12 / 100 : 0;
  const debtMonthlyPaymentCapacity = Math.max(0, Math.round(Math.max(profile.savings.monthlySavings, monthlySurplus * 0.35) + totalDebtMinimums));
  const payoffMonths = debtBalance > 0
    ? (debtMonthlyPaymentCapacity > 0
      ? Math.max(1, Math.ceil(debtBalance / Math.max(debtMonthlyPaymentCapacity - (debtBalance * debtMonthlyRate), 1)))
      : 120)
    : 0;

  const annualTfsaRoom = profile.accounts.tfsa.room;
  const opportunityCost10yr = Math.round(annualTfsaRoom * ((1.05 ** 10) - 1));

  return {
    monthlyEssentials,
    totalDebtMinimums,
    monthlySurplus,
    emergencyFundMonths,
    emergencyFundTarget1Month,
    emergencyFundTarget3Month,
    hasHighInterestDebt,
    fhsaEligible,
    debtBalance,
    weightedApr,
    debtMonthlyPaymentCapacity,
    payoffMonths,
    debtFreeDateLabel: debtBalance > 0 ? monthLabelFromNow(payoffMonths) : null,
    opportunityCost10yr,
  };
}

function buildFinancialLevel(profile, metrics) {
  if (metrics.emergencyFundMonths < 1 || metrics.hasHighInterestDebt) {
    return { level: 1, label: "Foundation" };
  }
  if (metrics.emergencyFundMonths < 3) {
    return { level: 2, label: "Stability" };
  }
  if (metrics.debtBalance <= 0) {
    return { level: 3, label: "Growth" };
  }
  return { level: 2, label: "Stability" };
}

export function buildFallbackAgentPlan(profile, metrics) {
  const level = buildFinancialLevel(profile, metrics);
  const monthlyIncome = Math.max(profile.income.monthly, 1);
  const fixed = Math.round(metrics.monthlyEssentials + metrics.totalDebtMinimums);
  const starterFundGap = Math.max(metrics.emergencyFundTarget1Month - profile.savings.emergencyFund, 0);

  const savingsAmount = starterFundGap > 0
    ? Math.min(Math.max(200, Math.round(monthlyIncome * 0.1)), Math.max(200, Math.round(metrics.monthlySurplus * 0.5)))
    : Math.max(150, Math.round(monthlyIncome * 0.08));
  const debtAmount = metrics.debtBalance > 0 ? Math.max(0, metrics.debtMonthlyPaymentCapacity) : 0;
  const investmentAmount = starterFundGap > 0 ? 0 : Math.max(0, Math.round(monthlyIncome * 0.1));
  const guiltFree = Math.max(0, Math.round(monthlyIncome - fixed - savingsAmount - debtAmount - investmentAmount));

  // Create goal-aware coach opening
  const userGoal = profile.goal || "Build a stable financial plan";
  const goalContext = userGoal.toLowerCase().includes("home") || profile.isFirstTimeBuyer
    ? `Your goal is ${userGoal.toLowerCase()}. To get there, you need stability first.`
    : `Your goal is ${userGoal.toLowerCase()}.`;

  const milestones = [];

  milestones.push({
    id: 1,
    title: "Build starter emergency fund",
    status: "current",
    targetAmount: metrics.emergencyFundTarget1Month,
    targetLabel: "1 month of essentials",
    monthlyContribution: savingsAmount,
    estimatedTimeline: starterFundGap > 0 ? `${Math.max(1, Math.ceil(starterFundGap / Math.max(savingsAmount, 1)))} months` : "Complete",
    estimatedCompletionDate: starterFundGap > 0 ? monthLabelFromNow(Math.max(1, Math.ceil(starterFundGap / Math.max(savingsAmount, 1)))) : "Complete",
    whyThisOrder: "This protects you from new high-interest debt when life hits unexpectedly.",
    thisWeekAction: `Set up an automatic $${savingsAmount} transfer to a high-interest savings account on payday.`,
    unlocksWhen: `Emergency fund reaches $${metrics.emergencyFundTarget1Month}.`,
  });

  if (metrics.debtBalance > 0) {
    milestones.push({
      id: 2,
      title: "Eliminate high-interest debt",
      status: starterFundGap > 0 ? "next" : "current",
      targetAmount: Math.round(metrics.debtBalance),
      targetLabel: "Total non-mortgage debt",
      monthlyContribution: debtAmount,
      estimatedTimeline: `${Math.max(1, metrics.payoffMonths)} months`,
      estimatedCompletionDate: monthLabelFromNow(metrics.payoffMonths),
      whyThisOrder: "Debt interest above savings returns slows wealth building.",
      thisWeekAction: `Set a recurring extra payment of $${Math.max(0, debtAmount - metrics.totalDebtMinimums)} on your highest APR debt.`,
      unlocksWhen: "All high-interest balances are at $0.",
    });
  }

  milestones.push({
    id: 3,
    title: metrics.fhsaEligible ? "Fund FHSA, then TFSA" : "Fund TFSA and RRSP in tax-aware order",
    status: starterFundGap > 0 || metrics.debtBalance > 0 ? "locked" : "next",
    targetAmount: Math.round(metrics.fhsaEligible ? profile.accounts.fhsa.room : profile.accounts.tfsa.room),
    targetLabel: metrics.fhsaEligible ? "FHSA room" : "Registered account room",
    monthlyContribution: investmentAmount,
    estimatedTimeline: investmentAmount > 0 ? `${Math.max(1, Math.ceil((metrics.fhsaEligible ? profile.accounts.fhsa.room : profile.accounts.tfsa.room) / investmentAmount))} months` : "After safety milestones",
    estimatedCompletionDate: investmentAmount > 0 ? monthLabelFromNow(Math.max(1, Math.ceil((metrics.fhsaEligible ? profile.accounts.fhsa.room : profile.accounts.tfsa.room) / investmentAmount))) : "After safety milestones",
    whyThisOrder: "Once stable and debt-light, tax-advantaged accounts accelerate long-term progress.",
    thisWeekAction: metrics.fhsaEligible
      ? `Open or verify your FHSA and schedule $${Math.max(200, investmentAmount)} monthly contributions.`
      : `Set a $${Math.max(200, investmentAmount)} monthly transfer to your primary registered account.`,
    unlocksWhen: "Emergency fund and debt milestones are complete.",
  });

  return {
    financialLevel: level.level,
    financialLevelLabel: level.label,
    coachOpening: starterFundGap > 0
      ? `${goalContext} Your current risk is low cash protection. Before aggressive debt or investing moves, your first win is a starter emergency buffer so surprises stop derailing progress.`
      : `${goalContext} Your baseline is stable enough to sequence debt and account contributions in a coaching order that protects momentum.`,
    milestones,
    buckets: {
      fixed: { percent: Math.round((fixed / monthlyIncome) * 100), amount: fixed },
      savings: { percent: Math.round((savingsAmount / monthlyIncome) * 100), amount: savingsAmount },
      investments: { percent: Math.round((investmentAmount / monthlyIncome) * 100), amount: investmentAmount },
      guiltFree: { percent: Math.round((guiltFree / monthlyIncome) * 100), amount: guiltFree },
    },
    debtFreeDate: metrics.debtFreeDateLabel,
    opportunityCost: `If TFSA room remains unused this year, you could miss about $${metrics.opportunityCost10yr.toLocaleString("en-CA")} in 10-year growth at 5%.`,
    bookRecommendation: {
      title: starterFundGap > 0 ? "The Psychology of Money" : "I Will Teach You to Be Rich",
      author: starterFundGap > 0 ? "Morgan Housel" : "Ramit Sethi",
      reason: starterFundGap > 0
        ? "Build consistency and confidence under uncertainty."
        : "Use systems and automation to keep the plan sustainable.",
    },
    assumptions: [
      "All values are CAD and based on your latest provided numbers.",
      "Contribution room should be verified in CRA My Account before deposits.",
      "AI provides guidance. You decide and execute each action.",
    ],
  };
}

function isValidAgentPlan(plan) {
  return Boolean(
    plan
    && typeof plan === "object"
    && Number.isFinite(Number(plan.financialLevel))
    && typeof plan.financialLevelLabel === "string"
    && typeof plan.coachOpening === "string"
    && Array.isArray(plan.milestones)
    && plan.buckets
    && typeof plan.buckets === "object"
    && plan.bookRecommendation
  );
}

async function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("plan_timeout")), ms);
    }),
  ]);
}

export async function generateAgentPlan({ intakeData, apiKey, timeoutMs = 15000 }) {
  const profile = normalizeProfileFromIntake(intakeData);
  const metrics = computePlanMetrics(profile);
  const fallbackPlan = buildFallbackAgentPlan(profile, metrics);

  if (!apiKey) {
    return { plan: fallbackPlan, metrics, profile, source: "fallback_no_key" };
  }

  const knowledgeBase = await getKnowledgeBase();
  const prompt = buildPlanPrompt(profile, metrics, knowledgeBase);

  try {
    const client = new OpenAI({ apiKey });
    const completion = await withTimeout(
      client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2400,
      }),
      timeoutMs,
    );

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    if (!isValidAgentPlan(parsed)) {
      return { plan: fallbackPlan, metrics, profile, source: "fallback_invalid_schema" };
    }

    return { plan: parsed, metrics, profile, source: "llm" };
  } catch {
    return { plan: fallbackPlan, metrics, profile, source: "fallback_error" };
  }
}

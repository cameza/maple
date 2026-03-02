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
  const discretionary = Math.max(0, asNumber(profile.expenses.discretionary));
  const monthlySurplus = profile.income.monthly - monthlyEssentials - totalDebtMinimums - discretionary;
  const emergencyFundMonths = monthlyEssentials > 0
    ? profile.savings.emergencyFund / monthlyEssentials
    : 0;
  const emergencyFundTarget1Month = Math.round(monthlyEssentials);
  const emergencyFundTarget3Month = Math.round(monthlyEssentials * 3);
  const emergencyFundExcess = Math.max(0, profile.savings.emergencyFund - emergencyFundTarget3Month);
  const hasHighInterestDebt = profile.debts.some((d) => d.apr >= 8 && d.balance > 0);
  // FHSA eligibility: any first-time buyer qualifies, regardless of current room
  const fhsaEligible = profile.isFirstTimeBuyer;
  const fhsaAccountOpen = profile.accounts.fhsa.hasAccount;
  // If never opened, infer $8,000 annual room (opening the account starts the clock)
  const fhsaRoom = profile.accounts.fhsa.room > 0
    ? profile.accounts.fhsa.room
    : (fhsaEligible && !fhsaAccountOpen ? 8000 : 0);
  const fhsaMonthlyTarget = fhsaEligible ? Math.round(8000 / 12) : 0;

  const debtBalance = profile.debts.reduce((sum, debt) => sum + debt.balance, 0);
  const weightedApr = debtBalance > 0
    ? profile.debts.reduce((sum, debt) => sum + (debt.balance * debt.apr), 0) / debtBalance
    : 0;
  const monthlyInterestCost = Math.round(
    profile.debts.reduce((sum, d) => sum + (asNumber(d.balance) * asNumber(d.apr) / 100 / 12), 0)
  );

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
    discretionary,
    monthlySurplus,
    emergencyFundMonths,
    emergencyFundTarget1Month,
    emergencyFundTarget3Month,
    emergencyFundExcess,
    hasHighInterestDebt,
    fhsaEligible,
    fhsaAccountOpen,
    fhsaRoom,
    fhsaMonthlyTarget,
    monthlyInterestCost,
    debtBalance,
    weightedApr,
    debtMonthlyPaymentCapacity,
    payoffMonths,
    debtFreeDateLabel: debtBalance > 0 ? monthLabelFromNow(payoffMonths) : null,
    opportunityCost10yr,
  };
}

function buildFinancialLevel(_profile, metrics) {
  if (metrics.emergencyFundMonths < 1) return { level: 1, label: "Foundation" };
  if (metrics.hasHighInterestDebt && metrics.emergencyFundMonths < 3) return { level: 1, label: "Foundation" };
  // Large safety net + manageable debt (payoff < 12 months) = Stability, not Foundation
  if (metrics.hasHighInterestDebt && metrics.payoffMonths <= 12) return { level: 2, label: "Stability" };
  if (metrics.hasHighInterestDebt) return { level: 1, label: "Foundation" };
  if (metrics.emergencyFundMonths < 3) return { level: 2, label: "Stability" };
  if (metrics.debtBalance <= 0) return { level: 3, label: "Growth" };
  return { level: 2, label: "Stability" };
}

function parseGoalYears(goalText) {
  const match = (goalText || "").match(/(\d+)\s*[-–]\s*(\d+)\s*year/i);
  if (match) return Math.round((Number(match[1]) + Number(match[2])) / 2);
  const single = (goalText || "").match(/(\d+)\s*year/i);
  if (single) return Number(single[1]);
  return null;
}

function computeGoalProjection(profile, metrics, goalYears) {
  if (!goalYears || goalYears <= 0) return null;
  const months = goalYears * 12;
  const sources = [];

  if (metrics.emergencyFundExcess > 0) {
    sources.push({ label: "Excess emergency savings (reallocated)", amount: Math.round(metrics.emergencyFundExcess) });
  }
  if (profile.accounts.tfsa.balance > 0) {
    sources.push({ label: "Existing TFSA balance", amount: Math.round(profile.accounts.tfsa.balance) });
  }
  if (metrics.fhsaEligible) {
    const fhsaTotal = Math.min(40000, metrics.fhsaMonthlyTarget * months);
    sources.push({ label: `FHSA contributions (${goalYears} years at $${metrics.fhsaMonthlyTarget}/mo)`, amount: Math.round(fhsaTotal) });
  }
  if (profile.accounts.rrsp.room > 0) {
    // HBP-eligible RRSP contributions from surplus after other priorities
    const rrspMonths = Math.max(0, months - Math.min(12, metrics.payoffMonths));
    const rrspMonthly = Math.max(0, Math.round(metrics.monthlySurplus * 0.3));
    const rrspTotal = Math.min(60000, rrspMonthly * rrspMonths);
    if (rrspTotal > 0) {
      sources.push({ label: `RRSP contributions for HBP (${rrspMonths} months)`, amount: Math.round(rrspTotal) });
    }
  }
  // Ongoing TFSA contributions after debt is cleared
  const postDebtMonths = Math.max(0, months - metrics.payoffMonths);
  const tfsaMonthly = Math.max(0, Math.round(metrics.monthlySurplus * 0.2));
  if (postDebtMonths > 0 && tfsaMonthly > 0) {
    sources.push({ label: `TFSA contributions (${postDebtMonths} months post-debt)`, amount: Math.round(tfsaMonthly * postDebtMonths) });
  }

  const total = sources.reduce((sum, s) => sum + s.amount, 0);
  if (total <= 0) return null;
  return { title: "Projected Savings Pool", sources, totalEstimate: total, timelineYears: goalYears };
}

export function buildFallbackAgentPlan(profile, metrics) {
  const level = buildFinancialLevel(profile, metrics);
  const monthlyIncome = Math.max(profile.income.monthly, 1);
  const fixed = Math.round(metrics.monthlyEssentials + metrics.totalDebtMinimums + metrics.discretionary);
  const starterFundGap = Math.max(metrics.emergencyFundTarget1Month - profile.savings.emergencyFund, 0);
  const fullEmergencyGap = Math.max(metrics.emergencyFundTarget3Month - profile.savings.emergencyFund, 0);
  const surplus = Math.max(0, metrics.monthlySurplus);

  // Trade-off analysis: compare interest cost of keeping debt vs opportunity cost of delaying registered accounts
  const fhsaShouldBeParallel = metrics.fhsaEligible
    && metrics.fhsaMonthlyTarget > 0
    && metrics.monthlyInterestCost < metrics.fhsaMonthlyTarget;

  // Allocations based on trade-off reasoning
  const fhsaAllocation = fhsaShouldBeParallel ? Math.min(metrics.fhsaMonthlyTarget, surplus) : 0;
  const surplusAfterFhsa = Math.max(0, surplus - fhsaAllocation);

  const savingsAmount = starterFundGap > 0
    ? Math.min(Math.max(200, Math.round(monthlyIncome * 0.1)), Math.max(200, Math.round(surplusAfterFhsa * 0.5)))
    : (fullEmergencyGap > 0 ? Math.max(150, Math.round(monthlyIncome * 0.08)) : 0);

  const surplusAfterSavings = Math.max(0, surplusAfterFhsa - savingsAmount);
  const debtExtra = metrics.debtBalance > 0 ? Math.min(surplusAfterSavings, Math.max(0, metrics.debtMonthlyPaymentCapacity - metrics.totalDebtMinimums)) : 0;
  const debtAmount = metrics.debtBalance > 0 ? metrics.totalDebtMinimums + debtExtra : 0;

  const surplusAfterDebt = Math.max(0, surplusAfterSavings - debtExtra);
  const investmentAmount = starterFundGap > 0 ? 0 : Math.min(surplusAfterDebt, Math.max(0, Math.round(monthlyIncome * 0.1)));
  const guiltFree = Math.max(0, Math.round(monthlyIncome - fixed - savingsAmount - debtAmount - fhsaAllocation - investmentAmount));

  // Goal analysis
  const userGoal = (profile.goal || "Build a stable financial plan").trim();
  const goalLower = userGoal.toLowerCase();
  const isHomeBuyingGoal = goalLower.includes("home") || goalLower.includes("house") || profile.isFirstTimeBuyer;
  const hasDebt = metrics.debtBalance > 0;
  const goalYears = parseGoalYears(userGoal);

  // Goal readiness based on trade-off analysis, not rigid sequencing
  let goalReadiness;
  if (metrics.emergencyFundExcess > 0 && !starterFundGap) {
    // User has oversized emergency fund -- they can start immediately
    goalReadiness = {
      canAchieveNow: true,
      headline: "Yes, and your savings give you a strong start.",
      reason: `Your emergency fund covers ${Math.round(metrics.emergencyFundMonths)} months of essentials. You only need 3 months ($${metrics.emergencyFundTarget3Month.toLocaleString("en-CA")}). The excess $${Math.round(metrics.emergencyFundExcess).toLocaleString("en-CA")} can accelerate your goal through registered accounts.`,
      focusNow: metrics.fhsaEligible
        ? "Open your FHSA this week and move excess emergency savings into registered accounts."
        : "Redirect excess emergency savings into registered accounts for tax-sheltered growth.",
    };
  } else if (starterFundGap > 0) {
    goalReadiness = {
      canAchieveNow: false,
      headline: "Not yet. Build your safety net first.",
      reason: "Build a 1-month emergency fund so one surprise does not push you into new debt.",
      focusNow: "Focus now: complete your 1-month emergency fund, then attack high-interest debt.",
    };
  } else if (hasDebt && fhsaShouldBeParallel) {
    // Debt exists but FHSA opportunity cost is higher -- parallel strategy
    goalReadiness = {
      canAchieveNow: true,
      headline: "Yes, with a parallel strategy.",
      reason: `Your debt costs $${metrics.monthlyInterestCost}/month in interest, but delaying FHSA contributions costs more in lost tax-sheltered room. Fund both simultaneously.`,
      focusNow: metrics.fhsaEligible
        ? `Open your FHSA and contribute $${fhsaAllocation}/month while paying $${debtAmount}/month toward debt.`
        : "Start registered account contributions now while paying down debt in parallel.",
    };
  } else if (hasDebt) {
    goalReadiness = {
      canAchieveNow: false,
      headline: "Almost. Clear high-interest debt first.",
      reason: "High-interest debt costs more than most investments return. Clear it, then redirect that cash flow.",
      focusNow: "Focus now: eliminate high-interest debt, then shift cash flow to registered accounts.",
    };
  } else {
    goalReadiness = {
      canAchieveNow: true,
      headline: "Yes, this plan supports your goal now.",
      reason: "Your safety net is in place and no high-interest debt is slowing you down.",
      focusNow: "Focus now: execute the first milestone and keep contributions consistent.",
    };
  }

  const milestones = [];

  // Milestone 1: Emergency fund (only if gap exists)
  if (starterFundGap > 0) {
    milestones.push({
      id: 1,
      title: "Build starter emergency fund (1 month)",
      status: "current",
      targetAmount: metrics.emergencyFundTarget1Month,
      targetLabel: "1 month of essentials",
      monthlyContribution: savingsAmount,
      estimatedTimeline: `${Math.max(1, Math.ceil(starterFundGap / Math.max(savingsAmount, 1)))} months`,
      estimatedCompletionDate: monthLabelFromNow(Math.max(1, Math.ceil(starterFundGap / Math.max(savingsAmount, 1)))),
      whyThisOrder: "This first buffer prevents new borrowing when a surprise expense hits.",
      thisWeekAction: `Set up an automatic $${savingsAmount} transfer to a high-interest savings account on payday.`,
      unlocksWhen: `Emergency fund reaches $${metrics.emergencyFundTarget1Month}.`,
    });
  }

  // Excess emergency fund reallocation (when emergency fund is oversized)
  if (metrics.emergencyFundExcess > 0 && starterFundGap === 0) {
    milestones.push({
      id: milestones.length + 1,
      title: "Reallocate excess emergency savings",
      status: "current",
      targetAmount: Math.round(metrics.emergencyFundExcess),
      targetLabel: "Excess above 3-month target",
      monthlyContribution: 0,
      estimatedTimeline: "This month",
      estimatedCompletionDate: monthLabelFromNow(1),
      whyThisOrder: `You have ${Math.round(metrics.emergencyFundMonths)} months of emergency savings but only need 3 months ($${metrics.emergencyFundTarget3Month.toLocaleString("en-CA")}). The excess $${Math.round(metrics.emergencyFundExcess).toLocaleString("en-CA")} is earning taxable interest when it could be sheltered in registered accounts.`,
      thisWeekAction: metrics.fhsaEligible
        ? (metrics.fhsaAccountOpen
          ? `Move up to $${Math.min(Math.round(metrics.emergencyFundExcess), Math.round(metrics.fhsaRoom)).toLocaleString("en-CA")} from your HISA to your FHSA, then consider RRSP for HBP eligibility.`
          : `Open your FHSA this week, then move up to $${Math.min(Math.round(metrics.emergencyFundExcess), 8000).toLocaleString("en-CA")} from your HISA to start building your down payment fund.`)
        : `Move $${Math.round(metrics.emergencyFundExcess).toLocaleString("en-CA")} from your HISA to your TFSA or RRSP for tax-sheltered growth.`,
      unlocksWhen: "Emergency fund is right-sized at 3 months of essentials.",
    });
  }

  // FHSA milestone (when eligible and trade-off favors parallel funding)
  if (metrics.fhsaEligible && fhsaShouldBeParallel) {
    const fhsaSetupAction = profile.accounts.fhsa.hasAccount
      ? `Contribute $${fhsaAllocation}/month to your FHSA to max the $8,000 annual limit.`
      : "Open an FHSA this week. Contribution room only accumulates after the account is open.";

    milestones.push({
      id: milestones.length + 1,
      title: profile.accounts.fhsa.hasAccount ? "Fund FHSA ($8,000/year limit)" : "Open and fund FHSA this week",
      status: "current",
      targetAmount: 8000,
      targetLabel: "Annual FHSA limit",
      monthlyContribution: fhsaAllocation,
      estimatedTimeline: `${Math.max(1, Math.ceil(8000 / Math.max(fhsaAllocation, 1)))} months`,
      estimatedCompletionDate: monthLabelFromNow(Math.max(1, Math.ceil(8000 / Math.max(fhsaAllocation, 1)))),
      whyThisOrder: `FHSA room is use-it-or-lose-it at $8,000/year. Contributions are tax-deductible and withdrawals for a first home are tax-free. At your marginal rate, $8,000 in FHSA contributions generates roughly $${Math.round(8000 * 0.3)} back at tax time.`,
      thisWeekAction: fhsaSetupAction,
      unlocksWhen: "Annual FHSA limit is reached.",
    });
  }

  // Debt payoff milestone
  if (hasDebt) {
    const debtPayoffMonths = debtAmount > 0
      ? Math.max(1, Math.ceil(metrics.debtBalance / Math.max(debtAmount - (metrics.debtBalance * metrics.weightedApr / 100 / 12), 1)))
      : metrics.payoffMonths;

    milestones.push({
      id: milestones.length + 1,
      title: "Eliminate high-interest debt",
      status: starterFundGap > 0 ? "next" : "current",
      targetAmount: Math.round(metrics.debtBalance),
      targetLabel: "Total non-mortgage debt",
      monthlyContribution: debtAmount,
      estimatedTimeline: `${Math.max(1, debtPayoffMonths)} months`,
      estimatedCompletionDate: monthLabelFromNow(debtPayoffMonths),
      whyThisOrder: `This debt costs $${metrics.monthlyInterestCost}/month in interest. Clearing it frees up $${debtAmount}/month for your next priority.`,
      thisWeekAction: `Set a recurring extra payment of $${Math.max(0, debtExtra)} on your highest APR debt.`,
      unlocksWhen: "All high-interest balances are at $0.",
    });
  }

  // FHSA milestone for eligible users when NOT doing parallel (debt is too large)
  if (metrics.fhsaEligible && !fhsaShouldBeParallel) {
    const fhsaSetupAction = profile.accounts.fhsa.hasAccount
      ? "Verify FHSA contribution room and set your first scheduled contribution date."
      : "Open an FHSA now, even if your first contribution is later. Room only accumulates after opening.";

    milestones.push({
      id: milestones.length + 1,
      title: profile.accounts.fhsa.hasAccount ? "Fund FHSA ($8,000/year limit)" : "Open FHSA now (setup first)",
      status: "next",
      targetAmount: 8000,
      targetLabel: "Annual FHSA limit",
      monthlyContribution: 0,
      estimatedTimeline: "After debt is cleared",
      estimatedCompletionDate: monthLabelFromNow(metrics.payoffMonths + 1),
      whyThisOrder: "FHSA gives homebuyers tax deductions on contributions and tax-free qualified withdrawals. Open the account now to start accumulating room.",
      thisWeekAction: fhsaSetupAction,
      unlocksWhen: "High-interest debt is cleared.",
    });
  }

  // Full emergency buffer (only if gap exists and starter is met)
  if (fullEmergencyGap > 0 && starterFundGap === 0) {
    milestones.push({
      id: milestones.length + 1,
      title: "Build full emergency buffer (3 months)",
      status: hasDebt ? "locked" : "next",
      targetAmount: metrics.emergencyFundTarget3Month,
      targetLabel: "3 months of essentials",
      monthlyContribution: savingsAmount,
      estimatedTimeline: `${Math.max(1, Math.ceil(fullEmergencyGap / Math.max(savingsAmount, 1)))} months`,
      estimatedCompletionDate: monthLabelFromNow(Math.max(1, Math.ceil(fullEmergencyGap / Math.max(savingsAmount, 1)))),
      whyThisOrder: "Moving to 3 months protects your plan through larger disruptions like job loss.",
      thisWeekAction: `Keep your automatic savings active and increase by $${Math.max(50, Math.round(savingsAmount * 0.2))} if cash flow allows.`,
      unlocksWhen: `Emergency buffer reaches $${metrics.emergencyFundTarget3Month.toLocaleString("en-CA")}.`,
    });
  }

  // HBP-eligible RRSP milestone (when user has RRSP room and is buying a home)
  if (isHomeBuyingGoal && profile.accounts.rrsp.room > 0 && !starterFundGap) {
    milestones.push({
      id: milestones.length + 1,
      title: "Contribute to RRSP for Home Buyers' Plan",
      status: hasDebt && !fhsaShouldBeParallel ? "locked" : "next",
      targetAmount: Math.min(60000, Math.round(profile.accounts.rrsp.room)),
      targetLabel: "RRSP room (HBP-eligible up to $60,000)",
      monthlyContribution: investmentAmount,
      estimatedTimeline: investmentAmount > 0 ? `${Math.max(1, Math.ceil(Math.min(60000, profile.accounts.rrsp.room) / investmentAmount))} months` : "After debt is cleared",
      estimatedCompletionDate: investmentAmount > 0 ? monthLabelFromNow(Math.ceil(Math.min(60000, profile.accounts.rrsp.room) / Math.max(investmentAmount, 1))) : "After earlier milestones",
      whyThisOrder: "The Home Buyers' Plan lets you withdraw up to $60,000 tax-free from your RRSP for a first home purchase. Contributions also reduce your taxable income this year. Note: you must repay HBP withdrawals over 15 years ($4,000/year minimum).",
      thisWeekAction: `Direct surplus to your RRSP after FHSA is funded for the month. Mark contributions as HBP-eligible.`,
      unlocksWhen: "FHSA contributions are on track.",
    });
  }

  // General registered account milestone (non-home-buyer or when FHSA is not eligible)
  if (!isHomeBuyingGoal || !metrics.fhsaEligible) {
    milestones.push({
      id: milestones.length + 1,
      title: "Fund TFSA and RRSP in tax-aware order",
      status: starterFundGap > 0 || (metrics.debtBalance > 0 && !fhsaShouldBeParallel) ? "locked" : "next",
      targetAmount: Math.round(profile.accounts.tfsa.room + profile.accounts.rrsp.room),
      targetLabel: "Registered account room",
      monthlyContribution: investmentAmount,
      estimatedTimeline: investmentAmount > 0 ? `${Math.max(1, Math.ceil((profile.accounts.tfsa.room + profile.accounts.rrsp.room) / investmentAmount))} months` : "After safety milestones",
      estimatedCompletionDate: investmentAmount > 0 ? monthLabelFromNow(Math.ceil((profile.accounts.tfsa.room + profile.accounts.rrsp.room) / Math.max(investmentAmount, 1))) : "After safety milestones",
      whyThisOrder: "Once stable and debt-light, tax-advantaged accounts accelerate long-term progress.",
      thisWeekAction: `Set a $${Math.max(200, investmentAmount)} monthly transfer to your primary registered account.`,
      unlocksWhen: "Emergency fund and debt milestones are complete.",
    });
  }

  // Goal projection
  const goalProjection = computeGoalProjection(profile, metrics, goalYears);

  // Coach opening based on analysis
  let coachOpening;
  if (metrics.emergencyFundExcess > 0) {
    coachOpening = `Your goal is ${userGoal.toLowerCase()}. You have a strong safety net with ${Math.round(metrics.emergencyFundMonths)} months of emergency savings. The excess can be reallocated to tax-sheltered accounts to accelerate your progress.`;
  } else if (starterFundGap > 0) {
    coachOpening = `Your goal is ${userGoal.toLowerCase()}. Your first win is a starter emergency buffer so surprises stop derailing progress. Once that is in place, we can build momentum.`;
  } else if (fhsaShouldBeParallel) {
    coachOpening = `Your goal is ${userGoal.toLowerCase()}. Your debt costs $${metrics.monthlyInterestCost}/month in interest, but FHSA room is use-it-or-lose-it. The plan funds both in parallel to maximize your progress.`;
  } else {
    coachOpening = `Your goal is ${userGoal.toLowerCase()}. Your baseline is stable enough to sequence contributions in an order that protects momentum.`;
  }

  return {
    financialLevel: level.level,
    financialLevelLabel: level.label,
    goal: userGoal,
    goalReadiness,
    coachOpening,
    milestones,
    goalProjection,
    buckets: {
      fixed: { percent: Math.round((fixed / monthlyIncome) * 100), amount: fixed },
      savings: { percent: Math.round((savingsAmount / monthlyIncome) * 100), amount: savingsAmount },
      investments: { percent: Math.round(((investmentAmount + fhsaAllocation) / monthlyIncome) * 100), amount: investmentAmount + fhsaAllocation },
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
        model: "gpt-5.2",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3200,
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

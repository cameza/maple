import { NextResponse } from "next/server";
import { generateAgentPlan, normalizeProfileFromIntake } from "../../lib/generatePlan";
import { checkUsageLimit, recordUsage, getIP } from "../../lib/usageLimiter";

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

function timelineToMonthLabel(timelineText, fallbackMonths = 1) {
  const timeline = (timelineText || "").toLowerCase();
  const months = Number((timeline.match(/\d+/) || [fallbackMonths])[0]);
  return monthLabelFromNow(months);
}

function classifyMilestoneType(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("debt") || t.includes("pay off") || t.includes("credit") || t.includes("loan")) return "debt";
  if (t.includes("emergency") || t.includes("buffer")) return "emergency-fund";
  if (t.includes("fhsa")) return "fhsa";
  if (t.includes("tfsa") || t.includes("rrsp") || t.includes("registered")) return "investing";
  return "general";
}

function computeEnrichedFields(item, profile, metrics, currentFinancialLevel) {
  const type = classifyMilestoneType(item?.title);
  const monthlyContribution = Math.max(0, asNumber(item?.monthlyContribution));

  // interestCostPerMonth (debt actions only)
  let interestCostPerMonth = null;
  if (type === "debt" && metrics.debtBalance > 0) {
    interestCostPerMonth = Math.round(
      profile.debts.reduce((sum, d) => sum + (asNumber(d.balance) * asNumber(d.apr) / 100 / 12), 0)
    );
  }

  // cashFlowUnlocked
  let cashFlowUnlocked = null;
  if (type === "debt" && monthlyContribution > 0) {
    cashFlowUnlocked = monthlyContribution + metrics.totalDebtMinimums;
  } else if (monthlyContribution > 0) {
    cashFlowUnlocked = monthlyContribution;
  }

  // unlocksLevel - simulate completing this milestone
  let unlocksLevel = null;
  if (type === "emergency-fund") {
    const titleLower = (item?.title || "").toLowerCase();
    const wouldHaveMonths = titleLower.includes("3") ? 3 : 1;
    if (wouldHaveMonths >= 3 && !metrics.hasHighInterestDebt) {
      if (currentFinancialLevel < 3) unlocksLevel = { level: 3, label: "Growth" };
    } else if (wouldHaveMonths >= 1 && !metrics.hasHighInterestDebt) {
      if (currentFinancialLevel < 2) unlocksLevel = { level: 2, label: "Stability" };
    }
  } else if (type === "debt") {
    if (metrics.emergencyFundMonths >= 3) {
      if (currentFinancialLevel < 3) unlocksLevel = { level: 3, label: "Growth" };
    } else if (metrics.emergencyFundMonths >= 1) {
      if (currentFinancialLevel < 2) unlocksLevel = { level: 2, label: "Stability" };
    }
  }

  // skipImpact
  let skipImpact = null;
  if (type === "debt" && interestCostPerMonth > 0) {
    skipImpact = `Skipping a month costs roughly $${interestCostPerMonth} in extra interest.`;
  } else if (monthlyContribution > 0) {
    skipImpact = "Skipping a month adds roughly 1 month to your timeline.";
  }

  // learnMoreTopic
  const topicMap = {
    "debt": "debt-avalanche-snowball",
    "emergency-fund": "emergency-fund",
    "fhsa": "fhsa",
    "investing": "tfsa",
    "general": "account-priority",
  };

  return {
    interestCostPerMonth,
    cashFlowUnlocked,
    unlocksLevel,
    skipImpact,
    learnMoreTopic: topicMap[type] || "account-priority",
  };
}

function buildUiPlanShape(profile, metrics, agentPlan) {
  const totalDebt = profile.debts.reduce((sum, debt) => sum + asNumber(debt.balance), 0);
  const currentBuckets = {
    fixed: asNumber(agentPlan?.buckets?.fixed?.amount),
    savings: asNumber(agentPlan?.buckets?.savings?.amount),
    investments: asNumber(agentPlan?.buckets?.investments?.amount),
    guiltFree: asNumber(agentPlan?.buckets?.guiltFree?.amount),
  };

  const debtPaymentAllocation = totalDebt > 0
    ? Math.max(0, Math.round(Math.max(metrics.totalDebtMinimums, metrics.monthlySurplus * 0.35)))
    : 0;

  const milestones = Array.isArray(agentPlan?.milestones)
    ? agentPlan.milestones.map((item, index) => ({
      label: item?.title || `Milestone ${index + 1}`,
      status: item?.status || "locked",
      projectedDate: item?.estimatedCompletionDate || timelineToMonthLabel(item?.estimatedTimeline, index + 1),
      celebrationMessage: item?.unlocksWhen || item?.whyThisOrder || "Progress unlocked.",
    }))
    : [];

  const currentLevel = asNumber(agentPlan?.financialLevel, 1);
  const priorities = (Array.isArray(agentPlan?.milestones) ? agentPlan.milestones : [])
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      action: item?.title || `Priority ${index + 1}`,
      reasoning: item?.whyThisOrder || "This is sequenced to protect your financial stability first.",
      dollarAmount: Math.max(0, asNumber(item?.monthlyContribution)),
      duration: item?.estimatedTimeline || "Ongoing",
      completionDate: item?.estimatedCompletionDate || "To be calculated",
      ...computeEnrichedFields(item, profile, metrics, currentLevel),
    }));

  return {
    goal: profile.goal || agentPlan?.goal || "Build a stable financial plan",
    goalReadiness: agentPlan?.goalReadiness || {
      canAchieveNow: true,
      headline: "Yes, this plan supports your goal now.",
      reason: "Your plan prioritizes financial stability while working toward your goal.",
      focusNow: "Focus now: execute the first milestone and keep contributions consistent."
    },
    financialLevel: {
      current: asNumber(agentPlan?.financialLevel, 1),
      label: agentPlan?.financialLevelLabel || "Foundation",
    },
    snapshot: {
      monthlyIncome: asNumber(profile.income.monthly),
      totalDebt: asNumber(totalDebt),
      fixedCosts: asNumber(metrics.monthlyEssentials + metrics.totalDebtMinimums),
      discretionary: asNumber(metrics.discretionary),
      emergencyFundMonths: Number(metrics.emergencyFundMonths.toFixed(2)),
    },
    buckets: {
      current: currentBuckets,
      target: {
        fixed: 55,
        investments: 10,
        savings: 10,
        guiltFree: 25,
      },
    },
    emergencyFund: {
      currentMonths: Number(metrics.emergencyFundMonths.toFixed(2)),
      targetMonths: 3,
      monthlyToContribute: Math.max(0, currentBuckets.savings),
      projectedCompleteDate: monthLabelFromNow(Math.max(0, Math.ceil((metrics.emergencyFundTarget3Month - profile.savings.emergencyFund) / Math.max(currentBuckets.savings, 1)))),
      accountRecommendation: "Use a high-interest savings account and verify CRA contribution room before registered contributions.",
    },
    debts: profile.debts.map((debt) => ({
      name: debt.name,
      balance: asNumber(debt.balance),
      interestRate: asNumber(debt.apr),
      minimumPayment: asNumber(debt.minPayment),
      recommendedPayment: Math.max(asNumber(debt.minPayment), debtPaymentAllocation),
      projectedPayoffDate: metrics.debtFreeDateLabel || "N/A",
      totalInterestSaved: 0,
    })),
    debtFreeDate: metrics.debtFreeDateLabel,
    registeredAccounts: ["TFSA", "RRSP", "FHSA"].map((type) => {
      const key = type.toLowerCase();
      return {
        type,
        balance: asNumber(profile.accounts?.[key]?.balance),
        roomAvailable: asNumber(profile.accounts?.[key]?.room),
        recommendedMonthlyContribution: currentBuckets.investments > 0 ? Math.round(currentBuckets.investments / 3) : 0,
        yearToMaximize: new Date().getFullYear(),
      };
    }),
    opportunityCost: {
      unusedRoomTotal: asNumber(profile.accounts?.tfsa?.room),
      foregoingGrowth10yr: asNumber(metrics.opportunityCost10yr),
      plainLanguage: typeof agentPlan?.opportunityCost === "string"
        ? agentPlan.opportunityCost
        : `If you leave TFSA room unused this year, you could miss about $${asNumber(metrics.opportunityCost10yr).toLocaleString("en-CA")} over 10 years at 5% growth.`,
    },
    monthlyAllocation: {
      emergencyFund: Math.max(0, currentBuckets.savings),
      debtPayoff: debtPaymentAllocation,
      fhsa: metrics.fhsaEligible ? Math.max(0, Math.round(currentBuckets.investments * 0.5)) : 0,
      rrsp: Math.max(0, Math.round(currentBuckets.investments * 0.25)),
      tfsa: Math.max(0, Math.round(currentBuckets.investments * 0.25)),
      guiltFree: Math.max(0, currentBuckets.guiltFree),
    },
    milestones,
    priorities,
    goalProjection: agentPlan?.goalProjection || null,
    reasoning: typeof agentPlan?.reasoning === "string" ? agentPlan.reasoning : null,
    bookRecommendation: {
      title: agentPlan?.bookRecommendation?.title || "The Psychology of Money",
      author: agentPlan?.bookRecommendation?.author || "Morgan Housel",
      hook: agentPlan?.bookRecommendation?.reason || "Consistency and sequence drive long-term results.",
    },
    oneActionThisWeek: agentPlan?.milestones?.[0]?.thisWeekAction || "Set one automatic transfer this week and keep it realistic.",
    assumptions: Array.isArray(agentPlan?.assumptions) ? agentPlan.assumptions : ["All values are CAD.", "You decide and execute each action."],
  };
}

export async function POST(request) {
  try {
    const ip = getIP(request);
    
    // Check usage limits (estimate 2500 tokens for plan generation)
    const usageCheck = checkUsageLimit(ip, 2500);
    if (!usageCheck.allowed) {
      if (usageCheck.reason === 'daily_requests') {
        return NextResponse.json({ 
          error: "Daily request limit reached. Try again tomorrow." 
        }, { status: 429 });
      }
      if (usageCheck.reason === 'daily_tokens') {
        return NextResponse.json({ 
          error: "Daily token limit reached. Try again tomorrow." 
        }, { status: 429 });
      }
    }

    const body = await request.json();
    const intakeData = body?.intakeData && typeof body.intakeData === "object"
      ? body.intakeData
      : body;

    if (!intakeData || typeof intakeData !== "object") {
      return NextResponse.json({ error: "intakeData is required" }, { status: 400 });
    }

    const hasProfile = intakeData.profile && typeof intakeData.profile === "object";
    const hasIncomeInput = asNumber(intakeData.monthlyIncome, 0) > 0;
    const hasExpensesInput = intakeData.expenses && typeof intakeData.expenses === "object";

    if (!hasProfile || !hasIncomeInput || !hasExpensesInput) {
      return NextResponse.json(
        { error: "intakeData is incomplete. profile, monthlyIncome, and expenses are required." },
        { status: 400 },
      );
    }

    const profile = normalizeProfileFromIntake(intakeData);
    const hasIncomeProfile = asNumber(profile.income.monthly, 0) > 0;
    const hasExpensesProfile = Object.values(profile.expenses || {}).some((value) => asNumber(value, 0) > 0);

    if (!hasProfile || !hasIncomeProfile || !hasExpensesProfile) {
      return NextResponse.json(
        { error: "intakeData is incomplete. profile, monthlyIncome, and expenses are required." },
        { status: 400 },
      );
    }

    const generated = await generateAgentPlan({
      intakeData,
      apiKey: process.env.OPENAI_API_KEY,
      timeoutMs: 15000,
    });

    const uiPlan = buildUiPlanShape(generated.profile, generated.metrics, generated.plan);

    if (generated.source === "llm") {
      recordUsage(ip, 2500);
    } else {
      recordUsage(ip, 300);
    }

    return NextResponse.json(uiPlan);
  } catch {
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

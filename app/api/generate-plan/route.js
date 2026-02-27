import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildSnapshotFromIntake,
  estimateOpportunityCost,
  formatCurrency,
  generatePlan,
} from "../../lib/agentEngine";
import { SYSTEM_PROMPT } from "../../lib/systemPrompt";
import { checkUsageLimit, recordUsage, getIP } from "../../lib/usageLimiter";

const DEFAULT_MODEL = "gpt-4o-mini";

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

function buildDeterministicPlan(intakeData) {
  const snapshot = buildSnapshotFromIntake(intakeData);
  const generated = generatePlan(snapshot);

  const fixedCosts = asNumber(snapshot.fixedCostsMonthly, 0);
  const discretionary = Math.max(0, snapshot.takeHomeMonthly - fixedCosts);
  const totalDebt = snapshot.debts.reduce((sum, debt) => sum + asNumber(debt.balance), 0);
  const emergencyFundMonths = snapshot.essentialExpenses > 0
    ? asNumber(snapshot.emergencyFund, 0) / snapshot.essentialExpenses
    : 0;

  const debtRows = snapshot.debts.map((debt) => ({
    name: debt.name,
    balance: asNumber(debt.balance, 0),
    interestRate: asNumber(debt.apr, 0),
    minimumPayment: asNumber(debt.minimum, 0),
    recommendedPayment: asNumber(debt.minimum, 0),
    projectedPayoffDate: monthLabelFromNow(generated.debtProjection.months),
    totalInterestSaved: 0,
  }));
  const hasDebtRows = debtRows.length > 0;

  const accountSequence = generated.accountSequence.filter((item) => ["FHSA", "RRSP", "TFSA"].includes(item));
  const registeredAccounts = accountSequence.map((type) => {
    const key = type.toLowerCase();
    return {
      type,
      balance: asNumber(snapshot.accounts?.[key]?.balance, 0),
      roomAvailable: asNumber(snapshot.rooms?.[key], 0),
      recommendedMonthlyContribution: Math.max(0, Math.round(generated.buckets.investments / Math.max(1, accountSequence.length))),
      yearToMaximize: new Date().getFullYear(),
    };
  });

  const annualUnusedRoom = Math.max(
    asNumber(snapshot.rooms?.tfsa, 0) - asNumber(snapshot.currentYearTfsaContribution, 0),
    0,
  );
  const opportunity10Year = estimateOpportunityCost(Math.min(annualUnusedRoom, 7000), 0.05, 10);

  const basePlan = {
    financialLevel: {
      current: generated.level.level,
      label: generated.level.name,
      nextMilestone: generated.level.next,
    },
    snapshot: {
      monthlyIncome: asNumber(snapshot.takeHomeMonthly, 0),
      totalDebt: asNumber(totalDebt, 0),
      fixedCosts: asNumber(fixedCosts, 0),
      discretionary: asNumber(discretionary, 0),
      emergencyFundMonths: Number(emergencyFundMonths.toFixed(2)),
    },
    buckets: {
      current: {
        fixed: generated.buckets.fixed,
        investments: generated.buckets.investments,
        savings: generated.buckets.savings,
        guiltFree: generated.buckets.guiltFree,
      },
      target: {
        fixed: 55,
        investments: 10,
        savings: 10,
        guiltFree: 25,
      },
    },
    emergencyFund: {
      currentMonths: Number(emergencyFundMonths.toFixed(2)),
      targetMonths: 3,
      monthlyToContribute: Math.max(0, Math.round(generated.buckets.savings)),
      projectedCompleteDate: monthLabelFromNow((3 - emergencyFundMonths) * 6),
      accountRecommendation: "Use a high-interest savings account and verify TFSA room before using TFSA-HISA.",
    },
    debts: debtRows,
    debtFreeDate: monthLabelFromNow(generated.debtProjection.months),
    registeredAccounts,
    opportunityCost: {
      unusedRoomTotal: annualUnusedRoom,
      foregoingGrowth10yr: opportunity10Year,
      plainLanguage: `If you leave ${formatCurrency(annualUnusedRoom)} of TFSA room unused this year, you could miss about ${formatCurrency(opportunity10Year)} over 10 years at 5% growth.`,
    },
    monthlyAllocation: {
      emergencyFund: Math.round(generated.buckets.savings),
      debtPayoff: Math.round(snapshot.debtExtraPayment),
      fhsa: 0,
      rrsp: 0,
      tfsa: 0,
      guiltFree: Math.round(generated.buckets.guiltFree),
    },
    milestones: [
      {
        label: "Starter emergency fund",
        projectedDate: monthLabelFromNow((1 - emergencyFundMonths) * 4),
        celebrationMessage: "You now have at least one month of safety buffer.",
      },
      {
        label: hasDebtRows ? "High-interest debt progress checkpoint" : "Contribution momentum checkpoint",
        projectedDate: monthLabelFromNow(generated.debtProjection.months / 2),
        celebrationMessage: hasDebtRows
          ? "Your debt trend is moving in the right direction."
          : "Your monthly contribution habit is staying consistent.",
      },
      {
        label: hasDebtRows ? "Debt-free target" : "Emergency fund milestone",
        projectedDate: monthLabelFromNow(generated.debtProjection.months),
        celebrationMessage: hasDebtRows
          ? "You are clear of modeled non-mortgage debt."
          : "You reached a stronger cash buffer with no high-interest debt.",
      },
    ],
    priorities: generated.actions.map((action, index) => ({
      rank: index + 1,
      action: action.title,
      reasoning: action.why,
      dollarAmount: Math.max(0, Math.round(index === 0 ? snapshot.debtExtraPayment : generated.buckets.investments)),
    })),
    bookRecommendation: {
      title: "The Psychology of Money",
      author: "Morgan Housel",
      hook: "Strong plans win when behavior stays consistent, even when life gets messy.",
    },
    oneActionThisWeek: generated.oneActionThisWeek || "Pick one transfer amount you can sustain and schedule it for your next payday.",
    assumptions: generated.assumptions,
  };

  return { snapshot, generated, basePlan };
}

function mergeLanguageFields(basePlan, llmData) {
  const merged = { ...basePlan };

  if (Array.isArray(llmData?.priorities)) {
    merged.priorities = basePlan.priorities.map((priority) => {
      const matched = llmData.priorities.find((item) => asNumber(item.rank) === priority.rank) || {};
      return {
        ...priority,
        action: matched.action || priority.action,
        reasoning: matched.reasoning || priority.reasoning,
      };
    });
  }

  if (typeof llmData?.opportunityCost?.plainLanguage === "string" && llmData.opportunityCost.plainLanguage.trim()) {
    merged.opportunityCost = {
      ...merged.opportunityCost,
      plainLanguage: llmData.opportunityCost.plainLanguage.trim(),
    };
  }

  if (Array.isArray(llmData?.milestones) && llmData.milestones.length > 0) {
    merged.milestones = llmData.milestones.map((milestone, index) => ({
      label: milestone.label || basePlan.milestones[index]?.label || "Milestone",
      projectedDate: milestone.projectedDate || basePlan.milestones[index]?.projectedDate || monthLabelFromNow(index + 1),
      celebrationMessage: milestone.celebrationMessage || basePlan.milestones[index]?.celebrationMessage || "Nice progress.",
    }));
  }

  if (llmData?.bookRecommendation) {
    merged.bookRecommendation = {
      title: llmData.bookRecommendation.title || merged.bookRecommendation.title,
      author: llmData.bookRecommendation.author || merged.bookRecommendation.author,
      hook: llmData.bookRecommendation.hook || merged.bookRecommendation.hook,
    };
  }

  if (typeof llmData?.oneActionThisWeek === "string" && llmData.oneActionThisWeek.trim()) {
    merged.oneActionThisWeek = llmData.oneActionThisWeek.trim();
  }

  if (Array.isArray(llmData?.assumptions) && llmData.assumptions.length > 0) {
    merged.assumptions = llmData.assumptions;
  }

  return merged;
}

async function fetchLlmLanguageFields(intakeData, calcContext) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const generationInstruction = `Generate plan language fields for this Canadian user. Keep all numeric references aligned with deterministic values. Return JSON only.\n\nIntake Data:\n${JSON.stringify(intakeData)}\n\nDeterministic Context:\n${JSON.stringify(calcContext)}`;

  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const completion = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: generationInstruction },
          ...(attempt === 2
            ? [{ role: "user", content: "Retry. Output strict valid JSON only. No comments." }]
            : []),
        ],
      });

      const text = completion.choices?.[0]?.message?.content || "{}";
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      // If it's a quota error, don't retry - just return null to use fallback
      if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
        console.log("OpenAI quota exceeded in plan generation, using deterministic fallback");
        return null;
      }
    }
  }

  // For other errors, log and return null to use fallback
  console.log("LLM generation failed after retries, using deterministic fallback:", lastError?.message);
  return null;
}

async function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("llm_timeout")), ms);
    }),
  ]);
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
    const hasIncome = asNumber(intakeData.monthlyIncome, 0) > 0;
    const hasExpenses = intakeData.expenses && typeof intakeData.expenses === "object";

    if (!hasProfile || !hasIncome || !hasExpenses) {
      return NextResponse.json(
        { error: "intakeData is incomplete. profile, monthlyIncome, and expenses are required." },
        { status: 400 },
      );
    }

    const { basePlan, generated, snapshot } = buildDeterministicPlan(intakeData);
    const calcContext = {
      snapshot,
      buckets: generated.buckets,
      debtProjection: generated.debtProjection,
      accountSequence: generated.accountSequence,
      level: generated.level,
      opportunity: basePlan.opportunityCost,
    };

    try {
      const llmData = await withTimeout(fetchLlmLanguageFields(intakeData, calcContext), 15000).catch(() => null);
      const mergedPlan = llmData ? mergeLanguageFields(basePlan, llmData) : basePlan;
      
      // Record usage (actual tokens used)
      const tokensUsed = llmData ? 2500 : 0; // Only count if LLM was actually called
      recordUsage(ip, tokensUsed);
      
      return NextResponse.json(mergedPlan);
    } catch {
      // Record usage even for failed attempt (smaller token count)
      recordUsage(ip, 500);
      return NextResponse.json(basePlan);
    }
  } catch {
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

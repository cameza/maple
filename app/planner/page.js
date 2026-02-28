"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buildSnapshot, formatCurrency, generatePlan } from "../lib/agentEngine";

const CHECKLIST_ITEMS = [
  { label: "Pay stubs", sub: "Recent proof of income" },
  { label: "Debt balances", sub: "Mortgages, student loans, or credit cards" },
  { label: "Registered accounts", sub: "TFSA, RRSP, and FHSA totals" },
  { label: "CRA Notice of Assessment", sub: "Available via MyAccount" },
  { label: "Irregular assets", sub: "Properties, jewelry, or crypto" },
];

const FLOW = [
  "checklist",
  "planType",
  "intake",
  "reasoning",
  "plan",
  "comprehension",
  "confirmation",
  "checkin",
];

const REASONING_STEPS = [
  "Analyzing your income runway...",
  "Sequencing your registered accounts...",
  "Calculating opportunity cost of unused FHSA room...",
  "Optimizing TFSA vs RRSP contributions...",
  "Checking Canadian tax bracket context...",
  "Finalizing your monthly bucket split...",
  "Finalizing your personalized plan...",
];

const INTAKE_TABS = ["Profile", "Income", "Expenses", "Debts", "Accounts", "Savings"];
const PHASE_ORDER = ["profile", "income", "expenses", "debts", "accounts", "savings", "complete"];
const PHASE_META = {
  profile: { label: "Profile", prompt: "Let's start with your core profile. What is your main financial goal right now?" },
  income: { label: "Income", prompt: "Great. Next, tell me your average monthly take-home income in CAD." },
  expenses: { label: "Expenses", prompt: "Now let's map your monthly expenses. Start with your housing cost." },
  debts: { label: "Debts", prompt: "Now let's review debts. What debt should we add first (name, balance, APR, minimum payment)?" },
  accounts: { label: "Accounts", prompt: "Let's review registered accounts. Do you currently have a TFSA, RRSP, or FHSA?" },
  savings: { label: "Savings", prompt: "Last step. How much do you currently have in your emergency fund?" },
  complete: { label: "Complete", prompt: "Thanks. Intake is complete and I am preparing your plan." },
};

function mergeCollectedData(prev, incoming) {
  if (!incoming || typeof incoming !== "object") return prev;

  const merged = {
    ...prev,
    ...incoming,
    profile: {
      ...(prev.profile || {}),
      ...(incoming.profile || {}),
    },
    expenses: {
      ...(prev.expenses || {}),
      ...(incoming.expenses || {}),
    },
    accounts: {
      ...(prev.accounts || {}),
      ...(incoming.accounts || {}),
    },
  };

  if (Array.isArray(incoming.debts)) {
    merged.debts = incoming.debts;
  } else if (Array.isArray(prev.debts)) {
    merged.debts = prev.debts;
  }

  return merged;
}

export default function PlannerPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [planType, setPlanType] = useState("individual");
  const [intakeStarted, setIntakeStarted] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(6200);
  const [reasoningTick, setReasoningTick] = useState(0);
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [changeType, setChangeType] = useState("income_up");
  const [messages, setMessages] = useState([]);
  const [currentPhase, setCurrentPhase] = useState("profile");
  const [collectedData, setCollectedData] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [planData, setPlanData] = useState(() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('mapleplan_planData') || 'null'); } catch { return null; }
  });
  const [planRecordId, setPlanRecordId] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("mapleplan_planId") || "";
  });
  const [clientId, setClientId] = useState("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [intakeValidationError, setIntakeValidationError] = useState("");
  const [profileForm, setProfileForm] = useState({ goal: "", age: "", province: "", firstTimeBuyer: "" });
  const [incomeForm, setIncomeForm] = useState({ monthlyIncome: "", incomeStability: "" });
  const [expensesForm, setExpensesForm] = useState({
    housing: "",
    transport: "",
    utilities: "",
    groceries: "",
    otherFixed: "",
    discretionary: "",
  });
  const [debtForm, setDebtForm] = useState({ hasDebts: "yes", name: "", balance: "", interestRate: "", minimumPayment: "" });
  const [accountsForm, setAccountsForm] = useState({
    tfsaHas: "",
    tfsaBalance: "",
    tfsaRoom: "",
    rrspHas: "",
    rrspBalance: "",
    rrspRoom: "",
    fhsaHas: "",
    fhsaBalance: "",
    fhsaRoom: "",
  });
  const [savingsForm, setSavingsForm] = useState({ emergencyFundAmount: "", currentMonthlySavings: "" });
  const [reasoningDone, setReasoningDone] = useState(false);
  const chatEndRef = useRef(null);
  const intakeDataRef = useRef({});

  const currentStep = FLOW[stepIndex];
  const completedPhasesByKey = {
    profile: 0,
    income: 1,
    expenses: 2,
    debts: 3,
    accounts: 4,
    savings: 5,
    complete: 6,
  };
  const completedPhases = completedPhasesByKey[currentPhase] ?? 0;
  const phaseProgress = Math.max(1, Math.min(completedPhases + 1, INTAKE_TABS.length));
  const intakePct = Math.round((completedPhases / 6) * 100);

  const snapshot = useMemo(() => buildSnapshot({ planType, monthlyIncome }), [planType, monthlyIncome]);
  const plan = useMemo(() => generatePlan(snapshot), [snapshot]);
  const effectivePlan = planData || null;

  const displayedPriorities = effectivePlan?.priorities?.length
    ? effectivePlan.priorities
    : plan.actions.map((action, index) => ({
        rank: index + 1,
        action: action.title,
        reasoning: action.why,
        dollarAmount: index === 0 ? snapshot.debtExtraPayment : plan.buckets.investments,
      }));

  const currentBucketValues = effectivePlan?.buckets?.current || {
    fixed: plan.buckets.fixed,
    investments: plan.buckets.investments,
    savings: plan.buckets.savings,
    guiltFree: plan.buckets.guiltFree,
  };

  const totalBucketValue = Object.values(currentBucketValues).reduce((sum, value) => sum + Number(value || 0), 0);

  const bucketPercentages = {
    fixed: totalBucketValue > 0 ? Math.round((Number(currentBucketValues.fixed || 0) / totalBucketValue) * 100) : 0,
    investments:
      totalBucketValue > 0 ? Math.round((Number(currentBucketValues.investments || 0) / totalBucketValue) * 100) : 0,
    savings: totalBucketValue > 0 ? Math.round((Number(currentBucketValues.savings || 0) / totalBucketValue) * 100) : 0,
    guiltFree: totalBucketValue > 0 ? Math.round((Number(currentBucketValues.guiltFree || 0) / totalBucketValue) * 100) : 0,
  };

  const emergencyFundMonths = Number(effectivePlan?.emergencyFund?.currentMonths ?? snapshot.emergencyFund / Math.max(snapshot.essentialExpenses, 1));
  const debtFreeDateLabel = effectivePlan?.debtFreeDate || `in about ${plan.debtProjection.months} months`;
  const opportunityPlainLanguage = effectivePlan?.opportunityCost?.plainLanguage
    || `If you leave ${formatCurrency(Math.max(snapshot.rooms.tfsa - snapshot.currentYearTfsaContribution, 0))} of TFSA room unused this year, you can lose long-term tax-free growth.`;
  const opportunity10yr = Number(effectivePlan?.opportunityCost?.foregoingGrowth10yr || 0);
  const milestoneRows = effectivePlan?.milestones || [];
  const assumptions = effectivePlan?.assumptions || plan.assumptions;
  const weeklyAction = effectivePlan?.oneActionThisWeek || "Pick one transfer amount you can sustain and schedule it this week.";
  const bookRecommendation = effectivePlan?.bookRecommendation || null;
  const currentPhasePosition = Math.max(0, PHASE_ORDER.indexOf(currentPhase));

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const goToNextIntakePhase = () => {
    const nextPhase = PHASE_ORDER[currentPhasePosition + 1] || "complete";
    setCurrentPhase(nextPhase);
  };

  const goToPreviousIntakePhase = () => {
    const previousPhase = PHASE_ORDER[Math.max(0, currentPhasePosition - 1)] || "profile";
    setCurrentPhase(previousPhase);
  };

  const handleStructuredPhaseSubmit = () => {
    setIntakeValidationError("");

    if (currentPhase === "profile") {
      const age = toNumber(profileForm.age);
      if (!profileForm.goal.trim() || !age || age <= 0 || !profileForm.province.trim() || !profileForm.firstTimeBuyer) {
        setIntakeValidationError("Please complete goal, age, province, and homebuyer status before continuing.");
        return;
      }

      setCollectedData((prev) => mergeCollectedData(prev, {
        profile: {
          ...(prev.profile || {}),
          goal: profileForm.goal.trim(),
          age,
          province: profileForm.province.trim(),
          firstTimeBuyer: profileForm.firstTimeBuyer === "yes",
          planType,
        },
      }));
      goToNextIntakePhase();
      return;
    }

    if (currentPhase === "income") {
      const income = toNumber(incomeForm.monthlyIncome);
      if (!income || income <= 0 || !incomeForm.incomeStability) {
        setIntakeValidationError("Please enter monthly income and select income stability.");
        return;
      }

      setMonthlyIncome(income);
      setCollectedData((prev) => mergeCollectedData(prev, {
        monthlyIncome: income,
        incomeStability: incomeForm.incomeStability,
      }));
      goToNextIntakePhase();
      return;
    }

    if (currentPhase === "expenses") {
      const values = Object.fromEntries(Object.entries(expensesForm).map(([key, value]) => [key, toNumber(value)]));
      const hasInvalid = Object.values(values).some((value) => value === null || value < 0);
      if (hasInvalid) {
        setIntakeValidationError("Please enter valid non-negative CAD amounts for all expense fields.");
        return;
      }

      setCollectedData((prev) => mergeCollectedData(prev, { expenses: values }));
      goToNextIntakePhase();
      return;
    }

    if (currentPhase === "debts") {
      if (debtForm.hasDebts === "no") {
        setCollectedData((prev) => mergeCollectedData(prev, { debts: [] }));
        goToNextIntakePhase();
        return;
      }

      const balance = toNumber(debtForm.balance);
      const interestRate = toNumber(debtForm.interestRate);
      const minimumPayment = toNumber(debtForm.minimumPayment);
      if (!debtForm.name.trim() || balance === null || interestRate === null || minimumPayment === null || balance < 0 || interestRate < 0 || minimumPayment < 0) {
        setIntakeValidationError("Add debt name, balance, APR, and minimum payment to continue.");
        return;
      }

      setCollectedData((prev) => mergeCollectedData(prev, {
        debts: [
          {
            name: debtForm.name.trim(),
            balance,
            interestRate,
            minimumPayment,
          },
        ],
      }));
      goToNextIntakePhase();
      return;
    }

    if (currentPhase === "accounts") {
      const accountFields = [
        accountsForm.tfsaHas,
        accountsForm.rrspHas,
        accountsForm.fhsaHas,
        accountsForm.tfsaBalance,
        accountsForm.tfsaRoom,
        accountsForm.rrspBalance,
        accountsForm.rrspRoom,
        accountsForm.fhsaBalance,
        accountsForm.fhsaRoom,
      ];
      if (accountFields.some((value) => value === "")) {
        setIntakeValidationError("Please complete all TFSA, RRSP, and FHSA fields.");
        return;
      }

      const parsed = {
        tfsaBalance: toNumber(accountsForm.tfsaBalance),
        tfsaRoom: toNumber(accountsForm.tfsaRoom),
        rrspBalance: toNumber(accountsForm.rrspBalance),
        rrspRoom: toNumber(accountsForm.rrspRoom),
        fhsaBalance: toNumber(accountsForm.fhsaBalance),
        fhsaRoom: toNumber(accountsForm.fhsaRoom),
      };

      if (Object.values(parsed).some((value) => value === null || value < 0)) {
        setIntakeValidationError("Use valid non-negative amounts for balances and contribution room.");
        return;
      }

      setCollectedData((prev) => mergeCollectedData(prev, {
        accounts: {
          tfsa: { hasAccount: accountsForm.tfsaHas === "yes", balance: parsed.tfsaBalance, roomAvailable: parsed.tfsaRoom },
          rrsp: { hasAccount: accountsForm.rrspHas === "yes", balance: parsed.rrspBalance, roomAvailable: parsed.rrspRoom },
          fhsa: { hasAccount: accountsForm.fhsaHas === "yes", balance: parsed.fhsaBalance, roomAvailable: parsed.fhsaRoom },
        },
      }));
      goToNextIntakePhase();
      return;
    }

    if (currentPhase === "savings") {
      const emergencyFundAmount = toNumber(savingsForm.emergencyFundAmount);
      const currentMonthlySavings = toNumber(savingsForm.currentMonthlySavings);
      if (emergencyFundAmount === null || currentMonthlySavings === null || emergencyFundAmount < 0 || currentMonthlySavings < 0) {
        setIntakeValidationError("Please enter valid non-negative savings amounts.");
        return;
      }

      setCollectedData((prev) => mergeCollectedData(prev, {
        emergencyFundAmount,
        currentMonthlySavings,
      }));
      setCurrentPhase("complete");
    }
  };

  const requestPlanGeneration = async () => {
    setIsGeneratingPlan(true);
    setGenerationError("");

    const payload = {
      ...intakeDataRef.current,
      profile: {
        ...(intakeDataRef.current.profile || {}),
        planType,
      },
      monthlyIncome,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("plan_generation_timeout"), 15000);

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ intakeData: payload }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error || "Failed to generate plan.");
      }

      const generatedPlan = await response.json();
      setPlanData(generatedPlan);
      try { localStorage.setItem('mapleplan_planData', JSON.stringify(generatedPlan)); } catch {}

      try {
        const saveRes = await fetch("/api/plan/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            intakeData: payload,
            planData: generatedPlan,
          }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          const id = saved?.id || "";
          if (id) {
            setPlanRecordId(id);
            try { localStorage.setItem("mapleplan_planId", id); } catch {}
          }
        }
      } catch {
        // Non-blocking persistence fallback. Local storage remains source of truth in prototype mode.
      }

      setGenerationError("");
    } catch (error) {
      if (error?.name === "AbortError") {
        setGenerationError("Plan generation timed out after 15 seconds. Retry to continue.");
      } else {
        setGenerationError(error?.message || "Plan generation failed. Retry to continue.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGeneratingPlan(false);
    }
  };

  const handleChatSubmit = async (rawMessage) => {
    const text = (rawMessage ?? chatInput).trim();
    if (!text || isLoading || currentPhase === "complete") return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setIsLoading(true);
    setMessages(nextMessages);
    setChatInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          currentPhase,
          collectedData,
          helperMode: true,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const helperMessage = payload?.message || "I can help explain any field in this section. Ask a specific question and I will keep it tied to your current form.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: helperMessage,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I hit a temporary issue. Ask again and I will explain the current section fields in plain language.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep !== "reasoning") return;
    setReasoningTick(0);
    setReasoningDone(false);

    const interval = setInterval(() => {
      setReasoningTick((tick) => tick + 1);
    }, 1200);

    const doneTimeout = setTimeout(() => {
      setReasoningDone(true);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(doneTimeout);
    };
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== "reasoning") return;
    requestPlanGeneration();
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== "reasoning") return;
    if (!reasoningDone || isGeneratingPlan) return;
    if (generationError && !planData) return;
    setStepIndex(FLOW.indexOf("plan"));
  }, [currentStep, generationError, isGeneratingPlan, planData, reasoningDone]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let localId = localStorage.getItem("mapleplan_client_id") || "";
    if (!localId) {
      localId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mp-${Date.now()}`;
      localStorage.setItem("mapleplan_client_id", localId);
    }
    setClientId(localId);
  }, []);

  useEffect(() => {
    if (currentStep !== "plan") return;
    if (planData || !planRecordId) return;

    let cancelled = false;
    const loadSavedPlan = async () => {
      try {
        const response = await fetch(`/api/plan/${planRecordId}`);
        if (!response.ok) return;
        const saved = await response.json();
        if (!cancelled && saved?.planData) {
          setPlanData(saved.planData);
          try { localStorage.setItem("mapleplan_planData", JSON.stringify(saved.planData)); } catch {}
        }
      } catch {
        // Local storage fallback already exists.
      }
    };

    loadSavedPlan();
    return () => {
      cancelled = true;
    };
  }, [currentStep, planData, planRecordId]);

  useEffect(() => {
    if (!intakeStarted) return;
    if (currentStep === "checklist" || currentStep === "planType") {
      setStepIndex(FLOW.indexOf(intakeComplete ? "reasoning" : "intake"));
    }
  }, [currentStep, intakeComplete, intakeStarted]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    intakeDataRef.current = collectedData;
  }, [collectedData]);

  useEffect(() => {
    if (currentStep === "intake" && currentPhase === "complete") {
      setIntakeComplete(true);
      setIntakeStarted(true);
      intakeDataRef.current = collectedData;
      setStepIndex(FLOW.indexOf("reasoning"));
    }
  }, [collectedData, currentPhase, currentStep]);

  const comprehensionScore = Object.values(answers).filter((value) => value === "correct").length;
  const totalAnswered = Object.values(answers).filter(Boolean).length;
  const comprehensionReady = totalAnswered === 3 && comprehensionScore >= 2;

  const bucketColors = [
    { key: "fixed", color: "#C8A15B", label: "Fixed" },
    { key: "investments", color: "#1A1A1A", label: "Investments" },
    { key: "savings", color: "#94A3B8", label: "Savings" },
    { key: "guiltFree", color: "#D1D5DB", label: "Guilt-Free" },
  ];

  const renderChatMessageContent = (message) => {
    if (message.role === "user") {
      return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }

    try {
      const parsed = JSON.parse(message.content);
      const hasStructuredFields = parsed && typeof parsed === "object"
        && (
          parsed.summary
          || parsed.buckets
          || parsed.debtPayoff
          || parsed.accounts
          || parsed.nextSteps
          || Array.isArray(parsed.priorities)
          || parsed.opportunityCost
          || Array.isArray(parsed.milestones)
          || parsed.bookRecommendation
          || parsed.oneActionThisWeek
        );

      if (!hasStructuredFields) {
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
      }

      return (
        <div className="space-y-4 text-sm">
          {parsed.summary && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-900">Your Financial Plan</p>
              <p className="text-amber-800 mt-1">{parsed.summary}</p>
            </div>
          )}

          {parsed.buckets && typeof parsed.buckets === "object" && (
            <div>
              <p className="font-semibold text-gray-700 mb-2">Monthly Allocation</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(parsed.buckets).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500 capitalize">{key}</p>
                    <p className="font-bold text-gray-800">${value?.amount || 0}/mo</p>
                    <p className="text-xs text-gray-500">{value?.label || ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.debtPayoff && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="font-semibold text-red-800">Debt Payoff</p>
              <p className="text-red-700 text-xs mt-1">{parsed.debtPayoff.strategy}</p>
              <p className="text-red-600 text-xs">
                Payoff in: <strong>{parsed.debtPayoff.monthsToPayoff} months</strong>
              </p>
            </div>
          )}

          {Array.isArray(parsed.accounts) && (
            <div>
              <p className="font-semibold text-gray-700 mb-2">Account Priorities</p>
              {parsed.accounts.map((account, i) => (
                <div key={`${account.type || "account"}-${i}`} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-700">{account.type}</span>
                  <span className="text-xs text-gray-500">${account.monthlyContribution || 0}/mo</span>
                </div>
              ))}
            </div>
          )}

          {Array.isArray(parsed.nextSteps) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-900">Your Next Steps</p>
              <p className="text-xs text-blue-700 mb-2 italic">AI recommends. You decide and execute.</p>
              <ol className="space-y-1">
                {parsed.nextSteps.map((step, i) => (
                  <li key={`next-step-${i}`} className="text-xs text-blue-800 flex gap-2">
                    <span className="font-bold">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {Array.isArray(parsed.priorities) && parsed.priorities.length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 mb-2">Top Priorities</p>
              <div className="space-y-2">
                {parsed.priorities.map((item, i) => (
                  <div key={`priority-${i}`} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Priority {item.rank || i + 1}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{item.action}</p>
                    <p className="text-xs text-slate-600 mt-1">{item.reasoning}</p>
                    {typeof item.dollarAmount !== "undefined" && (
                      <p className="text-xs text-slate-500 mt-1">Suggested amount: ${item.dollarAmount}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.opportunityCost?.plainLanguage && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="font-semibold text-indigo-900">Opportunity Cost</p>
              <p className="text-xs text-indigo-800 mt-1">{parsed.opportunityCost.plainLanguage}</p>
            </div>
          )}

          {Array.isArray(parsed.milestones) && parsed.milestones.length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 mb-2">Milestones</p>
              <ul className="space-y-2">
                {parsed.milestones.map((milestone, i) => (
                  <li key={`milestone-${i}`} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-emerald-800">{milestone.label}</p>
                    <p className="text-xs text-emerald-700 mt-1">Target: {milestone.projectedDate}</p>
                    <p className="text-xs text-emerald-700">{milestone.celebrationMessage}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.bookRecommendation?.title && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <p className="font-semibold text-violet-900">Book Recommendation</p>
              <p className="text-xs text-violet-800 mt-1">{parsed.bookRecommendation.title} by {parsed.bookRecommendation.author}</p>
              <p className="text-xs text-violet-700">{parsed.bookRecommendation.hook}</p>
            </div>
          )}

          {parsed.oneActionThisWeek && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-900">One action this week</p>
              <p className="text-xs text-blue-800 mt-1">{parsed.oneActionThisWeek}</p>
              <p className="text-xs text-blue-700 mt-2 italic">AI recommends. You decide and execute.</p>
            </div>
          )}
        </div>
      );
    } catch {
      return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light text-slate-900">
      {/* Reasoning step is full-screen dark, no header/nav */}
      {currentStep === "reasoning" ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center" style={{ backgroundColor: "#221d10" }}>
          {/* Animated circle */}
          <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full blur-[80px] animate-pulse-slow" style={{ backgroundColor: "rgba(197, 160, 89, 0.2)" }} />
            <div className="relative animate-float">
              <div className="absolute -inset-4 border-[0.5px] rounded-full animate-spin-slow" style={{ borderColor: "rgba(197, 160, 89, 0.3)" }} />
              <div className="w-32 h-32 rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #C5A059, #fde68a, #C5A059)" }}>
                <div className="w-24 h-24 border-2 border-white/30 rounded-full flex items-center justify-center">
                  <span className="text-white/80 text-4xl italic serif-title">w</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-2 w-8 h-8 glass rounded-full flex items-center justify-center shadow-lg">
                <div className="w-4 h-4 rounded-full opacity-60" style={{ backgroundColor: "#C5A059" }} />
              </div>
              <div className="absolute -bottom-8 -left-4 w-12 h-12 glass rounded-full flex items-center justify-center shadow-lg">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: "rgba(197, 160, 89, 0.4)" }} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl italic serif-title leading-tight" style={{ color: "#ecb613" }}>
              Building your <br /> financial future
            </h2>
            <div className="h-12 relative flex items-center justify-center overflow-hidden">
              <p key={reasoningTick} className="reasoning-step text-sm font-medium tracking-wide uppercase" style={{ color: "#C5A059" }}>
                {REASONING_STEPS[reasoningTick % REASONING_STEPS.length]}
              </p>
            </div>
          </div>

          <div className="mt-24 w-48 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min((reasoningTick + 1) * 18, 100)}%`, backgroundColor: "#ecb613" }}
            />
          </div>

          <div className="fixed bottom-8 left-0 right-0 px-6">
            {generationError ? (
              <div className="max-w-xs mx-auto text-center space-y-3">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{generationError}</p>
                <button
                  className="btn-primary w-full"
                  onClick={requestPlanGeneration}
                  disabled={isGeneratingPlan}
                >
                  Retry plan generation
                </button>
              </div>
            ) : (
              <p className="text-center text-xs max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
                This takes a moment. We are applying deterministic projections for debt payoff, account room, and cash flow so you can review and decide.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          {currentStep === "plan" ? (
            <header className="sticky top-0 z-50 px-6 flex justify-between items-center py-4 bg-background-light/80 backdrop-blur-md border-b border-slate-100">
              <button className="p-2 -ml-2" onClick={() => setStepIndex(FLOW.indexOf("intake"))}>
                <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
              </button>
              <h1 className="text-xl font-semibold tracking-tight">Your Plan</h1>
              <Link
                href={planRecordId ? `/planner/plan?id=${planRecordId}` : "/planner/plan"}
                className="p-2 -mr-2"
                aria-label="Open saved plan page"
              >
                <span className="material-symbols-outlined text-2xl">open_in_new</span>
              </Link>
            </header>
          ) : (
            <header className="sticky top-0 z-50 bg-background-light/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: "#ecb613" }}>
                  <span className="material-symbols-outlined text-xl leading-none" style={{ color: "#221d10" }}>account_balance_wallet</span>
                </div>
                <span className="font-bold text-lg tracking-tight">MaplePlan</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 rounded-full transition-colors hover:bg-slate-100">
                  <span className="material-symbols-outlined">notifications</span>
                </button>
                <button className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: "rgba(236, 182, 19, 0.2)", border: "1px solid rgba(236, 182, 19, 0.3)" }}>
                  <span className="material-symbols-outlined" style={{ color: "#ecb613" }}>person</span>
                </button>
              </div>
            </header>
          )}

          <main className="flex-1 max-w-md mx-auto w-full px-6 pb-24">

            {/* ─── CHECKLIST (screen3) ─── */}
            {currentStep === "checklist" && (
              <div className="min-h-[80vh] flex flex-col pt-8 pb-10 relative">
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                  <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px]" style={{ backgroundColor: "rgba(255, 213, 0, 0.05)" }} />
                  <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px]" style={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }} />
                </div>

                {/* Overview explainer */}
                <div className="mb-8">
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#C5A059" }}>
                    Financial Planning Agent
                  </span>
                  <h1 className="text-2xl font-bold mt-2 text-slate-900">
                    Your personalized Canadian financial plan
                  </h1>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Answer a few questions about your income, expenses, debts, and accounts. The AI builds a step-by-step action plan tailored to your situation — prioritized so you always know what to do next.
                  </p>
                </div>

                {/* How it works */}
                <div className="mb-8 space-y-3">
                  {[
                    { step: "1", icon: "chat_bubble", title: "Tell us about your finances", desc: "Income, expenses, debts, and registered accounts (TFSA, RRSP, FHSA)" },
                    { step: "2", icon: "psychology", title: "AI builds your plan", desc: "Priorities across debt payoff, emergency fund, and account contributions" },
                    { step: "3", icon: "checklist", title: "You review and decide", desc: "Every action needs your approval — the AI advises, you execute" },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: "rgba(197, 160, 89, 0.15)", color: "#C5A059" }}>
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* What you'll get */}
                <div className="mb-8 p-4 rounded-xl border" style={{ backgroundColor: "rgba(197, 160, 89, 0.06)", borderColor: "rgba(197, 160, 89, 0.25)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#C5A059" }}>What you will receive</p>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    <li>📊 Your financial level (1–5) with next milestone</li>
                    <li>💸 Debt payoff timeline with interest savings</li>
                    <li>🏦 Account contribution order (FHSA → TFSA → RRSP)</li>
                    <li>📅 Monthly action checklist you execute yourself</li>
                    <li>📚 One book recommendation matched to your stage</li>
                  </ul>
                </div>

                <header className="mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-60">Before you start</span>
                    <button className="p-2 -mr-2">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight tracking-tight mb-3">
                    Have these handy
                  </h2>
                  <p className="text-base opacity-70 leading-relaxed font-light">
                    To give you the most accurate plan, it helps to have these items ready before we start.
                  </p>
                </header>

                <div className="flex-grow space-y-4">
                  {CHECKLIST_ITEMS.map((item) => (
                    <label key={item.label} className="group flex items-center p-5 bg-white rounded-2xl border border-black/5 ios-shadow active:scale-[0.98] transition-all cursor-pointer">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" className="peer h-6 w-6 border-2 border-primary/20 rounded-full bg-transparent checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-colors" />
                        <span className="material-symbols-outlined absolute text-white text-sm opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">check</span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-[17px]">{item.label}</h3>
                        <p className="text-sm opacity-50">{item.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <footer className="mt-12 sticky bottom-0 bg-background-light/80 backdrop-blur-md pb-6 pt-4">
                  <button
                    className="w-full bg-primary py-5 px-6 rounded-full font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                    style={{ color: "#221d10" }}
                    onClick={() => setStepIndex(stepIndex + 1)}
                  >
                    <span>I&apos;m Ready</span>
                    <span className="material-symbols-outlined text-xl">arrow_forward</span>
                  </button>
                  <p className="text-center mt-6 text-sm opacity-40 font-medium">
                    You can also add these later during the session.
                  </p>
                </footer>
              </div>
            )}

            {/* ─── PLAN TYPE (screen7) ─── */}
            {currentStep === "planType" && (
              <div className="min-h-[80vh] flex flex-col pt-12 pb-10">
                <header className="mb-10">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Before intake</p>
                  <h1 className="text-4xl leading-tight font-semibold mt-3">Who is this plan for?</h1>
                  <p className="text-slate-600 mt-4 leading-relaxed">
                    Choose a plan type first. This changes account sequencing and action priorities.
                  </p>
                </header>

                <div className="space-y-4 flex-1">
                  <button
                    className={`w-full text-left p-6 rounded-2xl bg-white shadow-sm transition-all ${
                      planType === "individual" ? "border-2 border-primary" : "border border-slate-200"
                    }`}
                    onClick={() => setPlanType("individual")}
                  >
                    <p className={`text-sm uppercase tracking-wider font-semibold ${planType === "individual" ? "text-primary" : "text-slate-500"}`}>Individual</p>
                    <h2 className="text-xl font-semibold mt-1">My personal plan</h2>
                    <p className="text-sm text-slate-600 mt-2">One income profile. One set of accounts. One action roadmap.</p>
                  </button>

                  <button
                    className={`w-full text-left p-6 rounded-2xl bg-white transition-all ${
                      planType === "household" ? "border-2 border-primary shadow-sm" : "border border-slate-200"
                    }`}
                    onClick={() => setPlanType("household")}
                  >
                    <p className={`text-sm uppercase tracking-wider font-semibold ${planType === "household" ? "text-primary" : "text-slate-500"}`}>Household</p>
                    <h2 className="text-xl font-semibold mt-1">My household plan</h2>
                    <p className="text-sm text-slate-600 mt-2">Combined cash flow and spouse-aware account prioritization.</p>
                  </button>
                </div>

                <footer className="mt-8">
                  <button
                    className="w-full btn-secondary py-4 text-lg"
                    onClick={() => {
                      setIntakeStarted(true);
                      setCollectedData((prev) => ({
                        ...prev,
                        profile: { ...(prev.profile || {}), planType },
                      }));
                      setStepIndex(stepIndex + 1);
                    }}
                  >
                    Continue to intake
                  </button>
                  <p className="text-xs text-slate-500 mt-4 text-center">
                    You can switch this later from check-in if your situation changes.
                  </p>
                </footer>
              </div>
            )}

            {/* ─── INTAKE (screen4) ─── */}
            {currentStep === "intake" && (
              <div className="h-[calc(100dvh-11rem)] min-h-0 flex flex-col">
                {/* Progress header */}
                <div className="shrink-0 pt-6 pb-4 bg-background-light">
                  <div className="flex items-center justify-between mb-4">
                    <button className="p-2 -ml-2 text-slate-500 hover:text-slate-800" onClick={() => setStepIndex(stepIndex - 1)}>
                      <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Step {Math.min(phaseProgress, 6)} of 6 · {intakePct}% complete</span>
                      <h1 className="text-sm font-semibold">{PHASE_META[currentPhase]?.label || "Intake"}</h1>
                    </div>
                    <button className="p-2 -mr-2 text-slate-500 hover:text-slate-800">
                      <span className="material-symbols-outlined">help_outline</span>
                    </button>
                  </div>
                  <div className="flex gap-1.5 h-1">
                    {INTAKE_TABS.map((tab, index) => (
                      <div key={tab} className={`flex-1 rounded-full transition-colors duration-300 ${index < phaseProgress ? "bg-primary" : "bg-slate-200"}`} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 px-0.5">
                    {INTAKE_TABS.map((tab, i) => (
                      <span key={tab} className={`text-[9px] font-bold uppercase tracking-tight ${i < phaseProgress ? "text-primary" : "text-slate-400"}`}>
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Intake content */}
                <div className="flex-1 min-h-0 overflow-y-auto py-5 space-y-5">
                  <section className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">{PHASE_META[currentPhase]?.label || "Intake"}</p>
                      <h3 className="text-base font-semibold mt-1">Enter this section in one pass</h3>
                    </div>

                    {currentPhase === "profile" && (
                      <div className="space-y-3">
                        <input value={profileForm.goal} onChange={(e) => setProfileForm((prev) => ({ ...prev, goal: e.target.value }))} placeholder="Main financial goal" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                        <input value={profileForm.age} onChange={(e) => setProfileForm((prev) => ({ ...prev, age: e.target.value }))} placeholder="Age" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                        <input value={profileForm.province} onChange={(e) => setProfileForm((prev) => ({ ...prev, province: e.target.value }))} placeholder="Province (e.g., Ontario)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setProfileForm((prev) => ({ ...prev, firstTimeBuyer: "yes" }))} className={`rounded-xl border px-3 py-2 text-sm ${profileForm.firstTimeBuyer === "yes" ? "border-primary text-primary" : "border-slate-200 text-slate-600"}`}>First-time buyer: Yes</button>
                          <button type="button" onClick={() => setProfileForm((prev) => ({ ...prev, firstTimeBuyer: "no" }))} className={`rounded-xl border px-3 py-2 text-sm ${profileForm.firstTimeBuyer === "no" ? "border-primary text-primary" : "border-slate-200 text-slate-600"}`}>First-time buyer: No</button>
                        </div>
                      </div>
                    )}

                    {currentPhase === "income" && (
                      <div className="space-y-3">
                        <input value={incomeForm.monthlyIncome} onChange={(e) => setIncomeForm((prev) => ({ ...prev, monthlyIncome: e.target.value }))} placeholder="Monthly take-home income (CAD)" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                        <select value={incomeForm.incomeStability} onChange={(e) => setIncomeForm((prev) => ({ ...prev, incomeStability: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white">
                          <option value="">Income stability</option>
                          <option value="stable">Stable</option>
                          <option value="variable">Variable</option>
                          <option value="at-risk">At risk</option>
                        </select>
                      </div>
                    )}

                    {currentPhase === "expenses" && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["housing", "Housing"],
                          ["transport", "Transport"],
                          ["utilities", "Utilities"],
                          ["groceries", "Groceries"],
                          ["otherFixed", "Other fixed"],
                          ["discretionary", "Discretionary"],
                        ].map(([key, label]) => (
                          <input
                            key={key}
                            value={expensesForm[key]}
                            onChange={(e) => setExpensesForm((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`${label} (CAD)`}
                            type="number"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                          />
                        ))}
                      </div>
                    )}

                    {currentPhase === "debts" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setDebtForm((prev) => ({ ...prev, hasDebts: "yes" }))} className={`rounded-xl border px-3 py-2 text-sm ${debtForm.hasDebts === "yes" ? "border-primary text-primary" : "border-slate-200 text-slate-600"}`}>I have debt</button>
                          <button type="button" onClick={() => setDebtForm((prev) => ({ ...prev, hasDebts: "no" }))} className={`rounded-xl border px-3 py-2 text-sm ${debtForm.hasDebts === "no" ? "border-primary text-primary" : "border-slate-200 text-slate-600"}`}>No debt</button>
                        </div>
                        {debtForm.hasDebts === "yes" && (
                          <div className="grid grid-cols-2 gap-2">
                            <input value={debtForm.name} onChange={(e) => setDebtForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Debt name" className="col-span-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                            <input value={debtForm.balance} onChange={(e) => setDebtForm((prev) => ({ ...prev, balance: e.target.value }))} placeholder="Balance" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                            <input value={debtForm.interestRate} onChange={(e) => setDebtForm((prev) => ({ ...prev, interestRate: e.target.value }))} placeholder="APR %" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                            <input value={debtForm.minimumPayment} onChange={(e) => setDebtForm((prev) => ({ ...prev, minimumPayment: e.target.value }))} placeholder="Minimum payment" type="number" className="col-span-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                          </div>
                        )}
                      </div>
                    )}

                    {currentPhase === "accounts" && (
                      <div className="space-y-3">
                        {[
                          ["TFSA", "tfsa"],
                          ["RRSP", "rrsp"],
                          ["FHSA", "fhsa"],
                        ].map(([label, key]) => (
                          <div key={key} className="border border-slate-100 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                            <div className="grid grid-cols-3 gap-2">
                              <select value={accountsForm[`${key}Has`]} onChange={(e) => setAccountsForm((prev) => ({ ...prev, [`${key}Has`]: e.target.value }))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm bg-white">
                                <option value="">Has account?</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                              <input value={accountsForm[`${key}Balance`]} onChange={(e) => setAccountsForm((prev) => ({ ...prev, [`${key}Balance`]: e.target.value }))} placeholder="Balance" type="number" className="rounded-xl border border-slate-200 px-2 py-2 text-sm" />
                              <input value={accountsForm[`${key}Room`]} onChange={(e) => setAccountsForm((prev) => ({ ...prev, [`${key}Room`]: e.target.value }))} placeholder="Room" type="number" className="rounded-xl border border-slate-200 px-2 py-2 text-sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentPhase === "savings" && (
                      <div className="grid grid-cols-2 gap-2">
                        <input value={savingsForm.emergencyFundAmount} onChange={(e) => setSavingsForm((prev) => ({ ...prev, emergencyFundAmount: e.target.value }))} placeholder="Emergency fund" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                        <input value={savingsForm.currentMonthlySavings} onChange={(e) => setSavingsForm((prev) => ({ ...prev, currentMonthlySavings: e.target.value }))} placeholder="Monthly savings" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      </div>
                    )}

                    {intakeValidationError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{intakeValidationError}</p>
                    )}
                  </section>

                  {/* KB tip — accounts phase */}
                  {currentPhase === "accounts" && (
                    <div className="mt-1 mb-3 px-1 py-3 rounded-xl border border-amber-100 bg-amber-50 flex flex-col gap-1.5">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide px-1">Not sure about these accounts? Learn more:</p>
                      <div className="flex gap-2 flex-wrap px-1">
                        <a href="/learn#tfsa" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-800 underline underline-offset-2">TFSA</a>
                        <span className="text-amber-300">·</span>
                        <a href="/learn#rrsp" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-800 underline underline-offset-2">RRSP</a>
                        <span className="text-amber-300">·</span>
                        <a href="/learn#fhsa" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-800 underline underline-offset-2">FHSA</a>
                        <span className="text-amber-300">·</span>
                        <a href="/learn#account-priority" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-800 underline underline-offset-2">Priority order</a>
                      </div>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex gap-4 animate-slide-up ${message.role === "user" ? "justify-end" : ""}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-white text-sm">auto_awesome</span>
                        </div>
                      )}
                      <div className={`flex flex-col gap-1.5 ${message.role === "assistant" ? "max-w-[85%]" : "max-w-[80%] items-end"}`}>
                        <div className={`p-4 rounded-2xl border shadow-sm ${message.role === "assistant" ? "bg-white rounded-tl-none border-slate-100" : "bg-slate-900 text-white rounded-tr-none border-slate-900"}`}>
                          {renderChatMessageContent(message)}
                        </div>
                        <span className="text-[10px] text-slate-400 ml-1">Just now</span>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-4 animate-slide-up">
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-white text-sm">auto_awesome</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input footer */}
                <div className="shrink-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-background-light">
                  <p className="text-xs text-slate-500 mb-2 px-1">Ask about any field in this section</p>
                  <form className="relative group" onSubmit={(event) => {
                    event.preventDefault();
                    handleChatSubmit();
                  }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-0 rounded-2xl py-3.5 pl-4 pr-14 text-sm placeholder:text-slate-300 transition-all"
                      placeholder="Need help with this section? Ask here"
                      disabled={isLoading || currentPhase === "complete"}
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                      style={{ color: "white" }}
                      disabled={isLoading || currentPhase === "complete"}
                    >
                      <span className="material-symbols-outlined text-lg">help</span>
                    </button>
                  </form>
                  <div className="mt-3 flex justify-between items-center px-1">
                    <p className="text-xs text-slate-400">Values are in CAD</p>
                    <div className="flex gap-2">
                      <button
                        className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors px-2 py-1"
                        onClick={goToPreviousIntakePhase}
                        disabled={currentPhase === "profile" || isLoading}
                        type="button"
                      >
                        Back
                      </button>
                      <button
                        className="text-xs font-semibold text-white bg-slate-900 rounded-lg px-3 py-1.5 disabled:opacity-40"
                        onClick={handleStructuredPhaseSubmit}
                        disabled={isLoading || currentPhase === "complete"}
                        type="button"
                      >
                        {currentPhase === "savings" ? "Finish intake" : "Save and continue"}
                      </button>
                    </div>
                  </div>
                  {intakeComplete && (
                    <p className="text-xs text-slate-500 mt-3 px-2">
                      Intake complete. Moving to plan reasoning.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── PLAN (screen6) ─── */}
            {currentStep === "plan" && (
              <div className="pb-10">
                <div className="mb-10 pt-6">
                  <h2 className="text-4xl leading-tight mb-3">The 3 Actions</h2>
                  <p className="text-slate-500 text-lg font-light leading-relaxed">
                    Layer 1 of 3. Based on your goals and current numbers, these are your highest impact moves for this month.
                  </p>
                </div>

                {emergencyFundMonths < 1 && (
                  <section className="mb-8 bg-white p-6 rounded-2xl border border-amber-200">
                    <h3 className="text-lg font-semibold text-amber-700">Priority alert: Build a starter emergency fund</h3>
                    <p className="text-sm text-slate-700 mt-2">
                      You currently have {emergencyFundMonths.toFixed(1)} months of essentials saved. Before investing, build at least 1 month of buffer so one surprise expense does not derail your plan.
                    </p>
                  </section>
                )}

                <div className="space-y-4 mb-12">
                  {displayedPriorities.map((priority, index) => (
                    <div key={`${priority.rank}-${priority.action}`} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                      {index === 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />}
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${index === 0 ? "text-primary" : "text-slate-400"}`}>
                            Priority {String(priority.rank || index + 1).padStart(2, "0")}
                          </span>
                          <h3 className="text-xl font-medium leading-snug">{priority.action}</h3>
                          <p className="text-slate-500 text-sm mt-1">
                            Suggested monthly amount: {formatCurrency(Number(priority.dollarAmount || 0))}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-slate-300">expand_more</span>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="mb-12 bg-white p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-2xl serif-title">You could be debt-free by {debtFreeDateLabel}</h3>
                </section>

                {/* Layer 2 */}
                <section className="mb-12">
                  <div className="mb-6">
                    <h3 className="text-3xl mb-2">Why these actions</h3>
                    <p className="text-slate-500 text-base font-light">Layer 2 of 3. Each action is tied to your numbers.</p>
                  </div>
                  <div className="space-y-4">
                    {displayedPriorities.map((priority, index) => (
                      <article key={`${priority.rank}-why`} className="bg-white p-5 rounded-2xl border border-slate-100">
                        <h4 className="font-semibold mb-2">Action {index + 1} reasoning</h4>
                        <p className="text-sm text-slate-600">{priority.reasoning}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mb-12 bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  <h3 className="text-2xl mb-2">What delayed contributions could cost you</h3>
                  <p className="text-slate-700 text-sm">{opportunityPlainLanguage}</p>
                  <p className="text-slate-900 font-semibold mt-3">Estimated 10-year gap: {formatCurrency(opportunity10yr)}</p>
                </section>

                {/* Layer 3: Donut chart */}
                <section className="mt-16">
                  <div className="mb-8">
                    <h3 className="text-3xl mb-2">4-Bucket Allocation</h3>
                    <p className="text-slate-500 text-base font-light">Layer 3 of 3. Full detail for your cash flow and next-level progress.</p>
                  </div>

                  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col items-center">
                    <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E5E7EB" strokeWidth="12" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#C8A15B" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="150" strokeLinecap="round" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1A1A1A" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="200" strokeLinecap="round" transform="rotate(90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#94A3B8" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="220" strokeLinecap="round" transform="rotate(200 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#D1D5DB" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="240" strokeLinecap="round" transform="rotate(280 50 50)" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xs uppercase tracking-tighter text-slate-400 font-semibold">Total Capital</span>
                        <span className="text-2xl font-bold">{formatCurrency(Number(effectivePlan?.snapshot?.monthlyIncome || snapshot.takeHomeMonthly))}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full">
                      {bucketColors.map((bucket) => (
                        <div key={bucket.key} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bucket.color }} />
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{bucket.label}</p>
                            <p className="text-lg font-medium">{bucketPercentages[bucket.key]}% ({formatCurrency(Number(currentBucketValues[bucket.key] || 0))})</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-8 bg-white p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-semibold mb-4">Your milestones</h3>
                  <ul className="space-y-3">
                    {milestoneRows.map((milestone, index) => (
                      <li key={`${milestone.label}-${index}`} className="border border-slate-100 rounded-xl p-4">
                        <p className="font-semibold">{milestone.label}</p>
                        <p className="text-sm text-slate-500">{milestone.projectedDate}</p>
                        <p className="text-sm text-slate-700 mt-1">{milestone.celebrationMessage}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                {bookRecommendation && (
                  <section className="mt-8 bg-white p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-xl font-semibold mb-2">Recommended read</h3>
                    <p className="text-sm text-slate-900 font-medium">{bookRecommendation.title} by {bookRecommendation.author}</p>
                    <p className="text-sm text-slate-600 mt-1">{bookRecommendation.hook}</p>
                  </section>
                )}

                <section className="mt-8 bg-white p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-semibold mb-2">This week&apos;s action</h3>
                  <p className="text-sm text-slate-700">{weeklyAction}</p>
                </section>

                {/* Detail and assumptions */}
                <section className="mt-8 bg-white p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-semibold mb-4">Detail and assumptions</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Debt roadmap: debt-free target is {debtFreeDateLabel}.</p>
                    <p>Emergency fund target: {Number(effectivePlan?.emergencyFund?.targetMonths || 3)} months.</p>
                    <p>Financial level: Level {Number(effectivePlan?.financialLevel?.current || plan.level.level)} ({effectivePlan?.financialLevel?.label || plan.level.name}).</p>
                    <ul className="list-disc pl-5 space-y-1 mt-3">
                      {assumptions.map((assumption) => (
                        <li key={assumption}>{assumption}</li>
                      ))}
                    </ul>
                  </div>
                </section>

                <div className="mt-12">
                  <button
                    className="w-full btn-secondary py-5 text-lg rounded-2xl"
                    onClick={() => setStepIndex(stepIndex + 1)}
                  >
                    Review and confirm my decisions
                  </button>
                  <p className="text-center text-slate-400 text-xs mt-4 leading-relaxed px-8">
                    This plan does not execute transactions. You choose each action and complete it yourself.
                  </p>
                </div>
              </div>
            )}

            {/* ─── COMPREHENSION (screen8) ─── */}
            {currentStep === "comprehension" && (
              <div className="min-h-[80vh] flex flex-col pt-12 pb-8">
                <header>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Before confirmation</p>
                  <h1 className="text-3xl font-semibold mt-3 leading-tight">Quick comprehension check</h1>
                  <p className="text-slate-600 mt-3">
                    We want to confirm the plan is clear. These checks keep the human decision boundary explicit.
                  </p>
                </header>

                <section className="mt-8 space-y-4 flex-1">
                  <article className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="font-semibold">1) Who executes transfers or payments?</p>
                    <label className="flex items-center gap-3 mt-3">
                      <input type="radio" name="q1" className="text-primary" onChange={() => setAnswers({ ...answers, q1: "wrong" })} />
                      <span>The AI executes them after plan generation</span>
                    </label>
                    <label className="flex items-center gap-3 mt-2">
                      <input type="radio" name="q1" className="text-primary" onChange={() => setAnswers({ ...answers, q1: "correct" })} />
                      <span>I decide and execute every action myself</span>
                    </label>
                  </article>

                  <article className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="font-semibold">2) What happens if your income changes?</p>
                    <label className="flex items-center gap-3 mt-3">
                      <input type="radio" name="q2" className="text-primary" onChange={() => setAnswers({ ...answers, q2: "correct" })} />
                      <span>I run a return check-in and regenerate the plan</span>
                    </label>
                    <label className="flex items-center gap-3 mt-2">
                      <input type="radio" name="q2" className="text-primary" onChange={() => setAnswers({ ...answers, q2: "wrong" })} />
                      <span>The existing plan auto-trades between my accounts</span>
                    </label>
                  </article>

                  <article className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="font-semibold">3) Where do contribution limits come from?</p>
                    <label className="flex items-center gap-3 mt-3">
                      <input type="radio" name="q3" className="text-primary" onChange={() => setAnswers({ ...answers, q3: "correct" })} />
                      <span>My provided data, with CRA room checks before large deposits</span>
                    </label>
                    <label className="flex items-center gap-3 mt-2">
                      <input type="radio" name="q3" className="text-primary" onChange={() => setAnswers({ ...answers, q3: "wrong" })} />
                      <span>Always-real-time bank APIs in this prototype</span>
                    </label>
                  </article>
                </section>

                <footer className="pt-6">
                  <p className="text-sm text-slate-600 mb-3">
                    {totalAnswered === 3 ? `Score: ${comprehensionScore}/3` : "Answer all 3 checks to continue."}
                  </p>
                  <button
                    className={`w-full py-4 rounded-full font-semibold inline-flex justify-center ${
                      comprehensionReady
                        ? "bg-slate-900 text-white"
                        : "bg-slate-300 text-slate-500 pointer-events-none"
                    }`}
                    disabled={!comprehensionReady}
                    onClick={() => setStepIndex(stepIndex + 1)}
                  >
                    Continue to action confirmation
                  </button>
                </footer>
              </div>
            )}

            {/* ─── CONFIRMATION (screen9) ─── */}
            {currentStep === "confirmation" && (
              <div className="min-h-[80vh] flex flex-col pt-12 pb-8">
                <header>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Human approval</p>
                  <h1 className="text-3xl font-semibold mt-3 leading-tight">Confirm your next steps</h1>
                  <p className="text-slate-600 mt-3">The plan is ready. Choose what you want to do this month. Nothing executes automatically.</p>
                </header>

                <section className="mt-8 space-y-3 flex-1">
                  {displayedPriorities.map((priority, index) => (
                    <article key={`${priority.action}-${index}`} className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Action {index + 1}</p>
                      <h2 className="text-lg font-semibold mt-1">{priority.action}</h2>
                      <p className="text-sm text-slate-600 mt-2">{priority.reasoning}</p>
                    </article>
                  ))}
                </section>

                <section className="mt-5 bg-white rounded-2xl border border-slate-200 p-5">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 text-primary"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span className="text-sm text-slate-700">
                      I understand this app provides guidance only. I will choose and execute all transfers, payments, and contributions myself.
                    </span>
                  </label>
                </section>

                <footer className="pt-6">
                  <button
                    className={`w-full py-4 rounded-full font-semibold inline-flex justify-center ${
                      confirmed
                        ? "bg-slate-900 text-white"
                        : "bg-slate-300 text-slate-500 pointer-events-none"
                    }`}
                    disabled={!confirmed}
                    onClick={() => setStepIndex(stepIndex + 1)}
                  >
                    Finalize plan and set check-in
                  </button>
                </footer>
              </div>
            )}

            {/* ─── CHECK-IN (screen10) ─── */}
            {currentStep === "checkin" && (
              <div className="min-h-[80vh] flex flex-col pt-12 pb-8">
                <header>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Return check-in</p>
                  <h1 className="text-3xl font-semibold mt-3 leading-tight">Refresh your plan with new numbers</h1>
                  <p className="text-slate-600 mt-3">Update the fields that changed. We regenerate recommendations, then you decide what to execute.</p>
                </header>

                <section className="mt-8 space-y-5 flex-1">
                  <article className="bg-white rounded-2xl border border-slate-200 p-5">
                    <label className="text-sm font-semibold">Monthly take-home pay (CAD)</label>
                    <input
                      type="number"
                      value={monthlyIncome}
                      onChange={(event) => setMonthlyIncome(Number(event.target.value || 0))}
                      className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 focus:border-primary focus:ring-0 transition-colors"
                      placeholder="6200"
                    />
                  </article>

                  <article className="bg-white rounded-2xl border border-slate-200 p-5">
                    <label className="text-sm font-semibold">Recent change</label>
                    <select
                      value={changeType}
                      onChange={(event) => setChangeType(event.target.value)}
                      className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 focus:border-primary focus:ring-0 transition-colors"
                    >
                      <option value="income_up">Income increased</option>
                      <option value="income_down">Income decreased</option>
                      <option value="new_debt">New debt added</option>
                      <option value="goal_shift">Goal timeline changed</option>
                    </select>
                  </article>

                  <article className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="font-semibold">What regeneration updates</h2>
                    <ul className="list-disc pl-5 mt-3 text-sm text-slate-600 space-y-1">
                      <li>Debt payoff timeline</li>
                      <li>Account sequencing (FHSA, TFSA, RRSP)</li>
                      <li>4-bucket allocation and opportunity cost estimates</li>
                    </ul>
                  </article>
                </section>

                <footer className="pt-6 space-y-3">
                  <button
                    className="w-full bg-slate-900 text-white py-4 rounded-full font-semibold"
                    onClick={() => setStepIndex(FLOW.indexOf("plan"))}
                  >
                    View my plan again
                  </button>
                  <button
                    className="w-full btn-secondary py-4 text-base"
                    onClick={() => {
                      setConfirmed(false);
                      setAnswers({ q1: "", q2: "", q3: "" });
                      setStepIndex(FLOW.indexOf("reasoning"));
                    }}
                  >
                    Regenerate plan with these updates
                  </button>
                  <Link
                    href="/"
                    className="w-full inline-flex justify-center bg-slate-200 text-slate-700 py-4 rounded-full font-semibold"
                  >
                    Return to home
                  </Link>
                </footer>
              </div>
            )}
          </main>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 py-2">
            <div className="flex justify-around">
              <Link href="/" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">home</span>
                <span className="text-xs">Home</span>
              </Link>
              <Link href="/planner" className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10">
                <span className="material-symbols-outlined text-primary">analytics</span>
                <span className="text-xs text-primary">Planner</span>
              </Link>
              <Link href="/learn" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">auto_stories</span>
                <span className="text-xs">Learn</span>
              </Link>
              <Link href="/profile" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">person</span>
                <span className="text-xs">Profile</span>
              </Link>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

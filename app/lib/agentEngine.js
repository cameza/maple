const MONTHS_IN_YEAR = 12;

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateBucketAllocation(takeHomeMonthly, fixedCostsMonthly) {
  const fixed = fixedCostsMonthly || takeHomeMonthly * 0.55;
  const fixedRatio = fixed / takeHomeMonthly;

  const investmentsRatio = 0.1;
  const savingsRatio = fixedRatio > 0.6 ? 0.05 : 0.1;
  const guiltFreeRatio = Math.max(0, 1 - fixedRatio - investmentsRatio - savingsRatio);

  return {
    fixed: round2(fixed),
    investments: round2(takeHomeMonthly * investmentsRatio),
    savings: round2(takeHomeMonthly * savingsRatio),
    guiltFree: round2(takeHomeMonthly * guiltFreeRatio),
    ratios: {
      fixed: round2(fixedRatio * 100),
      investments: round2(investmentsRatio * 100),
      savings: round2(savingsRatio * 100),
      guiltFree: round2(guiltFreeRatio * 100),
    },
  };
}

export function projectDebtPayoff(debts, monthlyExtraPayment, strategy) {
  const working = debts
    .map((debt) => ({ ...debt, balance: Number(debt.balance) }))
    .filter((debt) => debt.balance > 0);

  if (working.length === 0) {
    return { months: 0, totalInterest: 0, strategy, order: [] };
  }

  let months = 0;
  let totalInterest = 0;
  const payoffOrder = [];

  while (working.some((debt) => debt.balance > 0) && months < 1200) {
    months += 1;

    for (const debt of working) {
      if (debt.balance <= 0) continue;
      const monthlyRate = debt.apr / 100 / MONTHS_IN_YEAR;
      const interest = debt.balance * monthlyRate;
      debt.balance += interest;
      totalInterest += interest;
    }

    for (const debt of working) {
      if (debt.balance <= 0) continue;
      const payment = Math.min(debt.minimum, debt.balance);
      debt.balance -= payment;
    }

    const candidates = working.filter((debt) => debt.balance > 0);
    if (candidates.length === 0) break;

    candidates.sort((left, right) => {
      if (strategy === "snowball") return left.balance - right.balance;
      return right.apr - left.apr;
    });

    const target = candidates[0];
    const extra = Math.min(monthlyExtraPayment, target.balance);
    target.balance -= extra;

    for (const debt of working) {
      if (debt.balance <= 0 && !payoffOrder.includes(debt.name)) {
        payoffOrder.push(debt.name);
      }
    }
  }

  return {
    months,
    totalInterest: round2(totalInterest),
    strategy,
    order: payoffOrder,
  };
}

export function estimateOpportunityCost(annualContribution, annualReturnRate, years) {
  const r = annualReturnRate;
  const n = years;
  if (r === 0) return round2(annualContribution * n);
  const fv = annualContribution * (((1 + r) ** n - 1) / r);
  return round2(fv);
}

export function chooseAccountSequence(snapshot) {
  const sequence = [];

  if (snapshot.hasHighInterestDebt) {
    sequence.push("High-interest debt payoff");
  }

  if (snapshot.firstTimeHomeBuyer && snapshot.rooms.fhsa > 0) {
    sequence.push("FHSA");
  }

  if (snapshot.highTaxBracket) {
    sequence.push("RRSP");
    sequence.push("TFSA");
  } else {
    sequence.push("TFSA");
    sequence.push("RRSP");
  }

  return Array.from(new Set(sequence));
}

export function classifyFinancialLevel(snapshot) {
  const hasHighDebt = snapshot.debts.some((debt) => debt.apr >= 15 && debt.balance > 0);
  const emergencyMonths = snapshot.emergencyFund / Math.max(snapshot.essentialExpenses, 1);

  if (emergencyMonths < 1 || hasHighDebt) {
    return {
      level: 1,
      name: "Foundation",
      next: "Reach a $1,000 emergency buffer and reduce high-interest debt.",
    };
  }

  if (emergencyMonths < 3) {
    return {
      level: 2,
      name: "Stability",
      next: "Build emergency savings to 3 months of essentials.",
    };
  }

  return {
    level: 3,
    name: "Momentum",
    next: "Keep debt declining and increase registered contributions.",
  };
}

export function generatePlan(snapshot) {
  const buckets = calculateBucketAllocation(snapshot.takeHomeMonthly, snapshot.fixedCostsMonthly);
  const debtStrategy = snapshot.prefersQuickWins ? "snowball" : "avalanche";
  const debtProjection = projectDebtPayoff(snapshot.debts, snapshot.debtExtraPayment, debtStrategy);
  const accountSequence = chooseAccountSequence(snapshot);
  const level = classifyFinancialLevel(snapshot);
  const hasDebt = snapshot.debts.some((debt) => Number(debt.balance) > 0);

  const annualUnusedTfsa = Math.max(snapshot.rooms.tfsa - snapshot.currentYearTfsaContribution, 0);
  const opportunity = estimateOpportunityCost(Math.min(annualUnusedTfsa, 6000), 0.05, 20);

  const action1Amount = Math.min(snapshot.debtExtraPayment, Math.max(buckets.savings, 150));
  const firstAccount = accountSequence.find((item) => ["FHSA", "TFSA", "RRSP"].includes(item)) || "TFSA";
  const action2Amount = Math.min(snapshot.rooms[firstAccount.toLowerCase()], Math.max(200, Math.round(buckets.investments)));
  const topDebt = [...snapshot.debts]
    .filter((debt) => Number(debt.balance) > 0)
    .sort((left, right) => Number(right.apr) - Number(left.apr))[0];

  const actions = [
    hasDebt
      ? {
          title: `Set ${formatCurrency(action1Amount)}/month toward highest-interest debt`,
          why: `Your debt payoff model using ${debtStrategy} clears debt in about ${debtProjection.months} months and avoids extra interest drag.`,
        }
      : {
          title: `Build your emergency fund with ${formatCurrency(Math.max(200, Math.round(buckets.savings)))}/month`,
          why: "Without high-interest debt, your next priority is stability: build at least 3 months of essential expenses.",
        },
    {
      title: `Contribute ${formatCurrency(action2Amount)}/month to ${firstAccount}`,
      why: `Your account order is ${accountSequence.join(" -> ")} based on home-buyer status, tax profile, and debt costs.`,
    },
    {
      title: `Keep fixed costs near ${buckets.ratios.fixed}% and protect ${formatCurrency(Math.round(buckets.guiltFree))} for guilt-free spending`,
      why: "This keeps your plan sustainable while preserving savings discipline and reducing dropout risk.",
    },
  ];

  let oneActionThisWeek = `Schedule a ${formatCurrency(Math.max(100, Math.round(buckets.savings)))} transfer for your next payday.`;
  if (hasDebt && topDebt) {
    oneActionThisWeek = `Set up a ${formatCurrency(Math.round(action1Amount))} pre-authorized payment to your ${topDebt.name} before your next payday.`;
  } else if (firstAccount) {
    oneActionThisWeek = `Schedule a ${formatCurrency(Math.round(action2Amount))} transfer to your ${firstAccount} before your next payday.`;
  }

  return {
    actions,
    debtProjection,
    accountSequence,
    level,
    buckets,
    opportunity,
    oneActionThisWeek,
    assumptions: [
      "All values are in CAD and based on your latest entries.",
      "Contribution room should be verified in CRA My Account before large deposits.",
      "You choose if and when to execute each action.",
    ],
  };
}

export function buildSnapshot({ planType = "individual", monthlyIncome = 6200, prefersQuickWins = false }) {
  const multiplier = planType === "household" ? 1.7 : 1;

  return {
    planType,
    takeHomeMonthly: round2(monthlyIncome * multiplier),
    fixedCostsMonthly: round2(3400 * multiplier),
    essentialExpenses: round2(2800 * multiplier),
    emergencyFund: round2(1200 * multiplier),
    debts: [
      { name: "Credit card", balance: round2(4800 * multiplier), apr: 19.99, minimum: 140 },
      { name: "Student loan", balance: round2(14500 * multiplier), apr: 5.95, minimum: 180 },
    ],
    debtExtraPayment: round2(350 * multiplier),
    hasHighInterestDebt: true,
    prefersQuickWins,
    firstTimeHomeBuyer: true,
    highTaxBracket: monthlyIncome >= 7000,
    rooms: {
      tfsa: 18000,
      rrsp: 12000,
      fhsa: 8000,
    },
    currentYearTfsaContribution: 2500,
  };
}

export function buildSnapshotFromIntake(intakeData = {}) {
  const planType = intakeData?.profile?.planType || "individual";

  const monthlyIncome = Number(intakeData?.monthlyIncome) || 0;
  const expenses = intakeData?.expenses || {};
  const fixedCostsMonthly =
    Number(expenses.housing || 0) +
    Number(expenses.transport || 0) +
    Number(expenses.utilities || 0) +
    Number(expenses.groceries || 0) +
    Number(expenses.otherFixed || 0);

  const discretionary = Number(expenses.discretionary || 0);
  const essentialExpenses =
    Number(expenses.housing || 0) +
    Number(expenses.transport || 0) +
    Number(expenses.utilities || 0) +
    Number(expenses.groceries || 0) +
    Number(expenses.otherFixed || 0);

  const debts = Array.isArray(intakeData?.debts)
    ? intakeData.debts.map((debt, index) => ({
        name: debt?.name || `Debt ${index + 1}`,
        balance: round2(Number(debt?.balance) || 0),
        apr: Number(debt?.interestRate) || Number(debt?.apr) || 0,
        minimum: round2(Number(debt?.minimumPayment) || Number(debt?.minimum) || 0),
      }))
    : [];

  const debtMinimums = debts.reduce((sum, debt) => sum + debt.minimum, 0);
  const netAfterExpenses = Math.max(0, monthlyIncome - fixedCostsMonthly - discretionary - debtMinimums);
  const debtExtraPayment = round2(Math.max(0, Math.min(netAfterExpenses * 0.6, monthlyIncome * 0.2)));

  return {
    planType,
    takeHomeMonthly: round2(monthlyIncome),
    fixedCostsMonthly: round2(fixedCostsMonthly + debtMinimums),
    essentialExpenses: round2(essentialExpenses),
    emergencyFund: round2(Number(intakeData?.emergencyFundAmount) || 0),
    debts: debts.map((debt) => ({
      ...debt,
      balance: round2(debt.balance),
      minimum: round2(debt.minimum),
    })),
    debtExtraPayment: round2(debtExtraPayment),
    hasHighInterestDebt: debts.some((debt) => debt.apr >= 15 && debt.balance > 0),
    prefersQuickWins: false,
    firstTimeHomeBuyer: Boolean(intakeData?.profile?.firstTimeBuyer),
    highTaxBracket: monthlyIncome >= 7000,
    rooms: {
      tfsa: Number(intakeData?.accounts?.tfsa?.roomAvailable) || 0,
      rrsp: Number(intakeData?.accounts?.rrsp?.roomAvailable) || 0,
      fhsa: Number(intakeData?.accounts?.fhsa?.roomAvailable) || 0,
    },
    accounts: {
      tfsa: {
        hasAccount: Boolean(intakeData?.accounts?.tfsa?.hasAccount),
        balance: Number(intakeData?.accounts?.tfsa?.balance) || 0,
      },
      rrsp: {
        hasAccount: Boolean(intakeData?.accounts?.rrsp?.hasAccount),
        balance: Number(intakeData?.accounts?.rrsp?.balance) || 0,
      },
      fhsa: {
        hasAccount: Boolean(intakeData?.accounts?.fhsa?.hasAccount),
        balance: Number(intakeData?.accounts?.fhsa?.balance) || 0,
      },
    },
    currentYearTfsaContribution: 0,
  };
}

(function () {
  const MONTHS_IN_YEAR = 12;

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function calculateBucketAllocation(takeHomeMonthly, fixedCostsMonthly) {
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

  function projectDebtPayoff(debts, monthlyExtraPayment, strategy) {
    const working = debts
      .map((d) => ({ ...d, balance: Number(d.balance) }))
      .filter((d) => d.balance > 0);

    if (working.length === 0) {
      return { months: 0, totalInterest: 0, strategy, order: [] };
    }

    let months = 0;
    let totalInterest = 0;
    const payoffOrder = [];

    while (working.some((d) => d.balance > 0) && months < 1200) {
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

      const candidates = working.filter((d) => d.balance > 0);
      if (candidates.length === 0) break;

      candidates.sort((a, b) => {
        if (strategy === "snowball") return a.balance - b.balance;
        return b.apr - a.apr;
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

  function estimateOpportunityCost(annualContribution, annualReturnRate, years) {
    const r = annualReturnRate;
    const n = years;
    if (r === 0) return round2(annualContribution * n);
    const fv = annualContribution * (((1 + r) ** n - 1) / r);
    return round2(fv);
  }

  function chooseAccountSequence(snapshot) {
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

  function classifyFinancialLevel(snapshot) {
    const highDebt = snapshot.debts.some((d) => d.apr >= 15 && d.balance > 0);
    const emergencyMonths = snapshot.emergencyFund / snapshot.essentialExpenses;

    if (emergencyMonths < 1 || highDebt) {
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

  function generatePlan(snapshot) {
    const buckets = calculateBucketAllocation(snapshot.takeHomeMonthly, snapshot.fixedCostsMonthly);
    const debtStrategy = snapshot.prefersQuickWins ? "snowball" : "avalanche";
    const debtProjection = projectDebtPayoff(snapshot.debts, snapshot.debtExtraPayment, debtStrategy);
    const accountSequence = chooseAccountSequence(snapshot);
    const level = classifyFinancialLevel(snapshot);

    const annualUnusedTfsa = Math.max(snapshot.rooms.tfsa - snapshot.currentYearTfsaContribution, 0);
    const opportunity = estimateOpportunityCost(Math.min(annualUnusedTfsa, 6000), 0.05, 20);

    const action1Amount = Math.min(snapshot.debtExtraPayment, Math.max(buckets.savings, 150));
    const firstAccount = accountSequence.find((a) => ["FHSA", "TFSA", "RRSP"].includes(a)) || "TFSA";
    const action2Amount = Math.min(snapshot.rooms[firstAccount.toLowerCase()], Math.max(200, Math.round(buckets.investments)));

    const actions = [
      {
        title: `Set ${formatCurrency(action1Amount)}/month toward highest-interest debt`,
        why: `Your debt payoff model using ${debtStrategy} clears debt in about ${debtProjection.months} months and avoids extra interest drag.`,
      },
      {
        title: `Contribute ${formatCurrency(action2Amount)}/month to ${firstAccount}`,
        why: `Your account order is ${accountSequence.join(" -> ")} based on home-buyer status, tax profile, and debt costs.`,
      },
      {
        title: `Keep fixed costs near ${buckets.ratios.fixed}% and protect ${formatCurrency(Math.round(buckets.guiltFree))} for guilt-free spending`,
        why: `This keeps your plan sustainable while preserving savings discipline and reducing dropout risk.`,
      },
    ];

    return {
      actions,
      debtProjection,
      accountSequence,
      level,
      buckets,
      opportunity,
      assumptions: [
        "All values are in CAD and based on your latest entries.",
        "Contribution room should be verified in CRA My Account before large deposits.",
        "You choose if and when to execute each action.",
      ],
    };
  }

  function buildSnapshotFromStorage() {
    const monthlyIncome = Number(localStorage.getItem("ws_monthly_income") || 6200);
    const planType = localStorage.getItem("ws_plan_type") || "individual";

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
      prefersQuickWins: false,
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

  window.MaplePlanEngine = {
    formatCurrency,
    calculateBucketAllocation,
    projectDebtPayoff,
    estimateOpportunityCost,
    chooseAccountSequence,
    classifyFinancialLevel,
    generatePlan,
    buildSnapshotFromStorage,
  };
})();

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../../lib/systemPrompt";
// import { checkUsageLimit, recordUsage, getIP } from "../../lib/usageLimiter";

const PHASE_SEQUENCE = ["profile", "income", "expenses", "debts", "accounts", "savings", "complete"];

function getNextPhase(currentPhase) {
  const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === PHASE_SEQUENCE.length - 1) {
    return "complete";
  }
  return PHASE_SEQUENCE[currentIndex + 1];
}

function parsePhaseMarker(text) {
  const markerPattern = /\{\s*"phaseComplete"\s*:\s*true[\s\S]*?\}\s*$/;
  const match = text.match(markerPattern);

  if (!match) {
    return { displayMessage: text.trim(), marker: null };
  }

  const markerRaw = match[0].trim();
  const displayMessage = text.replace(markerPattern, "").trim();

  try {
    const marker = JSON.parse(markerRaw);
    return { displayMessage, marker };
  } catch {
    return { displayMessage: text.trim(), marker: null };
  }
}

function fallbackMessage(currentPhase) {
  const prompts = {
    profile: "To personalize your plan, what is your main financial goal right now?",
    income: "To size your monthly plan, what is your average take-home income in CAD?",
    expenses: "To calculate your cash flow, what do you spend monthly on housing?",
    debts: "To build your debt roadmap, what debt should we add first with balance, APR, and minimum payment?",
    accounts: "To prioritize your account sequence, do you currently have a TFSA, RRSP, or FHSA?",
    savings: "To set your safety buffer target, how much is currently in your emergency fund?",
  };

  return prompts[currentPhase] || "Thanks. What would you like to update next?";
}

function parseBoolean(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (["yes", "y", "true", "1"].some((token) => lower.includes(token))) return true;
  if (["no", "n", "false", "0"].some((token) => lower.includes(token))) return false;
  return null;
}

function parseFirstNumber(text) {
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function parseAllNumbers(text) {
  if (!text) return [];
  return (text.replace(/,/g, "").match(/-?\d+(\.\d+)?/g) || [])
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

function nextFallbackStep(currentPhase, collectedData, latestUserText) {
  const text = (latestUserText || "").trim();
  const lower = text.toLowerCase();
  const nextData = { ...collectedData };

  if (currentPhase === "profile") {
    nextData.profile = nextData.profile || {};
    if (!nextData.profile.goal && text) {
      nextData.profile.goal = text;
      return {
        message: "Thanks. Your age helps tune priorities and timelines. How old are you?",
        phase: "profile",
        phaseComplete: false,
        collectedData: nextData,
      };
    }

    if ((nextData.profile.age ?? 0) <= 0) {
      const age = parseFirstNumber(text);
      if (age && age > 0) {
        nextData.profile.age = age;
        return {
          message: "Got it. Province matters for tax context. Which province do you live in?",
          phase: "profile",
          phaseComplete: false,
          collectedData: nextData,
        };
      }
      return {
        message: "To move forward, share your age in years.",
        phase: "profile",
        phaseComplete: false,
        collectedData: nextData,
      };
    }

    if (!nextData.profile.province && text) {
      nextData.profile.province = text;
      return {
        message: "Thanks. Homebuyer status affects FHSA and HBP planning. Are you a first-time home buyer?",
        phase: "profile",
        phaseComplete: false,
        collectedData: nextData,
      };
    }

    if (typeof nextData.profile.firstTimeBuyer !== "boolean") {
      const firstTimeBuyer = parseBoolean(text);
      if (typeof firstTimeBuyer === "boolean") {
        nextData.profile.firstTimeBuyer = firstTimeBuyer;
        // If planType already set from the plan-type screen, skip asking again
        if (nextData.profile.planType) {
          return {
            message: "Profile complete. Income sets your monthly allocation baseline. What is your monthly take-home income in CAD?",
            phase: "income",
            phaseComplete: true,
            collectedData: nextData,
          };
        }
        return {
          message: "Last profile input. Is this plan for an individual or a household?",
          phase: "profile",
          phaseComplete: false,
          collectedData: nextData,
        };
      }
      return {
        message: "Please answer yes or no for first-time home buyer status.",
        phase: "profile",
        phaseComplete: false,
        collectedData: nextData,
      };
    }

    if (!nextData.profile.planType) {
      const planType = lower.includes("house") ? "household" : "individual";
      nextData.profile.planType = planType;
    }

    return {
      message: "Profile complete. Income sets your monthly allocation baseline. What is your monthly take-home income in CAD?",
      phase: "income",
      phaseComplete: true,
      collectedData: nextData,
    };
  }

  if (currentPhase === "income") {
    if (!nextData.monthlyIncome) {
      const income = parseFirstNumber(text);
      if (income && income > 0) {
        nextData.monthlyIncome = income;
        return {
          message: "Thanks. Income stability changes risk planning. Is your income stable, variable, or at-risk?",
          phase: "income",
          phaseComplete: false,
          collectedData: nextData,
        };
      }
      return {
        message: "Share your monthly take-home income as a number in CAD.",
        phase: "income",
        phaseComplete: false,
        collectedData: nextData,
      };
    }

    if (!nextData.incomeStability) {
      if (lower.includes("at")) nextData.incomeStability = "at-risk";
      else if (lower.includes("var")) nextData.incomeStability = "variable";
      else nextData.incomeStability = "stable";
    }

    return {
      message:
        "Income phase complete. Expenses drive your fixed-cost ratio. Share 6 monthly amounts in this order: housing, transport, utilities, groceries, other fixed, discretionary.",
      phase: "expenses",
      phaseComplete: true,
      collectedData: nextData,
    };
  }

  if (currentPhase === "expenses") {
    const values = parseAllNumbers(text);
    if (values.length >= 6) {
      nextData.expenses = {
        housing: values[0],
        transport: values[1],
        utilities: values[2],
        groceries: values[3],
        otherFixed: values[4],
        discretionary: values[5],
      };
      return {
        message:
          "Expenses complete. Debt interest rates set payoff priority. Add one debt with name, balance, APR, and minimum payment, or type 'none'.",
        phase: "debts",
        phaseComplete: true,
        collectedData: nextData,
      };
    }

    return {
      message:
        "Please provide 6 numbers for monthly expenses in this order: housing, transport, utilities, groceries, other fixed, discretionary.",
      phase: "expenses",
      phaseComplete: false,
      collectedData: nextData,
    };
  }

  if (currentPhase === "debts") {
    if (lower.includes("none")) {
      nextData.debts = [];
      return {
        message:
          "No debts recorded. Account phase now. For each account (TFSA RRSP FHSA), share hasAccount, balance, room as 9 numbers in that order.",
        phase: "accounts",
        phaseComplete: true,
        collectedData: nextData,
      };
    }

    const numbers = parseAllNumbers(text);
    const debtName = text.split(",")[0]?.trim() || "Debt";
    if (numbers.length >= 3) {
      nextData.debts = [
        {
          name: debtName,
          balance: numbers[0],
          interestRate: numbers[1],
          minimumPayment: numbers[2],
        },
      ];
      return {
        message:
          "Debt phase complete. For each account (TFSA RRSP FHSA), share hasAccount, balance, room as 9 numbers in that order.",
        phase: "accounts",
        phaseComplete: true,
        collectedData: nextData,
      };
    }

    return {
      message: "Share debt as: name, balance, APR, minimum payment. Example: Credit card, 4800, 19.99, 140.",
      phase: "debts",
      phaseComplete: false,
      collectedData: nextData,
    };
  }

  if (currentPhase === "accounts") {
    const values = parseAllNumbers(text);
    if (values.length >= 9) {
      nextData.accounts = {
        tfsa: { hasAccount: values[0] > 0, balance: values[1], roomAvailable: values[2] },
        rrsp: { hasAccount: values[3] > 0, balance: values[4], roomAvailable: values[5] },
        fhsa: { hasAccount: values[6] > 0, balance: values[7], roomAvailable: values[8] },
      };
      return {
        message: "Accounts complete. Share emergency fund amount and current monthly savings as two numbers.",
        phase: "savings",
        phaseComplete: true,
        collectedData: nextData,
      };
    }

    return {
      message: "Please provide 9 numbers: TFSA(has,balance,room), RRSP(has,balance,room), FHSA(has,balance,room).",
      phase: "accounts",
      phaseComplete: false,
      collectedData: nextData,
    };
  }

  if (currentPhase === "savings") {
    const values = parseAllNumbers(text);
    if (values.length >= 2) {
      nextData.emergencyFundAmount = values[0];
      nextData.currentMonthlySavings = values[1];
      return {
        message: "Savings complete. Intake is done and your plan is ready for generation.",
        phase: "complete",
        phaseComplete: true,
        collectedData: nextData,
      };
    }

    return {
      message: "Please share 2 numbers: emergency fund amount and current monthly savings.",
      phase: "savings",
      phaseComplete: false,
      collectedData: nextData,
    };
  }

  return {
    message: "Intake is complete. Generating your plan now.",
    phase: "complete",
    phaseComplete: true,
    collectedData: nextData,
  };
}

export async function POST(request) {
  let currentPhase = "profile";
  let collectedData = {};
  let messages = [];

  try {
    const body = await request.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    currentPhase = body?.currentPhase || "profile";
    collectedData = body?.collectedData && typeof body.collectedData === "object" ? body.collectedData : {};

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
    }

    const phaseInstruction = `You are currently in PHASE: ${currentPhase}. Data collected so far: ${JSON.stringify(collectedData)}. Continue collecting required fields for this phase.`;

    // Check if OpenAI API key is available or has quota issues
    if (!process.env.OPENAI_API_KEY) {
      const latestUserText = messages.filter((item) => item.role === "user").at(-1)?.content || "";
      const fallback = nextFallbackStep(currentPhase, collectedData, latestUserText);
      return NextResponse.json(fallback);
    }

    // Try OpenAI API with quota handling and 1 retry on first user message
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const userMessageCount = messages.filter((item) => item.role === "user").length;
      const maxAttempts = userMessageCount === 1 ? 2 : 1;

      let completion = null;
      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 600,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "system", content: phaseInstruction },
              ...messages,
            ],
          });
          break;
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }

      if (!completion) {
        throw lastError || new Error("OpenAI chat completion failed");
      }

      const rawText = completion.choices?.[0]?.message?.content?.trim() || "";
      const { displayMessage, marker } = parsePhaseMarker(rawText);
      const latestUserText = messages.filter((item) => item.role === "user").at(-1)?.content || "";
      const deterministic = nextFallbackStep(currentPhase, collectedData, latestUserText);

      const responsePhase = marker?.phaseComplete
        ? getNextPhase(currentPhase)
        : (deterministic?.phase || currentPhase);

      const responseCollectedData = marker?.data || deterministic?.collectedData || collectedData;
      const responsePhaseComplete = typeof marker?.phaseComplete === "boolean"
        ? Boolean(marker.phaseComplete)
        : Boolean(deterministic?.phaseComplete);
      const responseMessage = displayMessage || deterministic?.message || fallbackMessage(currentPhase);

      return NextResponse.json({
        message: responseMessage,
        phase: responsePhase,
        phaseComplete: responsePhaseComplete,
        collectedData: responseCollectedData,
      });
    } catch (openaiError) {
      // Handle OpenAI quota errors gracefully
      if (openaiError.code === 'insufficient_quota' || openaiError.type === 'insufficient_quota') {
        console.log("OpenAI quota exceeded, using fallback mode");
        const latestUserText = messages.filter((item) => item.role === "user").at(-1)?.content || "";
        const fallback = nextFallbackStep(currentPhase, collectedData, latestUserText);
        return NextResponse.json({
          ...fallback,
          usingFallback: true,
        });
      }
      throw openaiError; // Re-throw other errors
    }
  } catch (error) {
    console.error("Chat API Error:", error);
    const latestUserText = messages.filter((item) => item.role === "user").at(-1)?.content || "";
    const fallback = nextFallbackStep(currentPhase, collectedData, latestUserText);
    return NextResponse.json(
      fallback,
      { status: 200 },
    );
  }
}

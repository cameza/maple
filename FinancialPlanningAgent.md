# Project Idea: AI Financial Planning Agent for Canadians

## The Problem

Most Canadians manage their finances reactively and in silos. They have:
- No coherent plan for how to allocate money across competing priorities
  (debt payoff vs. investing vs. emergency fund vs. registered accounts)
- No understanding of registered accounts (TFSA, RRSP, FHSA) and how to use them optimally
- No visibility into the cost of inaction ("what am I missing out on?")
- No access to personalized financial advice — advisors are expensive and often inaccessible

The traditional "planning moment" — usually January or tax season — is when people are most
motivated but most overwhelmed. The tools that exist (spreadsheets, budgeting apps, bank
dashboards) output numbers. They do not teach, reason, or plan.

---

## The Vision (Full Scope)

The long-term vision is an **AI-native personal financial OS for Canadians** — covering:

- **Financial education:** Teaching concepts as they become relevant to the user's situation
- **Planning:** Contribution sequencing, debt payoff strategy, cash flow optimization
- **Tracking:** Expense categorization, net worth growth, registered account limits
- **Motivation:** Celebrating progress, surfacing opportunity cost, keeping users engaged

All activities in this system share a consistent design pattern:
- AI teaches, guides, forecasts, and reasons (the cognitive load)
- Humans review, decide, and execute (all financial actions require explicit approval)
- Integration is a known constraint — Canadian financial institutions have limited APIs;
  data entry is human-initiated (manual input or screenshot parsing) for the prototype

### The Financial MCP Opportunity (Separate Use Case)

A natural companion system — not in scope for this submission — is a **Financial MCP
(Model Context Protocol) layer** for Canadian banking: a standardized abstraction that makes
it easy to connect AI agents to TD, RBC, Scotiabank, Desjardins, Wealthsimple, etc.
This would be the infrastructure layer that unlocks this and many other financial AI tools.
Noting it explicitly demonstrates awareness of the broader system landscape.

---

## Submission Scope: The Planning Agent

For the Wealthsimple AI Builders submission, we focus on the **financial planning** slice.

### What the Agent Does

Given a user's financial snapshot, the agent produces a **personalized annual financial plan**
with plain-language reasoning. Specifically:

1. **Ingests the financial snapshot** (user-provided or screenshot-parsed):
   - Take-home income (monthly/annual)
   - Debts: balance, interest rate, minimum payment per debt
   - Monthly fixed expenses and discretionary spending
   - Registered account balances: TFSA, RRSP, FHSA (across all institutions)
   - Available contribution room per account

2. **Produces a prioritized plan:**
   - Contribution sequencing: which account to fill first and why (e.g., FHSA if first-time
     buyer, RRSP if high income bracket, TFSA as flexible fallback)
   - Debt payoff strategy: recommends avalanche (highest interest first) or snowball
     (smallest balance first) based on the user's psychological and financial profile,
     with a projected payoff timeline
   - Monthly cash flow target: how much goes to fixed costs, debt, savings, investments,
     and discretionary spending

3. **Explains in plain language** — not generic tips, but reasoning tied to the user's
   specific numbers and situation. Teaching concepts as they arise (e.g., "Here's why
   paying off your 19.99% credit card before contributing to your RRSP makes sense
   in your situation").

4. **Monitors and nudges over time:**
   - Flags drift from the plan
   - Surfaces opportunity cost ("You're on pace to leave $4,200 of TFSA room unused
     this year — at a 4.5% return, that's ~$189 in foregone tax-free growth")
   - Alerts when approaching registered account limits

---

## Human/AI Boundary

### What AI is responsible for:
- Synthesizing the financial snapshot into a coherent plan
- Prioritization logic and trade-off reasoning
- Plain-language explanation and financial education in context
- Ongoing monitoring and proactive nudges
- Quantifying the cost of inaction

### Where AI must stop — and why:
**The AI never executes, initiates, or recommends the execution of any financial transaction.**

Every actionable step requires explicit human approval:
- Contribution amounts and timing are always human decisions
- Investment selections within accounts remain human
- Debt payment decisions (pay extra vs. invest) require human sign-off

**Why this boundary is principled, not just cautious:**
Financial decisions are consequential, personal, and sometimes irreversible. The user's
risk tolerance, life circumstances, and values cannot be fully captured in an intake form.
A plan that is mathematically optimal may be wrong for a specific person. The AI's role
is to make the human *better informed and more capable of deciding* — not to decide for them.

---

## What the Human Can Now Do

A person with no financial background can, in a single 15-minute session:
- Understand their full financial picture for the first time
- Get a coherent, prioritized annual plan with explanations they actually understand
- Know exactly what they're leaving on the table by not using registered accounts
- Have a concrete debt payoff timeline with a projected debt-free date

Previously, this required either:
- A financial advisor ($150–$400/hour, often inaccessible)
- Years of self-education across fragmented resources
- A spreadsheet that outputs numbers but explains nothing

---

## What Would Break First at Scale

**Data quality and freshness.** The system's plan is only as good as the financial snapshot.
With stale or incomplete data, recommendations degrade and could be actively misleading.

**The root cause:** Canadian financial institutions have limited, inconsistent, and often
inaccessible APIs. There is no reliable way for third-party tools to pull real-time account
balances, contribution room, or transaction history programmatically across institutions.

**Mitigation for the prototype:** Human-in-the-loop data entry (manual input or screenshot
upload) keeps the human accountable for data accuracy and avoids dependency on fragile
integrations.

**The infrastructure fix at scale:** A Financial MCP layer for Canadian banking (see Vision
section above) — a standardized connection layer across institutions — would be the
prerequisite for this system to operate at Wealthsimple's scale.

---

## Threads

- `written-explanation/` — Draft and iterate on the 500-word submission write-up
- `demo/` — Plan, script, and record the 2–3 minute demo video
- `build/` — Actual prototype: system design, agent architecture, code

# AGENTS.md

## Mission
Build a submission-ready AI Financial Planning Agent for Canadians that turns a user financial snapshot into a personalized annual plan with plain-language reasoning.

## Submission Scope (v1)
The product scope for this repo is the planning agent only.

In scope:
- Conversational intake for structured financial data
- Plan generation with 3-layer progressive disclosure
- Debt, contribution room, cash flow, and opportunity cost calculations
- Returning user check-in and plan refresh

Out of scope:
- Live bank integrations
- Investment selection or portfolio management
- Tax filing workflows
- Mobile native app
- Financial MCP infrastructure layer

## Core Human and AI Boundary
AI responsibilities:
- Synthesize snapshot into a coherent and prioritized plan
- Explain trade-offs in plain language
- Quantify opportunity cost and proactive nudges
- Detect missing or inconsistent inputs and ask clarifying questions

AI hard limits:
- Never execute, initiate, or recommend execution of transactions
- Never present itself as replacing user judgment
- Never state legal or tax certainty

Human responsibilities:
- Provide and confirm data quality
- Approve every action
- Execute all financial steps outside the app

## Product Philosophy Guardrails
All outputs should follow these frameworks:
1. Pay Yourself First
2. 4-Bucket Allocation Framework (Fixed Costs, Investments, Savings, Guilt-Free Spending)
3. Behaviour-First Coaching (non-shaming, action-oriented)
4. Financial Levels Framework (Level 1 to Level 5 progression)

## Required Knowledge Coverage
Agent responses must be consistent with the 15 PRD concepts:
- TFSA, RRSP, FHSA, HBP
- Account funding priority order
- Pay Yourself First and 4-Bucket model
- Avalanche vs snowball debt strategy
- Minimum payment trap
- Emergency fund guidance
- Over-contribution penalties
- Compound interest and opportunity cost
- Behaviour and money psychology
- Financial Levels framework
- Federal + Ontario tax bracket context for RRSP value

## Intake Contract
Before plan generation, collect and validate:
- User profile: literacy level, plan type (individual or household)
- Income: take-home monthly, stability, optional cliff date
- Expenses: required categories
- Debts: balance, rate, minimum, interest-free status
- Irregular assets expected in 12 months
- Registered accounts per person: TFSA/RRSP/FHSA balance, room, institution
- Goals: homebuyer status, home timeline, retirement horizon

If fields are missing, AI must ask follow-up questions and avoid generating final recommendations.

## Output Contract
Every plan must include:
- Layer 1: exactly 3 plain-language actions for this month
- Layer 2: one paragraph reasoning per action tied to user numbers
- Layer 3: full detail including cash flow split, debt roadmap, account sequence, remaining contribution room, and opportunity cost

Presentation rules:
- Grade 8 readability by default
- Plain language first, then terms with short tooltips
- Quantified claims should show underlying numbers where possible

## Screen-Level Behavior Requirements
- Show prep checklist before intake
- Ask if plan is individual or household before intake
- Keep visible intake progress across Income, Expenses, Debts, Accounts, Goals
- Show a visible reasoning trace during plan generation
- Ask comprehension check after plan reveal
- Show action confirmation screen where user explicitly confirms intent
- Support returning user check-in and regeneration

## Deterministic Calculation Rule
For math-sensitive logic, use deterministic tool outputs. Do not rely on LLM free-form arithmetic for:
- Debt payoff projections
- Contribution room math
- Cash flow allocation
- Opportunity cost estimates
- Income runway modeling

## Build Workstreams and Dependency Order
Parallel start:
- Agent A: Knowledge Base
- Agent B: Conversation Script and Decision Logic
- Agent C: Output Schema and Plan Template
- Agent D: Written Explanation

Blocked by A+B+C:
- Agent E: System Prompt

Blocked by E:
- Agent F: Agent Build

Blocked by F (UI can start from C spec earlier):
- Agent G: UI / Output Renderer

Blocked by F+G:
- Agent H: Demo Video

## Quality Gate Before Any Demo or Submission Artifact
- Human/AI boundary is explicit and visible
- Recommendations are Canada-specific and internally consistent
- No transaction execution language appears
- Missing-data assumptions are stated
- Scale failure mode and mitigation are stated
- Writing is simple and avoids em dashes

## Reference Documents
- **Intake Script & Decision Logic**: Complete 7-phase conversational intake flow and decision logic framework (Notion page: https://www.notion.so/31370f73f65a8077959ae593aa0d801d)
  - Phase 1-7 intake conversation script with teaching moments
  - Decision logic for emergency fund, debt prioritization, account sequencing
  - Monthly allocation formula and Financial Levels framework

- **Schema & UI/UX**: Structured output schema and UI/UX layout specifications (Notion page: https://www.notion.so/31370f73f65a816289f7d4e025cbcc6b)
  - **Schema**: Complete JSON data model for AI agent output including user profile, financial levels, bucket allocation, debt payoff plan, registered accounts, and milestones
  - **UI/UX**: Detailed layout spec with 9 sections, design principles, interaction patterns, and key design decisions for rendering the plan interface

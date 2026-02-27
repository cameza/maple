# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MaplePlan is an AI financial planning agent for Canadians, built as a submission for the Wealthsimple AI Builders hiring challenge (deadline: March 2, 2026). It helps users generate a 3-layer personalized financial plan through a conversational intake flow.

## Commands

```bash
# Development (syncs prototype assets first, then starts Next.js)
npm run dev

# Production build
npm run build
npm run start

# Sync static prototype assets only (Stitch_Designs/ → public/prototype/)
npm run sync:prototype
```

No test suite exists. Manual testing is done by running the app and walking through the 8-step planner flow at `http://localhost:3000/planner`.

## Architecture

**Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 4

**Key routes:**
- `/` - Landing page (`app/page.js`)
- `/planner` - Main interactive planner (`app/planner/page.js`, client component)
- `/prototype/screen*.html` - Static HTML mockups (served from `public/prototype/`, sourced from `Stitch_Designs/`)

**Calculation engine (`app/lib/agentEngine.js`):** All financial math lives here as pure deterministic functions - no LLM arithmetic. Key exports: `calculateBucketAllocation`, `projectDebtPayoff`, `estimateOpportunityCost`, `chooseAccountSequence`, `classifyFinancialLevel`, `generatePlan`, `buildSnapshot`.

**Dual code path:** `app/lib/agentEngine.js` is the React/Node version; `Stitch_Designs/agent_core.js` is the IIFE-wrapped browser version for static HTML prototypes. Keep them in sync if logic changes.

**Prototype sync:** `scripts/sync-prototype.mjs` copies `Stitch_Designs/` to `public/prototype/` on each `dev` or `build`. Edit source files in `Stitch_Designs/`, not in `public/prototype/`.

**State management:** `app/planner/page.js` uses React hooks only (`useState`, `useMemo`, `useEffect`). No external state library. No backend, no database - everything is stateless and client-side.

**8-step planner flow:** `checklist` → `planType` → `intake` → `reasoning` → `plan` → `comprehension` → `confirmation` → `checkin`. Controlled by a `FLOW` array and a `stepIndex`.

**Plan output structure (3 layers):**
- Layer 1: 3 concrete actions for this month (grade 8 readability)
- Layer 2: Plain-language reasoning tied to user's actual numbers
- Layer 3: Full technical detail (debt strategy, bucket ratios, assumptions)

## Domain Constraints (carry forward from .windsurfrules)

- Keep all guidance Canada-specific: TFSA, RRSP, FHSA, HBP, CRA contribution room, Canadian tax brackets.
- Use deterministic calculators for all financial projections - never free-form LLM math.
- Keep default plan output at grade 8 readability.
- Human/AI boundary: AI explains and prioritizes; humans execute. Every actionable step is a human decision. AI never initiates transactions.
- v1 out-of-scope: live bank integrations, portfolio/investment selection, tax filing, mobile app.
- Do not use em dashes in any user-facing copy.
- When data is missing, state assumptions explicitly.
- Tie all recommendations to user's actual numbers, not generic advice.

## Key Reference Documents

- `AGENTS.md` - Agent specification, workstream plan, output contract, hard limits
- `ChallengeOverview.md` - Wealthsimple challenge requirements and submission criteria
- `FinancialPlanningAgent.md` - Product design and problem statement
- `KnowledgeBase.md` - Canadian financial concepts (TFSA, RRSP, FHSA, account priority order, debt strategy, etc.)
- `FinancialPlanningAgent.md` - PRD; if in-session guidance conflicts with docs, follow in-session user guidance

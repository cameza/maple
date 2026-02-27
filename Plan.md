# MaplePlan Day Plan -- Friday February 27, 2026

Parallel execution plan to transform the prototype from a well-designed shell into a working AI-powered financial planning agent before the March 2 hard deadline.

---

## CURRENT STATE (verified from codebase audit)

| What exists | What's missing |
|---|---|
| `app/planner/page.js` (667 lines) -- full flow: checklist, planType, intake, reasoning, plan, comprehension, confirmation, checkin | Intake collects only 1 field (`monthlyIncome`). Everything else is hardcoded mock data in `buildSnapshot()`. |
| `app/lib/agentEngine.js` -- working deterministic engine: bucket allocation, debt payoff projection, opportunity cost, account sequencing, financial level classification | No LLM integration anywhere. No OpenAI/Anthropic SDK. No API routes. No `.env.local`. |
| `app/page.js` -- home page with Financial Level widget and Knowledge Base cards | `/learn` and `/profile` pages do not exist (hard 404). Bottom nav uses `href="#"` instead of real routes. |
| `KnowledgeBase.md` -- complete 15-concept knowledge base with book references | No KB serving mechanism. Cards on home page link to `#`. |
| Good UI: comprehension check, reasoning screen, 3-layer plan, confirmation flow | Plan reasoning is generic ("Priority backed by your current monthly profile") not tied to user numbers. |
| Existing calc functions work correctly with real inputs | Emergency fund checkpoint not shown as a priority. Opportunity cost buried in fine print. No milestones. No debt-free date callout. |

**No existing**: `app/api/` directory, `app/learn/`, `app/profile/`, `.env.local`, `lib/types.js`, `lib/systemPrompt.js`

**Stack**: Next.js 15.5, React 19, TailwindCSS 4, no LLM SDK installed.

---

## TECHNICAL ARCHITECTURE (read before starting any task)

### How the LLM powers the experience

No fine-tuning. The LLM (GPT-4o) is directed via a **system prompt** injected on every API call. The system prompt contains the full knowledge base, intake script, output schema, and tone rules. It lives in one file: `app/lib/systemPrompt.js`.

### Two LLM call modes

1. **Intake mode** (`POST /api/chat`) -- conversational, one question at a time. The LLM reads conversation history + current phase, asks the next question, and emits a JSON marker when a phase is complete so the frontend can advance.
2. **Plan generation mode** (`POST /api/generate-plan`) -- structured output. Frontend sends all collected intake data. Backend runs deterministic calculations first (using existing `agentEngine.js` functions), then passes intake data + calc results to the LLM. LLM writes ONLY the plain-language fields (action labels, reasoning paragraphs, opportunity cost framing, milestone messages, book pick, one weekly action). Returns strict JSON.

### Data flow

```
User message in chat
  -> Frontend appends to messages[] + sends currentPhase + collectedData
  -> POST /api/chat
  -> API prepends SYSTEM_PROMPT + phase instruction -> GPT-4o
  -> LLM returns: chat message + optional {phaseComplete: true, data: {...}}
  -> Frontend: display message, if phaseComplete -> merge data, advance phase

All phases complete:
  -> POST /api/generate-plan with full intakeData
  -> API: run deterministic calcs (agentEngine.js) -> build calc results object
  -> API: send intakeData + calcResults to GPT-4o with plan generation instructions
  -> LLM returns: strict JSON matching PlanOutput schema
  -> Frontend: parse JSON, render plan screens with real numbers
```

### Shared state shape (intakeData)

Every agent must use this exact shape. Do not invent local variants.

```js
const intakeData = {
  // Phase 1: profile
  profile: { goal: '', age: 0, province: '', firstTimeBuyer: false, planType: 'individual' },
  // Phase 2: income
  monthlyIncome: 0,
  incomeStability: 'stable', // 'stable' | 'variable' | 'at-risk'
  // Phase 3: expenses
  expenses: { housing: 0, transport: 0, utilities: 0, groceries: 0, otherFixed: 0, discretionary: 0 },
  // Phase 4: debts
  debts: [], // [{ name, balance, interestRate, minimumPayment }]
  // Phase 5: accounts
  accounts: {
    tfsa: { hasAccount: false, balance: 0, roomAvailable: 0 },
    rrsp: { hasAccount: false, balance: 0, roomAvailable: 0 },
    fhsa: { hasAccount: false, balance: 0, roomAvailable: 0 },
  },
  // Phase 6: savings
  emergencyFundAmount: 0,
  currentMonthlySavings: 0,
}
```

### PlanOutput schema (what generate-plan returns)

```js
{
  financialLevel: { current: 1, label: 'Foundation', nextMilestone: '' },
  snapshot: { monthlyIncome: 0, totalDebt: 0, fixedCosts: 0, discretionary: 0, emergencyFundMonths: 0 },
  buckets: { current: { fixed, investments, savings, guiltFree }, target: { ... } },
  emergencyFund: { currentMonths: 0, targetMonths: 3, monthlyToContribute: 0, projectedCompleteDate: '', accountRecommendation: '' },
  debts: [{ name, balance, interestRate, minimumPayment, recommendedPayment, projectedPayoffDate, totalInterestSaved }],
  debtFreeDate: '',
  registeredAccounts: [{ type, balance, roomAvailable, recommendedMonthlyContribution, yearToMaximize }],
  opportunityCost: { unusedRoomTotal: 0, foregoingGrowth10yr: 0, plainLanguage: '' },
  monthlyAllocation: { emergencyFund, debtPayoff, fhsa, rrsp, tfsa, guiltFree },
  milestones: [{ label, projectedDate, celebrationMessage }],
  priorities: [{ rank, action, reasoning, dollarAmount }],
  bookRecommendation: { title, author, hook },
  oneActionThisWeek: '',
  assumptions: []
}
```

---

## TASK ASSIGNMENTS

### GROUP 1: Fully parallel, no dependencies between them. Start immediately.

---

### TASK A: Multi-Phase Intake UI
**Owner**: Agent A
**Deadline**: 2pm
**Files**: `app/planner/page.js` (modify the `intake` step ONLY)
**Does NOT touch**: reasoning step, plan step, comprehension, confirmation, checkin, header, nav

#### What to build

Replace the current single-question intake (lines 264-358 in `app/planner/page.js`) with a multi-phase conversational intake powered by the LLM via `/api/chat`.

#### State to add at top of PlannerPage component

```js
const [messages, setMessages] = useState([]);
const [currentPhase, setCurrentPhase] = useState('profile');
const [collectedData, setCollectedData] = useState({});
const [chatInput, setChatInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [intakeComplete, setIntakeComplete] = useState(false);
```

#### Intake UI requirements

- Show the current phase name and step number in the progress header (keep existing INTAKE_TABS layout but make it dynamic based on `currentPhase`)
- Phase mapping: profile=1, income=2, expenses=3, debts=4, accounts=5, savings=6
- Display `messages` array as chat bubbles (keep existing bubble styling: AI = dark circle + white icon, user = right-aligned)
- Text input at bottom (keep existing styling) but change from number input to text input
- On send: POST to `/api/chat` with `{ messages, currentPhase, collectedData }`
- On response: append assistant message, if `phaseComplete` then merge `collectedData` and advance phase
- When all 6 phases complete (`currentPhase === 'complete'`): auto-advance to reasoning step AND pass `collectedData` to plan generation
- Auto-scroll to bottom of chat on new messages
- Show typing indicator (3 bouncing dots) while waiting for API response
- Keep "Skip" and "I'm not sure" buttons -- when clicked, send that text as the user's message

#### How intake connects to plan generation

When intake completes, the component should:
1. Store `collectedData` in a ref or state that persists across step changes
2. During the reasoning step, fire `POST /api/generate-plan` with the full `collectedData`
3. When plan JSON comes back, store it in state and advance to the plan step
4. The plan step renders from this JSON instead of from `generatePlan(snapshot)` as it does now

#### Critical constraint
- Do NOT change the reasoning step animation (lines 84-126). It stays exactly as-is visually.
- Do NOT change comprehension, confirmation, or checkin steps.
- The plan step (lines 362-468) will be modified by Task D later. For now, keep it as-is but prepare the state (`planData`) so Task D can consume it.

---

### TASK B: System Prompt + API Routes + LLM Integration
**Owner**: Agent B
**Deadline**: 2pm
**Files to CREATE**:
- `app/lib/systemPrompt.js`
- `app/api/chat/route.js`
- `app/api/generate-plan/route.js`
- `app/api/knowledge/[slug]/route.js`
- `.env.local`

**Also modifies**: `package.json` (add `openai` dependency)

#### Step 1: Install OpenAI SDK

```bash
npm install openai
```

#### Step 2: Create `.env.local`

```
OPENAI_API_KEY=sk-...
```

(User must provide their own key. Leave a placeholder.)

#### Step 3: Create `app/lib/systemPrompt.js`

Export a single string constant `SYSTEM_PROMPT`. Contents must include:

1. **Role section**: "You are MaplePlan, an AI financial planning coach for Canadians." Include governing philosophy (Pay Yourself First, 4-Bucket Framework, behaviour-first, human decides/executes).

2. **Knowledge Base section**: Embed the full content of `KnowledgeBase.md` inline. Format each of the 15 concepts as labeled blocks. Include all 3 book references.

3. **Intake state machine section**: Define the 6 phases with exact fields to collect per phase. Rules:
   - One question per message
   - Brief WHY before asking
   - "I don't know" handling: explain how to find it, offer assumption
   - Teach account types (FHSA, RRSP, TFSA) before asking if user has one
   - When phase fields collected, append JSON marker: `{"phaseComplete": true, "phase": "X", "data": {...}}`

4. **Plan generation section**: When called with intake data + calc results, write ONLY the plain-language fields. Return raw JSON matching PlanOutput schema. No prose outside JSON.

5. **Tone rules**: Warm, direct, non-judgmental. No jargon without explanation. Celebrate what user does right. One question per message. End with the question.

#### Step 4: Create `app/api/chat/route.js`

```js
// POST handler
// 1. Read { messages, currentPhase, collectedData } from request body
// 2. Build message array: [system prompt, phase instruction, ...messages]
// 3. Call openai.chat.completions.create({ model: 'gpt-4o', messages, temperature: 0.4, max_tokens: 600 })
// 4. Parse response for phaseComplete JSON marker
// 5. Strip marker from display message
// 6. Return { message, phase, phaseComplete, collectedData }
```

Phase instruction format: "You are currently in PHASE: {phase}. Data collected so far: {JSON}. Continue collecting required fields for this phase."

Phase advancement order: profile -> income -> expenses -> debts -> accounts -> savings -> complete

#### Step 5: Create `app/api/generate-plan/route.js`

```js
// POST handler
// 1. Read intakeData from request body
// 2. Import and run deterministic calcs from agentEngine.js:
//    - buildSnapshot() using real intakeData (NOT hardcoded)
//    - generatePlan() for debt projections, bucket splits, etc.
//    - estimateOpportunityCost() for opportunity cost numbers
//    - classifyFinancialLevel() for financial level
// 3. Build a context object with all calc results
// 4. Call openai.chat.completions.create({
//      model: 'gpt-4o',
//      messages: [system prompt, plan generation instruction with calc results],
//      response_format: { type: 'json_object' },
//      temperature: 0.3,
//      max_tokens: 2000
//    })
// 5. Parse JSON response
// 6. Merge calc numbers + LLM plain-language fields into PlanOutput
// 7. Return PlanOutput JSON
```

**Critical**: The `buildSnapshot()` function in `agentEngine.js` currently takes `{ planType, monthlyIncome }` and hardcodes everything else. You need to either:
- (a) Create a new function `buildSnapshotFromIntake(intakeData)` that uses real intake data, OR
- (b) Modify `buildSnapshot` to accept the full intakeData object

Option (a) is safer -- add it to `agentEngine.js` as a new export without changing the existing function.

#### Step 6: Create `app/api/knowledge/[slug]/route.js`

Parse `KnowledgeBase.md` at build time (or read from a JS object). Each concept gets a slug:
- `tfsa`, `rrsp`, `fhsa`, `hbp`, `account-priority`, `pay-yourself-first`, `4-bucket`, `debt-avalanche-snowball`, `minimum-payment-trap`, `emergency-fund`, `over-contribution`, `compound-interest`, `behaviour-psychology`, `financial-levels`

Return: `{ title, content (markdown), readTime, bookRef? }`

#### Dependency note
Task A calls `/api/chat` and `/api/generate-plan`. Task A can scaffold the fetch calls immediately (they'll 404 until this task deploys the routes). Both tasks merge when complete.

---

### TASK C: /learn Page + /profile Page + Fix Navigation
**Owner**: Agent C
**Deadline**: 12pm (smallest task, finish first)
**Files to CREATE**: `app/learn/page.js`, `app/profile/page.js`
**Files to MODIFY**: `app/page.js` (fix nav links)

#### /learn page (`app/learn/page.js`)

Build a Knowledge Base browsing page. Content comes from `KnowledgeBase.md`.

Structure:
- Header matching existing app style (MaplePlan logo + nav)
- Page title: "Knowledge Base"
- Subtitle: "Canadian financial concepts explained in plain language."
- Grid/list of 15 concept cards, each showing: icon, title, 1-line description, read time
- Clicking a card expands it inline (accordion) or navigates to an anchor showing the full content
- For v1 demo: render the full article content inline when expanded. Do NOT require the `/api/knowledge` route -- hardcode the content from KnowledgeBase.md as a JS array in the component file
- Include the 3 book recommendations as a separate "Recommended Reading" section at the bottom
- Bottom nav bar matching home page style

Content mapping (title -> icon -> description -> readTime):
```
TFSA -> account_balance -> "Tax-free growth and flexible withdrawals" -> "4 min"
RRSP -> savings -> "Tax-deductible retirement savings" -> "4 min"
FHSA -> home -> "First-time home buyer savings" -> "4 min"
HBP -> real_estate_agent -> "Borrow from RRSP for your first home" -> "3 min"
Account Priority -> sort -> "Which account gets your next dollar" -> "5 min"
Pay Yourself First -> schedule -> "Save before you spend" -> "3 min"
4-Bucket Framework -> layers -> "Organize your cash flow" -> "6 min"
Debt Avalanche vs Snowball -> trending_down -> "Two strategies to be debt-free" -> "5 min"
Minimum Payment Trap -> warning -> "Why minimums keep you in debt" -> "4 min"
Emergency Fund -> shield -> "Your financial safety net" -> "4 min"
Over-Contribution Penalties -> gpp_bad -> "Avoid CRA penalties on registered accounts" -> "3 min"
Compound Interest -> show_chart -> "How your money grows over time" -> "4 min"
Behaviour & Money Psychology -> psychology -> "Why we make irrational money decisions" -> "5 min"
Financial Levels -> stairs -> "Your 5-level financial progression" -> "5 min"
```

#### /profile page (`app/profile/page.js`)

Simple placeholder page. Structure:
- Header matching app style
- User avatar circle (use existing gold icon style)
- Name: "Demo User"
- Email: "demo@mapleplan.ca"
- Section: "Plan Status" -- show "Active plan generated" with a green badge
- Section: "Financial Level" -- show "Level 1: Foundation" with progress bar (reuse home page widget)
- Section: "Settings" -- list items: "Notification preferences", "Export plan as PDF", "Delete my data" (all non-functional, just UI)
- Bottom nav bar
- Small footer text: "MaplePlan does not store or access your bank accounts."

#### Fix navigation in `app/page.js`

Lines 146-161: Change `href="#"` to real routes:
- Home -> `href="/"`
- Planner -> `href="/planner"` (already correct)
- Learn -> `href="/learn"`
- Profile -> `href="/profile"`

Also fix KB card links (lines 89, 92, 108, 124): Change `href="#"` to `href="/learn"` (or `href="/learn#tfsa-vs-rrsp"` etc.)

Also fix the bottom nav in `app/planner/page.js` (lines 656-661): Change `<span>` tags to `<Link>` tags with real routes.

---

### GROUP 2: Sequential, starts after Group 1 completes.

---

### TASK D: Wire LLM into Plan UI + Strengthen Plan Output
**Owner**: Agent D (can be same agent as A or B)
**Deadline**: 5pm
**Files**: `app/planner/page.js` (plan step, reasoning step wiring)
**Depends on**: Task A (intake state shape) + Task B (API routes returning real data)

#### What to build

1. **Wire reasoning step to real API call**
   - During reasoning step, fire `POST /api/generate-plan` with the collected intakeData
   - Keep the existing animation running while waiting
   - When API responds, store planData in state
   - Only advance to plan step after BOTH: animation completes (6s) AND API response received
   - If API errors, show a retry button instead of advancing

2. **Rewrite plan step to render from PlanOutput JSON**
   Replace hardcoded `plan.actions[i].title` / `plan.actions[i].why` with `planData.priorities[i].action` / `planData.priorities[i].reasoning`. These now contain LLM-written, user-specific reasoning.

3. **Add emergency fund checkpoint**
   If `planData.emergencyFund.currentMonths < 1`, show an alert card ABOVE the 3 actions:
   ```
   Priority Alert: Build a starter emergency fund
   You currently have [X] months of expenses saved. Before investing,
   build a buffer of at least 1 month ($X). This protects your plan
   from one surprise expense derailing everything.
   ```

4. **Make opportunity cost a hero card**
   Pull opportunity cost out of "Detail and assumptions" into its own prominent card:
   ```
   What delayed contributions could cost you
   [planData.opportunityCost.plainLanguage]
   Estimated 10-year gap: $[foregoingGrowth10yr]
   ```
   Style: white card with a yellow/gold left border accent (like Priority 01 card).

5. **Add debt-free date callout**
   After the 3 actions, show:
   ```
   You could be debt-free by [debtFreeDate]
   ```
   Large text, celebratory feel. Use the serif title font.

6. **Add milestones section**
   After bucket allocation, show a timeline/list of milestones:
   ```
   Your milestones
   - [milestone.label] -- [milestone.projectedDate] -- [milestone.celebrationMessage]
   ```

7. **Add "One thing to do this week"**
   At the very bottom of the plan (before the "Review and confirm" button):
   ```
   This week's action
   [planData.oneActionThisWeek]
   ```
   Card with a checkmark icon.

8. **Add book recommendation**
   Small card after milestones:
   ```
   Recommended read: [title] by [author]
   [hook]
   ```

---

## TIMELINE

| Time | Agent A (Intake UI) | Agent B (LLM + API) | Agent C (Learn/Profile/Nav) | Agent D (Plan UI) |
|---|---|---|---|---|
| 11am-12pm | Build multi-phase chat UI, state management, typing indicator | Install SDK, write systemPrompt.js, create .env.local | Build /learn page, /profile page, fix all nav links | -- blocked -- |
| 12pm-1pm | Wire fetch to /api/chat, handle phaseComplete, advance phases | Build /api/chat route, /api/generate-plan route | QA all nav paths, polish learn page content | -- blocked -- |
| 1pm-2pm | Test full intake flow end-to-end, polish edge cases | Build /api/knowledge/[slug], add buildSnapshotFromIntake, test API routes | DONE | -- blocked -- |
| 2pm-3pm | DONE | DONE | -- | Wire reasoning step to /api/generate-plan |
| 3pm-4pm | -- | -- | -- | Rewrite plan step for PlanOutput JSON, add emergency fund card, opportunity cost hero |
| 4pm-5pm | -- | -- | -- | Add debt-free date, milestones, book rec, one action this week |
| 5pm-6pm | Full integration test across all screens | -- | -- | -- |

---

## VERIFICATION CHECKLIST (before calling demo-ready)

- [ ] Intake asks 3+ phases of real questions (not just income)
- [ ] Plan reasoning mentions user's actual numbers (e.g. "your credit card at 19.99%")
- [ ] /learn loads with all 15 concepts browsable
- [ ] /profile loads with placeholder content
- [ ] No 404s on any nav link
- [ ] Emergency fund shows as Priority 1 if < 1 month saved
- [ ] Opportunity cost has its own prominent card with specific dollar figure
- [ ] Debt-free date is shown prominently
- [ ] Comprehension check still works correctly
- [ ] Human/AI boundary copy is visible on plan screen
- [ ] "This plan does not execute transactions" appears in demo flow
- [ ] One action this week appears at bottom of plan
- [ ] Book recommendation appears contextually
- [ ] Reasoning/loading screen still plays animation smoothly

---

## RISK MITIGATIONS

| Risk | Mitigation |
|---|---|
| OpenAI API key not available | Agent B should also implement a fallback mode: if no API key, use enhanced `agentEngine.js` with richer hardcoded reasoning strings. The demo must work without an API key. |
| LLM returns malformed JSON | Wrap JSON.parse in try/catch. On failure, retry once with a stricter prompt. On second failure, fall back to deterministic plan with generic reasoning. |
| Intake takes too long (user fatigue) | Allow "Quick start" button that pre-fills demo data for all phases and jumps straight to plan generation. This is also useful for demo recording. |
| Task A and B don't align on data shapes | Both use the exact `intakeData` and `PlanOutput` shapes defined in this document. No deviations. |
| Rate limits on GPT-4o | Keep temperature low (0.3-0.4), max_tokens capped (600 for chat, 2000 for plan). If rate limited, queue and retry with exponential backoff. |

---

## FILES CREATED/MODIFIED SUMMARY

| File | Created/Modified | Owner |
|---|---|---|
| `app/planner/page.js` | Modified (intake step) | Agent A, then Agent D |
| `app/lib/systemPrompt.js` | Created | Agent B |
| `app/api/chat/route.js` | Created | Agent B |
| `app/api/generate-plan/route.js` | Created | Agent B |
| `app/api/knowledge/[slug]/route.js` | Created | Agent B |
| `app/lib/agentEngine.js` | Modified (add buildSnapshotFromIntake) | Agent B |
| `.env.local` | Created | Agent B |
| `package.json` | Modified (add openai) | Agent B |
| `app/learn/page.js` | Created | Agent C |
| `app/profile/page.js` | Created | Agent C |
| `app/page.js` | Modified (fix nav links) | Agent C |

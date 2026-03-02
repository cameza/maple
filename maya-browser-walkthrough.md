# Maya Browser Walkthrough Guide

## Setup Instructions
1. Open http://localhost:3009 in your browser
2. Click "Build my free plan" to start the intake flow

## Step 1: Prep Checklist ✅
**What you'll see**: A checklist of documents to gather
- Pay stubs, Debt balances, Registered accounts, CRA Notice, Irregular assets
- **Validation**: This sets proper expectations for data gathering

## Step 2: Plan Type Selection ✅
**Maya's choice**: Individual (not household)
- **Action**: Select "Individual" and continue
- **Validation**: Branching logic for individual vs household planning

## Step 3: Profile Phase ✅
**Maya's data to enter**:
- Goal: "Buy a home in 3-4 years"
- Age: 31
- Province: Ontario
- First-time homebuyer: Yes

**Watch for**: 
- Plain language prompts
- Input validation
- Progress indicator showing 1/6 complete

## Step 4: Income Phase ✅
**Maya's data to enter**:
- Monthly take-home income: 5200
- Income stability: "Stable" (or similar option)

**Validation checks**:
- Income should be in CAD
- Stability options should be available
- Progress should show 2/6 complete

## Step 5: Expenses Phase ✅
**Maya's data to enter**:
- Housing: 1900
- Transport: 160
- Utilities: 180
- Groceries: 600
- Other fixed: 260
- Discretionary: 500

**Total fixed costs**: $3,100
**Validation**: All fields should be required and validated

## Step 6: Debts Phase ✅
**Maya's data to enter**:
- Has debts: Yes
- Name: "Credit card"
- Balance: 4800
- Interest rate: 19.99
- Minimum payment: 150

**Watch for**: 
- Debt collection interface
- Ability to add multiple debts
- APR vs interest rate clarity

## Step 7: Accounts Phase ✅
**Maya's data to enter**:
- TFSA: Has account, Balance: 6200, Room: 18500
- RRSP: Has account, Balance: 0, Room: 22000
- FHSA: No account, Balance: 0, Room: 8000

**Validation**: 
- Account type recognition
- Balance vs room distinction
- CRA verification reminders

## Step 8: Savings Phase ✅
**Maya's data to enter**:
- Emergency fund amount: 1400
- Current monthly savings: 300

**Watch for**: 
- Emergency fund definition clarity
- Current savings pattern capture

## Step 9: Reasoning Animation ✅
**What you'll see**: 
- Dark screen with animated logo
- Progress indicators showing calculation steps
- Messages like "Analyzing your income runway..."

**Validation**: 
- Visible reasoning trace
- Deterministic calculation messaging
- ~6 second animation duration

## Step 10: Plan Reveal ✅
**Maya's expected results**:
- Financial Level: Level 1 Foundation
- Priority 1: Build emergency fund ($850/month)
- Priority 2: Pay off credit card ($683/month)
- Priority 3: FHSA contributions (after debt)
- Guilt-free spending: $1,250/month

**Key validation points**:
- Plain language explanations
- "AI recommends. You decide." messaging
- Quantified claims with math
- Canada-specific account references

## Step 11: Comprehension Check ✅
**What you'll see**: 3 questions to test understanding
- Should check Maya comprehends the debt vs emergency fund trade-off
- Should confirm understanding of account sequencing
- Should verify opportunity cost awareness

## Step 12: Action Confirmation ✅
**What you'll see**: Explicit confirmation screen
- "I intend to take these actions" type messaging
- Clear human decision boundary
- Option to modify or proceed

## Real-time Validation Checklist

### Human/AI Boundary ✅
- [ ] No "do this" language
- [ ] "Consider/set up/schedule" instead of "execute/transfer"
- [ ] CRA verification warnings present
- [ ] "You decide" messaging clear

### Canadian Context ✅
- [ ] TFSA/RRSP/FHSA correctly referenced
- [ ] CAD currency throughout
- [ ] Tax bracket considerations
- [ ] First-time homebuyer status recognized

### Math Accuracy ✅
- [ ] Emergency fund months: 0.45 ($1,400 ÷ $3,100)
- [ ] Debt payoff timeline: ~7 months at $683/month
- [ ] Bucket allocation math checks out
- [ ] Opportunity cost calculation visible

### UX Flow ✅
- [ ] Progress tracking works
- [ ] Validation on each step
- [ ] Back navigation available
- [ ] No data loss on navigation

## Issues to Watch For
⚠️ **Timeline question**: Debt paid off (Oct 2026) before emergency fund complete (Jan 2027)
⚠️ **Cash flow clarity**: $2,783 allocated vs $5,200 income - remaining $2,417 not explained

## Success Indicators
✅ Maya classified as Level 1 Foundation
✅ High-interest debt prioritized
✅ Emergency fund building emphasized
✅ Home-buyer status recognized
✅ Sustainable guilt-free spending preserved
✅ Clear next steps provided

---

**Run this walkthrough and note any deviations from expected behavior. The validation report shows the backend logic is working correctly - this walkthrough confirms the frontend experience matches.**

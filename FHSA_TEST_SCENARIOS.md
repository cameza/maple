# FHSA Fix Verification Test Scenarios

## Test Scenario 1: First-Time Buyer with Unopened FHSA
**Setup:**
- Profile: First-time buyer = Yes
- FHSA: Has account = No, Balance = 0, Room = 0

**Expected Results:**
1. ✅ Educational chat message appears after submitting accounts phase
2. ✅ `fhsaEligible` = true in metrics
3. ✅ `fhsaAccountOpen` = false in metrics
4. ✅ `fhsaRoom` = 8000 (inferred) in metrics
5. ✅ Prompt includes "ACTION NEEDED: Account not yet open..." message
6. ✅ Plan includes "Open your FHSA" milestone with status "current" or "next"
7. ✅ `thisWeekAction` directs user to open the account immediately

## Test Scenario 2: Non-First-Time Buyer with Unopened FHSA
**Setup:**
- Profile: First-time buyer = No
- FHSA: Has account = No, Balance = 0, Room = 0

**Expected Results:**
1. ✅ NO educational chat message appears
2. ✅ `fhsaEligible` = false in metrics
3. ✅ NO FHSA milestone in plan
4. ✅ FHSA not mentioned in recommendations

## Test Scenario 3: First-Time Buyer with Existing FHSA
**Setup:**
- Profile: First-time buyer = Yes
- FHSA: Has account = Yes, Balance = 5000, Room = 3000

**Expected Results:**
1. ✅ NO educational chat message appears
2. ✅ `fhsaEligible` = true in metrics
3. ✅ `fhsaAccountOpen` = true in metrics
4. ✅ `fhsaRoom` = 3000 (user-provided value) in metrics
5. ✅ Prompt does NOT include "ACTION NEEDED" message
6. ✅ Plan includes "Fund FHSA" milestone (not "Open FHSA")
7. ✅ `thisWeekAction` focuses on contributing, not opening

## Test Scenario 4: First-Time Buyer with Unopened FHSA + High Debt
**Setup:**
- Profile: First-time buyer = Yes
- FHSA: Has account = No, Balance = 0, Room = 0
- Debt: Credit card $10,000 @ 19.99% APR, min $200/mo

**Expected Results:**
1. ✅ Educational chat message appears after submitting accounts phase
2. ✅ `fhsaEligible` = true in metrics
3. ✅ Plan includes "Open FHSA" milestone
4. ✅ Milestone status depends on trade-off analysis (parallel vs sequential)
5. ✅ If parallel: milestone status = "current", includes monthly contribution
6. ✅ If sequential: milestone status = "next" or "locked", contribution = 0, but thisWeekAction still says to open the account

## Verification Checklist
- [ ] Scenario 1: First-time buyer, unopened FHSA
- [ ] Scenario 2: Non-first-time buyer, unopened FHSA
- [ ] Scenario 3: First-time buyer, existing FHSA
- [ ] Scenario 4: First-time buyer, unopened FHSA + high debt

## Files Modified
1. `app/lib/generatePlan.js` - Fixed eligibility logic, inferred room, exposed metrics
2. `app/lib/planPromptTemplate.js` - Updated FHSA line with urgency message and constraint
3. `app/planner/page.js` - Added educational chat message during intake

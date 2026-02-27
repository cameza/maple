'use client';

import Link from "next/link";
import "../globals.css";

export default function LearnPage() {
  const concepts = [
    {
      id: 'tfsa',
      title: 'TFSA',
      description: 'Tax-free growth and flexible withdrawals',
      icon: 'account_balance',
      readTime: '4 min',
      content: `**Plain-language definition**
- A Tax-Free Savings Account (TFSA) is a registered account where investment growth and withdrawals are tax-free.
- You can hold cash, GICs, mutual funds, ETFs, and stocks inside it.
- You do not get a tax deduction when you contribute, but you also do not pay tax when you withdraw.

**Why it matters in a financial plan**
- TFSA is usually the most flexible account for medium and long-term goals because withdrawals are tax-free and can be re-contributed later.
- It is often the default first investing account when RRSP tax deductions are less valuable for the user.

**Key numbers / rules**
- 2026 annual TFSA contribution limit: **$7,000**.
- Lifetime TFSA room by Jan 1, 2026 for someone eligible every year since 2009 and never contributed: **$109,000**.
- Unused room carries forward forever.
- Withdrawals create new room, but that room comes back on **January 1 of the next calendar year**, not immediately.
- Over-contributions are penalized at **1% per month** on the excess amount.

**Authoritative source link**
- https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html`
    },
    {
      id: 'rrsp',
      title: 'RRSP',
      description: 'Tax-deductible retirement savings',
      icon: 'savings',
      readTime: '4 min',
      content: `**Plain-language definition**
- A Registered Retirement Savings Plan (RRSP) is a registered account designed mainly for retirement savings.
- Contributions can reduce your taxable income, which can lower your tax bill.
- Money grows tax-deferred, and withdrawals are taxed as income later.

**Why it matters in a financial plan**
- RRSP can be very powerful when your current tax bracket is high.
- The plan needs to compare "tax deduction value now" versus flexibility and future tax implications.

**Key numbers / rules**
- New annual room is generally **18% of prior-year earned income**, up to CRA yearly maximum.
- RRSP contribution deadline for tax year N is usually the **first 60 days** of year N+1.
- RRSP deduction value depends on your **marginal tax rate**. Higher bracket usually means bigger immediate tax benefit.
- By **December 31 of the year you turn 71**, RRSP must be converted (for example to RRIF or annuity) or withdrawn.

**Authoritative source link**
- https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html`
    },
    {
      id: 'fhsa',
      title: 'FHSA',
      description: 'First-time home buyer savings',
      icon: 'home',
      readTime: '4 min',
      content: `**Plain-language definition**
- The First Home Savings Account (FHSA) helps first-time home buyers save for a qualifying home.
- Contributions are tax-deductible like an RRSP, and qualified withdrawals for a home purchase are tax-free like a TFSA.
- It combines the best parts of RRSP and TFSA for eligible buyers.

**Why it matters in a financial plan**
- For eligible first-time buyers, FHSA is often top priority because it gives both deduction and tax-free qualified withdrawal.
- It can change account sequencing and speed up a down payment plan.

**Key numbers / rules**
- Annual contribution limit: **$8,000**.
- Lifetime FHSA contribution limit: **$40,000**.
- Unused room can carry forward, but only up to **$8,000** into a future year.
- Maximum room available in one year is generally **$16,000** (current year $8,000 plus up to $8,000 carry-forward).
- You can use FHSA and HBP together if eligible and if withdrawals meet each program's rules.

**Authoritative source link**
- https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html`
    },
    {
      id: 'hbp',
      title: 'HBP',
      description: 'Borrow from RRSP for your first home',
      icon: 'real_estate_agent',
      readTime: '3 min',
      content: `**Plain-language definition**
- The Home Buyers' Plan (HBP) lets eligible first-time buyers withdraw money from their RRSP to buy or build a qualifying home.
- You do not pay tax at withdrawal if you follow HBP rules.
- You must repay the withdrawn amount back to your RRSP over time.

**Why it matters in a financial plan**
- HBP can increase available down payment funds, but it creates a future repayment obligation.
- The plan must include repayment cash flow so users do not accidentally create extra taxable income later.

**Key numbers / rules**
- Current withdrawal limit is **$60,000 per person** for eligible withdrawals after April 16, 2024.
- Older limit was **$35,000** under prior rules.
- Standard repayment period is **15 years**.
- Annual required repayment is generally **1/15** of the withdrawn amount.
- If you do not repay the required amount in a year, the shortfall is added to taxable income.

**Authoritative source link**
- https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/home-buyers-plan.html`
    },
    {
      id: 'account-priority',
      title: 'Account Priority',
      description: 'Which account gets your next dollar',
      icon: 'sort',
      readTime: '5 min',
      content: `**Plain-language definition**
- Priority order means deciding which registered account gets your next dollar first.
- There is no universal order for everyone. It depends on home-buying status, tax bracket, flexibility needs, and debt.

**Why it matters in a financial plan**
- The same contribution amount can produce very different outcomes depending on account order.
- Correct sequencing improves after-tax growth and keeps money usable for near-term goals.

**Key numbers / rules**
- Typical base order when eligible to buy first home: **FHSA first**, then RRSP or TFSA depending on tax bracket and flexibility needs.
- RRSP tends to gain priority when user is in a higher marginal tax bracket and expects a lower bracket later.
- TFSA is often flexible default when income is lower, cash flow is uncertain, or near-term access is needed.
- High-interest debt (for example credit card near 20% APR) usually outranks long-term investing contributions.

**Authoritative source link**
- https://www.canada.ca/en/services/finance/personalfin.html`
    },
    {
      id: 'pay-yourself-first',
      title: 'Pay Yourself First',
      description: 'Save before you spend',
      icon: 'schedule',
      readTime: '3 min',
      content: `**Plain-language definition**
- Pay Yourself First means you save or invest at the start of each pay cycle, not just whatever is left at month end.
- It turns saving into a default habit instead of a willpower decision.

**Why it matters in a financial plan**
- This rule improves consistency, which is usually more important than perfect optimization.
- It reduces the chance that all surplus is absorbed by lifestyle spending.

**Key numbers / rules**
- Operational rule in this agent: allocate savings and investing targets before guilt-free spending.
- Start with a realistic fixed amount or percent so the habit sticks.
- Increase contribution rate gradually as income rises or debt falls.

**Authoritative source link**
- https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/savings-101.html

**Book reference**
- **The Richest Man in Babylon, George S. Clason**. Core idea: keep a portion of every dollar you earn.`
    },
    {
      id: '4-bucket',
      title: '4-Bucket Framework',
      description: 'Organize your cash flow',
      icon: 'layers',
      readTime: '6 min',
      content: `**Plain-language definition**
- The 4-bucket framework splits take-home pay into Fixed Costs, Investments, Savings, and Guilt-Free Spending.
- It gives a simple structure so money has a job before it is spent.

**Why it matters in a financial plan**
- It gives immediate visibility into whether spending is sustainable.
- It also provides a clean way to rebalance when one category is crowding out priorities.

**Key numbers / rules**
- Fixed Costs target: **50% to 60%** of take-home pay.
- Investments target: about **10%**.
- Savings target: about **5% to 10%**.
- Guilt-Free Spending: remainder after the first three buckets.
- Calculation method: \`bucket amount = take-home pay x target %\`.
- If Fixed Costs are above 60%, the plan first reduces fixed commitments or temporarily scales discretionary buckets.

**Authoritative source link**
- https://www.canada.ca/en/financial-consumer-agency/services/budgeting.html

**Book reference**
- **I Will Teach You to Be Rich, Ramit Sethi**. Core idea: use conscious spending and automatic systems.`
    },
    {
      id: 'debt-avalanche-snowball',
      title: 'Debt Avalanche vs Snowball',
      description: 'Two strategies to be debt-free',
      icon: 'trending_down',
      readTime: '5 min',
      content: `**Plain-language definition**
- Debt avalanche means paying extra toward the highest interest debt first while making minimums on others.
- Debt snowball means paying extra toward the smallest balance first for faster psychological wins.

**Why it matters in a financial plan**
- Avalanche usually saves more total interest.
- Snowball can improve follow-through for users who need momentum from early wins.

**Key numbers / rules**
- Avalanche is usually mathematically optimal for total interest cost.
- Snowball can be behavior-optimal if motivation and consistency are the user's main risks.
- Agent decision rule: use user profile plus adherence signals. If user repeatedly misses plan targets, switch to simpler momentum-first strategy.

**Authoritative source link**
- https://www.canada.ca/en/financial-consumer-agency/services/debt.html`
    },
    {
      id: 'minimum-payment-trap',
      title: 'Minimum Payment Trap',
      description: 'Why minimums keep you in debt',
      icon: 'warning',
      readTime: '4 min',
      content: `**Plain-language definition**
- Credit card minimum payments are designed to keep accounts current, not to eliminate debt quickly.
- If you only pay the minimum, interest keeps compounding and repayment can take many years.

**Why it matters in a financial plan**
- This is often the highest guaranteed financial drag in a user's plan.
- Paying in full monthly can immediately stop purchase interest and free cash flow for goals.

**Key numbers / rules**
- Example assumptions for transparent math:
  - Starting balance: **$3,000**
  - APR: **19.99%**
  - Monthly rate: \`0.1999 / 12 = 1.6658%\`
  - Payment rule: **2.5% of balance, minimum $10**, no new purchases
- Deterministic result under those assumptions:
  - Time to payoff: **307 months** (about **25.6 years**)
  - Total interest paid: about **$5,456.56**
  - Total paid: about **$8,456.56**
- Paying full statement balance by due date avoids purchase interest on new spending.
- Consistent on-time full payments support stronger credit history over time.

**Authoritative source link**
- https://www.canada.ca/en/financial-consumer-agency/services/credit-cards/pay-credit-card-balance.html`
    },
    {
      id: 'emergency-fund',
      title: 'Emergency Fund',
      description: 'Your financial safety net',
      icon: 'shield',
      readTime: '4 min',
      content: `**Plain-language definition**
- An emergency fund is cash set aside for unexpected events like job loss, urgent travel, or a major repair.
- It protects you from using high-interest debt when life gets expensive.

**Why it matters in a financial plan**
- Without this buffer, one surprise expense can break the whole plan.
- It creates stability so long-term investing can continue during stress.

**Key numbers / rules**
- Target range: **3 to 6 months of essential expenses**.
- "Essential expenses" usually include rent or mortgage, utilities, groceries, insurance, transportation, minimum debt payments, and essential healthcare.
- Account type: high-interest savings account (HISA), or TFSA-HISA if room exists and funds remain liquid.
- Agent trigger to shift harder into investing: user has at least **3 months** essential expenses saved and no high-interest revolving debt.

**Authoritative source link**
- https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/emergency-funds.html`
    },
    {
      id: 'over-contribution',
      title: 'Over-Contribution Penalties',
      description: 'Avoid CRA penalties on registered accounts',
      icon: 'gpp_bad',
      readTime: '3 min',
      content: `**Plain-language definition**
- Over-contribution means adding more than your allowed room to a registered account.
- CRA can apply monthly penalties until the excess is removed or absorbed by new room.

**Why it matters in a financial plan**
- Penalties can erase the benefits of registered accounts.
- This often happens when users spread accounts across multiple institutions and lose track of total contributions.

**Key numbers / rules**
- TFSA excess contribution tax: **1% per month** on the highest excess amount in the month.
- RRSP excess contribution tax: **1% per month** on excess above the **$2,000 lifetime grace amount**.
- Common TFSA error: withdrawing and re-contributing in the same calendar year without available room.
- Best practice: verify room in **CRA My Account** before large contributions.

**Authoritative source link**
- TFSA: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributions.html
- RRSP: https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4040.html`
    },
    {
      id: 'compound-interest',
      title: 'Compound Interest',
      description: 'How your money grows over time',
      icon: 'show_chart',
      readTime: '4 min',
      content: `**Plain-language definition**
- Compound growth means your money can earn returns, and then those returns can also earn returns.
- Opportunity cost means what you miss out on when money is not used in a productive way.

**Why it matters in a financial plan**
- It helps users see the real cost of delaying contributions.
- It turns abstract advice into a measurable trade-off.

**Key numbers / rules**
- Example: investing **$6,000 per year** at **7%** for **20 years** gives about **$245,972.95**.
- In that example, personal contributions are **$120,000** and growth is about **$125,972.95**.
- Formula used for yearly contributions: \`FV = P x [((1 + r)^n - 1) / r]\`.
- Unused registered room can be framed as deferred tax-advantaged growth.

**Authoritative source link**
- https://www.getsmarteraboutmoney.ca/learning-path/investing-basics/how-compound-growth-works/`
    },
    {
      id: 'behaviour-psychology',
      title: 'Behaviour & Money Psychology',
      description: 'Why we make irrational money decisions',
      icon: 'psychology',
      readTime: '5 min',
      content: `**Plain-language definition**
- People are not robots with money. Emotions and habits affect decisions as much as math.
- Common patterns include present bias (favoring now), loss aversion (feeling losses strongly), and status spending (spending to signal success).

**Why it matters in a financial plan**
- A plan that ignores behavior usually fails, even if the numbers look perfect.
- Better plans are realistic, shame-free, and easy to repeat.

**Key numbers / rules**
- Reframe high-interest debt payoff as a near-guaranteed return equal to avoided interest cost.
- Favor "start now, improve later" over waiting for a perfect setup.
- Use small defaults, auto-rules, and visible milestones to support consistency.

**Authoritative source link**
- https://www.canada.ca/en/financial-consumer-agency/services/financial-wellness-work.html

**Book reference**
- **The Psychology of Money, Morgan Housel**. Core idea: long-term financial success is mostly behavior, not raw intelligence.`
    },
    {
      id: 'financial-levels',
      title: 'Financial Levels',
      description: 'Your 5-level financial progression',
      icon: 'stairs',
      readTime: '5 min',
      content: `**Plain-language definition**
- The Financial Levels framework is a simple ladder that shows where a user is now and what comes next.
- Each level focuses on one practical jump in stability, then one jump in growth.

**Why it matters in a financial plan**
- It makes progress visible and reduces confusion about priorities.
- It gives users one clear next target instead of trying to fix everything at once.

**Key numbers / rules**
- **Level 1**: no emergency fund, high-interest debt, no registered accounts.
- **Level 2**: credit card paid in full monthly, starter emergency fund ($1,000 to $2,000), at least one registered account open.
- **Level 3**: 3-month emergency fund, high-interest debt cleared, regular registered contributions.
- **Level 4**: 6-month emergency fund, all non-mortgage debt cleared, FHSA and RRSP contributions at target pace.
- **Level 5**: fully funded emergency fund, debt-free except optional mortgage, registered accounts maxed annually or on track.
- Agent requirement: always state current level and exact conditions to reach next level.

**Authoritative source link**
- https://www.canada.ca/en/financial-consumer-agency/services/financial-toolkit.html`
    }
  ];

  const books = [
    {
      title: 'The Richest Man in Babylon',
      author: 'George S. Clason',
      description: 'Build wealth by consistently saving a fixed part of income before discretionary spending.'
    },
    {
      title: 'I Will Teach You to Be Rich',
      author: 'Ramit Sethi',
      description: 'Use a simple conscious spending plan and automation so money decisions are easier to maintain.'
    },
    {
      title: 'The Psychology of Money',
      author: 'Morgan Housel',
      description: 'Good financial outcomes come more from behavior and consistency than perfect optimization.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#f8f8f6', color: '#1a1a1a', fontFamily: 'Manrope, sans-serif'}}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{backgroundColor: 'rgba(248, 248, 246, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f0ea'}}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{backgroundColor: '#ecb613'}}>
            <span className="material-symbols-outlined text-xl leading-none" style={{color: '#221d10'}}>account_balance_wallet</span>
          </div>
          <span className="font-bold text-lg tracking-tight">MaplePlan</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full transition-colors" style={{backgroundColor: 'transparent'}}>
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{backgroundColor: 'rgba(236, 182, 19, 0.2)', border: '1px solid rgba(236, 182, 19, 0.3)'}}>
            <span className="material-symbols-outlined" style={{color: '#ecb613'}}>person</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {/* Page Header */}
        <div className="px-4 pt-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Knowledge Base</h1>
          <p className="text-sm text-text-muted">Canadian financial concepts explained in plain language.</p>
        </div>

        {/* Concept Cards */}
        <section className="px-4 mt-6">
          <div className="space-y-3">
            {concepts.map((concept) => (
              <div key={concept.id} className="bg-white dark:bg-card-dark rounded-xl border border-neutral-surface dark:border-white/10 overflow-hidden">
                <button
                  className="w-full p-4 text-left hover:bg-neutral-surface/50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => {
                    const element = document.getElementById(`content-${concept.id}`);
                    const content = element.querySelector('.content-details');
                    const icon = element.querySelector('.expand-icon');
                    
                    if (content.style.display === 'none' || content.style.display === '') {
                      content.style.display = 'block';
                      icon.textContent = 'expand_less';
                    } else {
                      content.style.display = 'none';
                      icon.textContent = 'expand_more';
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary">{concept.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{concept.title}</h3>
                      <p className="text-sm text-text-muted">{concept.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-xs text-text-muted">schedule</span>
                        <span className="text-xs text-text-muted">{concept.readTime} read</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined expand-icon text-text-muted">expand_more</span>
                  </div>
                </button>
                <div id={`content-${concept.id}`} className="border-t border-neutral-surface dark:border-white/10">
                  <div className="content-details" style={{display: 'none'}}>
                    <div className="p-4 pt-0">
                      <div className="prose prose-sm max-w-none" style={{color: '#1a1a1a'}}>
                        {concept.content.split('\n').map((line, index) => {
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <h4 key={index} className="font-semibold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                          } else if (line.startsWith('- ')) {
                            return <li key={index} className="ml-4">{line.substring(2)}</li>;
                          } else if (line.startsWith('  - ')) {
                            return <li key={index} className="ml-8">{line.substring(4)}</li>;
                          } else if (line.trim() === '') {
                            return <br key={index} />;
                          } else if (line.includes('http')) {
                            return (
                              <a key={index} href={line.split(' ').pop()} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {line}
                              </a>
                            );
                          } else {
                            return <p key={index}>{line}</p>;
                          }
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Reading */}
        <section className="px-4 mt-8">
          <h2 className="text-xl font-bold tracking-tight mb-4">Recommended Reading</h2>
          <div className="space-y-3">
            {books.map((book, index) => (
              <div key={index} className="bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">auto_stories</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{book.title}</h3>
                    <p className="text-sm text-text-muted">by {book.author}</p>
                    <p className="text-sm mt-1">{book.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 py-2">
        <div className="flex justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">home</span>
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/planner" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-xs">Planner</span>
          </Link>
          <Link href="/learn" className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10">
            <span className="material-symbols-outlined text-primary">auto_stories</span>
            <span className="text-xs text-primary">Learn</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">person</span>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

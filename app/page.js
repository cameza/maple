import Link from "next/link";
import "./globals.css";

export default function HomePage() {
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
        {/* Hero Section */}
        <div className="px-4 pt-6">
          <div className="relative overflow-hidden rounded-xl p-6" style={{backgroundColor: '#221d10'}}>
            <div className="relative z-10 space-y-4 max-w-[300px]">
              <h1 className="text-3xl font-bold leading-tight" style={{color: 'white'}}>
                Finally understand<br />where your money<br />should go.
              </h1>
              <p className="text-sm leading-relaxed" style={{color: 'rgba(255, 255, 255, 0.8)'}}>
                MaplePlan is your AI financial coach for Canadians. Tell it your income, debts, and accounts — it builds a prioritized action plan across your TFSA, RRSP, FHSA, and everyday spending. You stay in control.
              </p>
              <div className="flex flex-wrap gap-3 text-xs" style={{color: 'rgba(255, 255, 255, 0.6)'}}>
                <span>⚡ 15-min intake</span>
                <span>🇨🇦 TFSA · RRSP · FHSA</span>
                <span>🔒 No auto-transactions</span>
              </div>
              <Link 
                href="/planner" 
                className="font-bold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity" style={{backgroundColor: '#ecb613', color: '#221d10', padding: '12px 24px', borderRadius: '9999px', textDecoration: 'none'}}
              >
                Build my free plan
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            {/* Decorative Background Gradient */}
            <div className="absolute top-0 right-0 w-full h-full opacity-30" style={{background: 'radial-gradient(circle at top right, #f2b90d 0%, transparent 60%)'}}></div>
          </div>
        </div>

        {/* Financial Level Widget */}
        <section className="px-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Your Financial Level</h2>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">ESTIMATED</span>
          </div>
          <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Current Status</p>
                  <h3 className="font-semibold text-lg">Level 1: Foundation</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">1</p>
                  <p className="text-xs text-text-muted">of 5</p>
                </div>
              </div>
              {/* Level progress bar - 5 segments */}
              <div className="flex gap-1.5 h-2">
                <div className="flex-1 rounded-full bg-primary" />
                <div className="flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="flex items-center gap-2 p-3 bg-neutral-surface dark:bg-white/5 rounded-lg">
                <span className="material-symbols-outlined text-primary">info</span>
                <p className="text-sm">
                  You're currently in the Foundation phase. Priority: Building a $1,000 emergency fund and tackling high-interest debt.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Knowledge Base */}
        <section className="px-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Knowledge Base</h2>
            <Link href="/learn" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            <Link href="/learn#tfsa" className="block bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10 hover:bg-neutral-surface/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">account_balance</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">TFSA vs RRSP</h3>
                  <p className="text-sm text-text-muted">Which registered account is right for your goals?</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs text-text-muted">schedule</span>
                    <span className="text-xs text-text-muted">4 min read</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/learn#4-bucket" className="block bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10 hover:bg-neutral-surface/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">layers</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">The 4-Bucket Rule</h3>
                  <p className="text-sm text-text-muted">Organize your cash flow with this simple system.</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs text-text-muted">schedule</span>
                    <span className="text-xs text-text-muted">6 min read</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/learn#debt-avalanche-snowball" className="block bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10 hover:bg-neutral-surface/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">trending_down</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Debt Avalanche</h3>
                  <p className="text-sm text-text-muted">The mathematically fastest way to be debt-free.</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs text-text-muted">schedule</span>
                    <span className="text-xs text-text-muted">5 min read</span>
                  </div>
                </div>
              </div>
            </Link>
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
          <Link href="/learn" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">auto_stories</span>
            <span className="text-xs">Learn</span>
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

'use client';

import Link from "next/link";
import "../globals.css";

export default function ProfilePage() {
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
        {/* User Profile Section */}
        <section className="px-4 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden" style={{backgroundColor: 'rgba(236, 182, 19, 0.2)', border: '2px solid rgba(236, 182, 19, 0.3)'}}>
              <span className="material-symbols-outlined text-2xl" style={{color: '#ecb613'}}>person</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Demo User</h1>
              <p className="text-sm text-text-muted">demo@mapleplan.ca</p>
            </div>
          </div>
        </section>

        {/* Plan Status */}
        <section className="px-4 mt-6">
          <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Plan Status</h2>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Active</span>
            </div>
            <p className="text-sm text-text-muted">Active plan generated</p>
          </div>
        </section>

        {/* Financial Level */}
        <section className="px-4 mt-6">
          <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Financial Level</p>
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

        {/* Settings */}
        <section className="px-4 mt-6">
          <h2 className="text-xl font-bold tracking-tight mb-4">Settings</h2>
          <div className="space-y-2">
            <button className="w-full bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10 hover:bg-neutral-surface/50 dark:hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-muted">notifications</span>
                  <span>Notification preferences</span>
                </div>
                <span className="material-symbols-outlined text-text-muted">chevron_right</span>
              </div>
            </button>
            
            <button className="w-full bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10 hover:bg-neutral-surface/50 dark:hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-muted">download</span>
                  <span>Export plan as PDF</span>
                </div>
                <span className="material-symbols-outlined text-text-muted">chevron_right</span>
              </div>
            </button>
            
            <button className="w-full bg-white dark:bg-card-dark rounded-xl p-4 border border-neutral-surface dark:border-white/10 hover:bg-neutral-surface/50 dark:hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-muted">delete</span>
                  <span>Delete my data</span>
                </div>
                <span className="material-symbols-outlined text-text-muted">chevron_right</span>
              </div>
            </button>
          </div>
        </section>

        {/* Footer */}
        <section className="px-4 mt-8 mb-8">
          <div className="text-center">
            <p className="text-xs text-text-muted">
              MaplePlan does not store or access your bank accounts.
            </p>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 py-2">
        <div className="flex justify-around">
          <Link href="/app" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-neutral-surface/80 dark:hover:bg-white/10 transition-colors">
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
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10">
            <span className="material-symbols-outlined text-primary">person</span>
            <span className="text-xs text-primary">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

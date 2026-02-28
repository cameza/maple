"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function SavedPlanContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id") || "";
  const [planData, setPlanData] = useState(null);
  const [planId, setPlanId] = useState(requestedId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlan = async () => {
      setIsLoading(true);
      setError("");

      const localPlan = (() => {
        try {
          const raw = localStorage.getItem("mapleplan_planData");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

      const localPlanId = localStorage.getItem("mapleplan_planId") || "";
      const localClientId = localStorage.getItem("mapleplan_client_id") || "";
      const candidatePlanId = requestedId || localPlanId;

      if (candidatePlanId) {
        try {
          const response = await fetch(`/api/plan/${candidatePlanId}`);
          if (response.ok) {
            const record = await response.json();
            if (record?.planData) {
              setPlanData(record.planData);
              setPlanId(record.id || candidatePlanId);
              localStorage.setItem("mapleplan_planData", JSON.stringify(record.planData));
              localStorage.setItem("mapleplan_planId", record.id || candidatePlanId);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Fall through to local fallback and latest endpoint.
        }
      }

      if (localClientId) {
        try {
          const latestRes = await fetch(`/api/plan/latest?clientId=${encodeURIComponent(localClientId)}`);
          if (latestRes.ok) {
            const record = await latestRes.json();
            if (record?.planData) {
              setPlanData(record.planData);
              setPlanId(record.id || "");
              localStorage.setItem("mapleplan_planData", JSON.stringify(record.planData));
              if (record.id) localStorage.setItem("mapleplan_planId", record.id);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Use local fallback below.
        }
      }

      if (localPlan) {
        setPlanData(localPlan);
        setPlanId(localPlanId);
        setIsLoading(false);
        return;
      }

      setError("No saved plan found yet. Generate a plan first from intake.");
      setIsLoading(false);
    };

    loadPlan();
  }, [requestedId]);

  const topActions = useMemo(() => {
    return Array.isArray(planData?.priorities) ? planData.priorities.slice(0, 3) : [];
  }, [planData]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <p className="text-sm text-slate-500">Loading saved plan...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background-light px-6 py-12 max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold">Saved Plan</h1>
        <p className="mt-3 text-sm text-slate-600">{error}</p>
        <Link href="/planner" className="inline-flex mt-6 text-sm font-semibold text-primary underline underline-offset-4">
          Go to planner
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-light px-6 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Saved Plan</h1>
        <Link href="/planner" className="text-sm font-semibold text-primary underline underline-offset-4">
          Open planner
        </Link>
      </div>

      {planId && <p className="mt-1 text-xs text-slate-400">Plan ID: {planId}</p>}

      <section className="mt-6 bg-white border border-slate-100 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wider text-slate-400">Financial level</p>
        <p className="text-lg font-semibold mt-1">
          Level {planData?.financialLevel?.current || 1} · {planData?.financialLevel?.label || "Foundation"}
        </p>
      </section>

      <section className="mt-4 bg-white border border-slate-100 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wider text-slate-400">This week&apos;s action</p>
        <p className="text-sm mt-2 text-slate-700">{planData?.oneActionThisWeek || "No action generated yet."}</p>
      </section>

      <section className="mt-4 bg-white border border-slate-100 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wider text-slate-400">Top 3 actions</p>
        <div className="mt-3 space-y-3">
          {topActions.map((action) => (
            <article key={action.rank} className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Priority {action.rank}</p>
              <p className="text-sm font-semibold mt-1">{action.action}</p>
              <p className="text-xs text-slate-600 mt-1">{action.reasoning}</p>
              <p className="text-xs text-slate-500 mt-1">Suggested monthly amount: {formatCurrency(action.dollarAmount)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-4 bg-white border border-slate-100 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wider text-slate-400">Debt-free date</p>
        <p className="text-sm mt-2 text-slate-700">{planData?.debtFreeDate || "No non-mortgage debt modeled."}</p>
      </section>
    </main>
  );
}

export default function SavedPlanPage() {
  return (
    <Suspense
      fallback={(
        <main className="min-h-screen bg-background-light flex items-center justify-center px-6">
          <p className="text-sm text-slate-500">Loading saved plan...</p>
        </main>
      )}
    >
      <SavedPlanContent />
    </Suspense>
  );
}

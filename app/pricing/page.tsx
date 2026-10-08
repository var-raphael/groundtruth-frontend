"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheck, FiLoader, FiAlertTriangle } from "react-icons/fi";
import { getRecruiterSupabase } from "../../lib/supabase";
import SiteNav from "../components/SiteNav";

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

type PlanInfo = {
  plan: "free" | "pro" | "internal";
  planExpiresAt: string | null;
  hasSubscription: boolean;
};

const FREE_FEATURES = [
  "1 job",
  "20 candidates per job",
  "3 candidate rescans in total (1 per day)",
  "3 outreach drafts",
  "JSON and CSV export",
];

const PRO_FEATURES = [
  "4 jobs",
  "100 candidates per job",
  "Unlimited rescans (3 per candidate per day)",
  "Unlimited outreach drafts",
  "JSON, CSV, Excel and PDF export",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await getRecruiterSupabase().auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 mb-6">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/75 leading-snug">
          <FiCheck size={14} className="text-[#3FB950] mt-0.5 flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"upgrade" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [waitingForPlan, setWaitingForPlan] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPlan = async (): Promise<PlanInfo | null> => {
    try {
      const res = await authedFetch("/me/plan");
      if (!res.ok) return null;
      const data = (await res.json()) as PlanInfo;
      setInfo(data);
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await getRecruiterSupabase().auth.getSession();
      if (data.session) {
        const plan = await loadPlan();
        setSignedIn(plan !== null);
      }
      setLoading(false);
    })();

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "done") {
      window.history.replaceState({}, "", "/pricing");
      setWaitingForPlan(true);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!waitingForPlan) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      const plan = await loadPlan();
      if (plan?.plan === "pro") {
        setWaitingForPlan(false);
        setNotice("You're on Pro. Thanks for upgrading!");
      } else if (attempts >= 20) {
        setWaitingForPlan(false);
        setNotice("Your payment is being confirmed. Your plan will update shortly, refresh in a minute.");
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForPlan]);

  const upgrade = async () => {
    if (!signedIn) {
      window.location.href = "/login";
      return;
    }
    setBusy("upgrade");
    setError(null);
    try {
      const res = await authedFetch("/billing/checkout", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not start checkout");
      window.location.href = body.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    setError(null);
    try {
      const res = await authedFetch("/billing/cancel", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not cancel");
      }
      setConfirmCancel(false);
      setNotice("Cancellation received. Your Pro plan stays active until the end of the period you paid for.");
      setTimeout(loadPlan, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setBusy(null);
    }
  };

  const plan = info?.plan ?? "free";
  const cancelling = plan === "pro" && info?.planExpiresAt;

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-24">
        <SiteNav />

        <div className="mb-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">pricing</div>
          <h1 className="text-[26px] font-bold tracking-tight mb-2">Pick your plan</h1>
          <p className="text-[14px] text-white/60 leading-relaxed max-w-md">
            Start free. Upgrade when you need more jobs, more candidates, and every export format.
          </p>
        </div>

        {waitingForPlan && (
          <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 mb-5 font-mono text-[12px] text-white/70">
            <FiLoader size={13} className="animate-spin" /> Confirming your payment...
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2.5 rounded-lg border border-[#3FB950]/30 bg-[#3FB950]/10 px-4 py-3 mb-5 font-mono text-[12px] text-[#3FB950] leading-relaxed">
            <FiCheck size={14} className="mt-0.5 flex-shrink-0" /> {notice}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 mb-5 font-mono text-[12px] text-red-400">
            <FiAlertTriangle size={13} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/15 bg-white/[0.02] p-6 flex flex-col">
            <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-2">Free</div>
            <div className="text-[28px] font-bold leading-none mb-1">$0</div>
            <div className="font-mono text-[11px] text-white/40 mb-6">forever</div>
            <Features items={FREE_FEATURES} />
            <div className="mt-auto">
              {plan === "free" && signedIn ? (
                <div className="font-mono text-[12px] text-white/40 text-center border border-white/15 rounded-lg py-2.5">
                  Current plan
                </div>
              ) : !signedIn ? (
                <a
                  href="/login"
                  className="block text-center font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg py-2.5"
                >
                  Get started
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-[#3FB950]/40 bg-white/[0.03] p-6 flex flex-col">
            <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#3FB950] mb-2">Pro</div>
            <div className="text-[28px] font-bold leading-none mb-1">$59</div>
            <div className="font-mono text-[11px] text-white/40 mb-6">per month</div>
            <Features items={PRO_FEATURES} />
            <div className="mt-auto flex flex-col gap-2">
              {loading ? (
                <div className="flex justify-center py-2.5">
                  <FiLoader size={14} className="animate-spin text-white/40" />
                </div>
              ) : plan === "pro" ? (
                <>
                  <div className="font-mono text-[12px] text-[#3FB950] text-center border border-[#3FB950]/30 rounded-lg py-2.5">
                    {cancelling && info?.planExpiresAt
                      ? `Cancelled, Pro until ${formatDate(info.planExpiresAt)}`
                      : "Current plan"}
                  </div>
                  {!cancelling && info?.hasSubscription && (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="font-mono text-[11px] text-white/40 hover:text-white/70 py-1"
                    >
                      Cancel subscription
                    </button>
                  )}
                </>
              ) : plan === "internal" ? (
                <div className="font-mono text-[12px] text-white/40 text-center border border-white/15 rounded-lg py-2.5">
                  Internal plan
                </div>
              ) : (
                <>
                  <button
                    onClick={upgrade}
                    disabled={busy !== null}
                    className="w-full flex items-center justify-center gap-2 font-mono text-[13px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-50 rounded-lg py-3 transition-colors"
                  >
                    {busy === "upgrade" ? <FiLoader size={14} className="animate-spin" /> : null}
                    {signedIn ? "Upgrade to Pro" : "Sign in to upgrade"}
                  </button>
                  <p className="font-mono text-[10px] text-white/35 text-center leading-relaxed">
                    Checkout is processed in Nigerian naira (roughly ₦89,000), wherever you are. It&apos;s
                    just the conversion of $59, not a different price. Your bank may show its own rate.
                    <br />
                    Payments are secured by Paystack, a Stripe company.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
          onClick={() => setConfirmCancel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 pt-5 pb-4">
              <div className="text-[15px] font-semibold text-white mb-1">Cancel your subscription?</div>
              <p className="text-[13px] text-white/60 leading-relaxed">
                You keep Pro until the end of the period you've paid for. After that the Free plan's limits
                apply again. Your existing jobs and reports are kept.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-white/10 flex gap-2.5">
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg py-2.5"
              >
                Keep Pro
              </button>
              <button
                onClick={cancel}
                disabled={busy === "cancel"}
                className="flex-1 flex items-center justify-center gap-2 font-mono text-[12px] text-white bg-red-600/90 hover:bg-red-600 disabled:opacity-60 rounded-lg py-2.5"
              >
                {busy === "cancel" ? <FiLoader size={13} className="animate-spin" /> : null}
                Cancel plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import SiteNav, { FounderContact } from "../components/SiteNav";

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

type Plan = {
  name: string;
  price: string;
  priceDetail?: string;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

const faqs = [
  {
    q: "What counts as an active job?",
    a: "A job stays active as long as it's collecting or showing scored candidates. Deleting a job frees up the slot on your plan immediately.",
  },
  {
    q: "What happens if I hit the candidate limit mid-role?",
    a: "Scoring pauses once you hit your plan's limit for that job. Candidates already scored stay visible; upgrading unlocks scoring for the rest right away.",
  },
  {
    q: "Can I downgrade later?",
    a: "Yes. If you're over the Free plan's limits when you downgrade, your existing jobs and reports stay intact, but new scoring pauses until you're back under the limit.",
  },
];

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`rounded-xl p-6 flex flex-col ${
        plan.highlighted
          ? "border border-[#3FB950]/40 bg-[#3FB950]/[0.04]"
          : "border border-white/15 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[13px] font-semibold text-white">{plan.name}</span>
        {plan.highlighted && (
          <span className="font-mono text-[10px] text-[#3FB950] border border-[#3FB950]/40 rounded px-2 py-0.5">
            most teams pick this
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-[32px] font-bold tracking-tight">{plan.price}</span>
        {plan.priceDetail && <span className="font-mono text-[13px] text-white/40">{plan.priceDetail}</span>}
      </div>
      <p className="text-[13px] text-white/60 leading-relaxed mb-6">{plan.tagline}</p>

      <div className="flex flex-col gap-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-2.5">
            <FiCheck size={14} className="text-[#3FB950] mt-0.5 flex-shrink-0" />
            <span className="text-[13px] text-white/80 leading-snug">{f}</span>
          </div>
        ))}
      </div>

      <a
        href={plan.href}
        className={`w-full text-center font-mono text-[13px] font-semibold rounded-lg py-3 transition-colors ${
          plan.highlighted
            ? "bg-[#3FB950] hover:bg-[#3FB950]/90 text-black"
            : "bg-white hover:bg-white/90 text-black"
        }`}
      >
        {plan.cta}
      </a>
    </div>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans: Plan[] = [
    {
      name: "Free",
      price: "$0",
      priceDetail: "forever",
      tagline: "Screen one role properly before you commit to anything.",
      features: FREE_FEATURES,
      cta: "Start free →",
      href: "/login",
    },
    {
      name: "Pro",
      price: "$59",
      priceDetail: "/mo",
      tagline: "For teams hiring more than one role at a time.",
      features: PRO_FEATURES,
      cta: "Upgrade to Pro →",
      href: "/login",
      highlighted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/10">
      <div className="relative mx-auto max-w-3xl px-6 pt-10 pb-24">
        <SiteNav />

        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-4">
          pricing
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-bold leading-[1.12] tracking-tight mb-5">
          Start free. Scale when
          <br />
          you&apos;re hiring for more.
        </h1>
        <p className="text-[16px] text-white/60 leading-relaxed max-w-md mb-12">
          Every plan gets the same evidence-backed reports. The difference
          is how many roles and candidates you can run at once.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-6">
          questions
        </div>
        <div className="flex flex-col mb-20">
          {faqs.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={item.q} className="border-b border-white/10">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-[14px] font-medium">{item.q}</span>
                  <span className="font-mono text-white/40 text-[16px] flex-shrink-0">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="text-[13px] text-white/60 leading-relaxed pb-5 pr-8">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-8 text-center">
          <div className="text-[20px] font-bold mb-2">Not sure which plan fits?</div>
          <p className="text-[14px] text-white/60 mb-6 max-w-sm mx-auto leading-relaxed">
            Start on Free and screen a real role. Upgrading takes one click
            whenever you need more room.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <a
              href="/login"
              className="bg-white hover:bg-white/90 active:bg-white/80 text-black font-mono text-[13px] font-semibold rounded-lg px-5 py-3 transition-colors"
            >
              Get started →
            </a>
            <FounderContact align="center" />
          </div>
        </div>
      </div>
    </div>
  );
}

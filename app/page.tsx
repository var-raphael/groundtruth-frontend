"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiMenu,
  FiX,
  FiLogIn,
  FiBookOpen,
  FiTag,
  FiInfo,
  FiPhone,
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowRight,
  FiPlusCircle,
  FiUserCheck,
  FiBarChart2,
  FiFilter,
  FiSend,
} from "react-icons/fi";

const faqs = [
  {
    q: "How is this different from a resume or LinkedIn?",
    a: "A resume is a claim. Groundtruth checks it. We read a candidate's actual GitHub activity, confirm repos aren't forks or abandoned pushes, and only then generate a report. If we can't verify something, it's flagged, not scored either way.",
  },
  {
    q: "What happens if a candidate's work is private?",
    a: "GitHub returns the same response for a private repo and a nonexistent one, on purpose, so there's no way for us to tell them apart. Rather than guess, unverifiable claims contribute nothing to the score. They're shown for transparency, but they never move the number up or down.",
  },
  {
    q: "Does this replace an interview?",
    a: "No. It replaces the time you'd spend guessing whether a resume is worth a reply. What you do with a strong report, an interview, a call, a trial project, is still on you.",
  },
  {
    q: "How is a candidate scored differently across roles?",
    a: "The same evidence is weighed against the specific job. A candidate strong on backend infra scores differently for a UI role, and the report explains why in both directions.",
  },
  {
    q: "Why GitHub only, no portfolio or resume?",
    a: "GitHub is the one source we can check against something real: commit history, repo activity, contributions. A portfolio link or a resume claim can't be verified the same way, so weighing them would mean guessing.",
  },
];

// Groundtruth mark: prompt triangle with an embedded check at 20px+ (nav,
// hero, app icon); below that, drop the check and use a plain triangle
// instead — the check detail doesn't survive rendering under ~20px.
function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      <path d="M6 3 L20 12 L6 21 Z" fill="#3FB950" />
      <path
        d="M9.5 12.5 L11.5 14.5 L15 10.5"
        stroke="#000000"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TerminalFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 font-mono text-[11px] text-white/40">
        <span className="w-2 h-2 rounded-full border border-white/20" />
        <span className="w-2 h-2 rounded-full border border-white/20" />
        <span className="w-2 h-2 rounded-full border border-white/20" />
        <span className="ml-2">{label}</span>
      </div>
      {children}
    </div>
  );
}

const screeningSteps = [
  {
    icon: FiPlusCircle,
    title: "Create your job and share the link",
    body: "Set the role, the stack you need, and where candidates can be based. Groundtruth generates an apply link, post it on LinkedIn, X, or your own careers page, wherever you already reach candidates.",
  },
  {
    icon: FiUserCheck,
    title: "Candidates apply with GitHub and email",
    body: "No resume upload. Candidates sign in with GitHub through OAuth, so the account is provably theirs, and leave an email for outreach later.",
  },
  {
    icon: FiBarChart2,
    title: "Every applicant gets screened automatically",
    body: "The moment someone applies, their GitHub is read and scored against this specific role, no manual review needed to get started.",
  },
  {
    icon: FiFilter,
    title: "Filter and rank to find your shortlist",
    body: "See every candidate ranked with evidence. Sort or filter by score, match strength, or stack to get to your top picks fast.",
  },
  {
    icon: FiSend,
    title: "Reach out, or export and move on",
    body: "Draft personal outreach for a candidate straight from their evidence, or export the full list as CSV, Excel, PDF, or JSON to take it wherever you work.",
  },
];

const AUTOPLAY_MS = 4500;
const RESUME_AFTER_INTERACTION_MS = 7000;

function ScreeningCarousel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [paused, setPaused] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = screeningSteps[index];
  const count = screeningSteps.length;

  // auto-advance, looping back to 0 after the last step
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setDirection("next");
      setIndex((i) => (i + 1) % count);
      setAnimKey((k) => k + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  // any manual interaction pauses autoplay briefly, then resumes the loop
  const registerInteraction = () => {
    setPaused(true);
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => setPaused(false), RESUME_AFTER_INTERACTION_MS);
  };

  useEffect(() => {
    return () => {
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    };
  }, []);

  const goTo = (i: number, dir: "next" | "prev") => {
    setDirection(dir);
    setIndex(i);
    setAnimKey((k) => k + 1);
    registerInteraction();
  };

  return (
    <div className="mb-20">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
        step by step
      </div>
      <h2 className="text-[26px] font-bold tracking-tight mb-8">
        Screening your candidates
      </h2>

      <div className="rounded-xl border border-white/15 bg-white/[0.02] p-6 sm:p-8 min-h-[220px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div
            key={animKey}
            className={direction === "next" ? "animate-carousel-in-next" : "animate-carousel-in-prev"}
          >
            <div className="font-mono text-[11px] text-white/40 mb-4">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#3FB950]/10 border border-[#3FB950]/25 flex items-center justify-center mb-5">
              <step.icon size={20} className="text-[#3FB950]" />
            </div>
            <h3 className="text-[19px] font-bold mb-2">{step.title}</h3>
            <p className="text-[14px] text-white/60 leading-relaxed max-w-md">{step.body}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
          <button
            onClick={() => goTo((index - 1 + count) % count, "prev")}
            aria-label="Previous step"
            className="flex items-center gap-1.5 font-mono text-[12px] text-white/60 hover:text-white transition-colors"
          >
            <FiArrowLeft size={14} />
            Back
          </button>

          <div className="flex items-center gap-1.5">
            {screeningSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > index ? "next" : "prev")}
                aria-label={`Go to step ${i + 1}`}
                className="relative h-1.5 w-5 rounded-full bg-white/20 hover:bg-white/40 overflow-hidden"
              >
                {i === index && (
                  <span
                    key={`${animKey}-${paused}`}
                    className="absolute inset-0 bg-[#3FB950] rounded-full origin-left"
                    style={{
                      animation: paused
                        ? "none"
                        : `carousel-progress ${AUTOPLAY_MS}ms linear forwards`,
                      transform: paused ? "scaleX(1)" : undefined,
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => goTo((index + 1) % count, "next")}
            aria-label="Next step"
            className="flex items-center gap-1.5 font-mono text-[12px] text-white/60 hover:text-white transition-colors"
          >
            Next
            <FiArrowRight size={14} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes carousel-progress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        @keyframes carousel-in-next {
          from {
            opacity: 0;
            transform: translateX(16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes carousel-in-prev {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-carousel-in-next {
          animation: carousel-in-next 0.35s ease-out;
        }
        .animate-carousel-in-prev {
          animation: carousel-in-prev 0.35s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const [github, setGithub] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/10">
      <div className="relative mx-auto max-w-3xl px-6 pt-10 pb-24">
        {/* nav — sticky so it stays visible while the page scrolls */}
        <nav className="sticky top-0 z-30 -mx-6 px-6 py-4 flex items-center justify-between font-mono text-[13px] mb-16 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <span className="font-semibold flex items-center gap-2">
            <Logo size={18} /> groundtruth
          </span>

          <div className="min-w-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="p-2 -m-2 text-white/80 hover:text-white"
            >
              {menuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-[min(13rem,calc(100vw-3rem))] bg-black border border-white/15 rounded-lg overflow-hidden z-20">
                {[
                  { label: "Login", icon: FiLogIn },
                  { label: "Resources", icon: FiBookOpen },
                  { label: "Pricing", icon: FiTag },
                  { label: "Talk to founder", icon: FiPhone },
                  { label: "About", icon: FiInfo },
                ].map(({ label, icon: Icon }) => (
                  <a
                    key={label}
                    href="#"
                    className="flex items-center gap-3 px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10 last:border-b-0"
                  >
                    <Icon size={15} className="text-white/50" />
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* hero */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-4">
          proof of work
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-bold leading-[1.12] tracking-tight mb-5">
          Anyone can claim it.
          <br />
          Not everyone can prove it.
        </h1>
        <p className="text-[16px] text-white/60 leading-relaxed max-w-md mb-8">
          Groundtruth reads a candidate&apos;s GitHub, checks what&apos;s
          actually real, and hands you a report where every line traces
          back to evidence.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-14">
          <a
            href="#report-form"
            className="bg-white hover:bg-white/90 active:bg-white/80 text-black font-mono text-[13px] font-semibold rounded-lg px-5 py-3 transition-colors"
          >
            Generate a report →
          </a>
          <a
            href="#"
            className="font-mono text-[13px] text-white/70 hover:text-white border-b border-dotted border-white/25"
          >
            Talk to founder
          </a>
        </div>

        {/* THE PROBLEM */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
          the problem
        </div>
        <h2 className="text-[26px] font-bold tracking-tight mb-5">
          Every resume reads the same now
        </h2>
        <p className="text-[14px] text-white/60 leading-relaxed max-w-md mb-10">
          Post a role and the applications flood in, most of them polished
          by the same AI tools, listing the same buzzwords, impossible to
          tell apart. You&apos;re not short on applicants. You&apos;re short
          on a way to know which ones are real.
        </p>

        <TerminalFrame label="groundtruth / inbox">
          <div className="p-5 flex flex-col gap-3">
            {[
              {
                name: "applicant_204.pdf",
                line: "\"Results-driven full-stack engineer passionate about scalable solutions...\"",
              },
              {
                name: "applicant_205.pdf",
                line: "\"Results-driven full-stack engineer passionate about scalable solutions...\"",
              },
              {
                name: "applicant_206.pdf",
                line: "\"Results-driven full-stack engineer passionate about scalable solutions...\"",
              },
            ].map((row) => (
              <div key={row.name} className="flex items-start gap-3">
                <FiAlertTriangle size={14} className="text-[#F0883E] mt-1 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-white/40">{row.name}</div>
                  <div className="text-[13px] text-white/70 truncate">{row.line}</div>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-white/40">
              same phrasing, same structure, zero way to verify any of it
            </div>
          </div>
        </TerminalFrame>

        <div className="mt-10 mb-20">
          <p className="text-[14px] text-white/60 leading-relaxed max-w-md">
            Groundtruth skips the resume entirely. Candidates connect
            GitHub, we check what they&apos;ve actually built, and you see a
            ranked list backed by commits and deployed code, not adjectives.
          </p>
        </div>

        {/* screening walkthrough carousel */}
        <ScreeningCarousel />

        {/* the form */}
        <div id="report-form" className="scroll-mt-6 mb-16">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
            try it on one candidate
          </div>
          <div className="rounded-xl border border-white/15 bg-white/[0.02] p-6">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.06em] text-white/40 mb-2">
              GitHub
            </label>
            <div className="flex items-center bg-black border border-white/15 focus-within:border-white/50 rounded-lg px-3.5 transition-colors">
              <span className="font-mono text-[14px] text-white/40 whitespace-nowrap">
                github.com/
              </span>
              <input
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="var-raphael"
                className="flex-1 bg-transparent border-none outline-none font-mono text-[14px] text-white placeholder:text-white/30 py-3.5 px-1"
              />
            </div>
          </div>
          <button
            type="button"
            className="w-full mt-5 bg-white hover:bg-white/90 active:bg-white/80 text-black font-mono text-[14px] font-semibold rounded-lg py-3.5 transition-colors"
          >
            Generate my report →
          </button>
          </div>
        </div>

        {/* trust strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 py-5 border-y border-white/10 mb-20 text-[13px] text-white/60">
          <span className="flex items-center gap-2">
            <span className="text-[#3FB950] font-mono">✓</span> Every claim
            traced to a source
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[#3FB950] font-mono">✓</span> Dead links
            flagged, not hidden
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[#3FB950] font-mono">✓</span> Scored per
            role, not once for everyone
          </span>
        </div>

        {/* how it works */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-6">
          how it works
        </div>
        <div className="flex flex-col mb-20">
          {[
            {
              n: "01",
              t: "We read, not guess",
              d: "Repos, commit history, live projects, checked directly. Dead links get flagged, not scored as real.",
            },
            {
              n: "02",
              t: "Facts stay separate from opinions",
              d: "What we found and what we think about it live in two different sections. You can always tell which is which.",
            },
            {
              n: "03",
              t: "Every line has a receipt",
              d: "No claim in the report exists without a pointer to exactly where it came from.",
            },
          ].map((step, i, arr) => (
            <div
              key={step.n}
              className={`flex gap-4 py-4 ${
                i !== arr.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <span className="font-mono text-[13px] text-white/40 w-6 flex-shrink-0">
                {step.n}
              </span>
              <div>
                <div className="font-semibold text-[14px] mb-1">{step.t}</div>
                <div className="text-[13px] text-white/60 leading-relaxed">
                  {step.d}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
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
                  <p className="text-[13px] text-white/60 leading-relaxed pb-5 pr-8">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* closing CTA */}
        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-8 text-center mb-16">
          <div className="text-[20px] font-bold mb-2">Hire on what&apos;s real</div>
          <p className="text-[14px] text-white/60 mb-4 max-w-sm mx-auto leading-relaxed">
            Join the teams who&apos;d rather check a candidate&apos;s work
            than take their word for it.
          </p>
          <div className="font-mono text-[12px] text-[#3FB950] mb-6">
            200+ engineering teams and recruiters already screening with Groundtruth
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <a
              href="/signup"
              className="bg-white hover:bg-white/90 active:bg-white/80 text-black font-mono text-[13px] font-semibold rounded-lg px-5 py-3 transition-colors"
            >
              Create an account →
            </a>
            <a
              href="#"
              className="font-mono text-[13px] text-white/70 hover:text-white border-b border-dotted border-white/25"
            >
              Talk to founder
            </a>
          </div>
        </div>

        <footer className="font-mono text-[11px] text-white/40 text-center">
          <a href="#" className="text-white/60 border-b border-dotted border-white/20">
            how scoring works
          </a>
        </footer>
      </div>
    </div>
  );
}

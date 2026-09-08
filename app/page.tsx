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
  FiCheck,
  FiGithub,
  FiArrowLeft,
  FiArrowRight,
  FiPlusCircle,
  FiUserCheck,
  FiBarChart2,
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

function EvidenceLine({ claim, source }: { claim: string; source: string }) {
  return (
    <div className="flex items-start gap-3">
      <FiCheck size={14} className="text-[#3FB950] mt-1 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[14px] text-white">{claim}</div>
        <div className="font-mono text-[11px] text-white/40 flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1">
          <span>↳ based_on</span>
          <code className="text-white/70 bg-white/[0.06] px-1.5 py-0.5 rounded break-all">
            {source}
          </code>
        </div>
      </div>
    </div>
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
    body: "Set the role, the stack you need, and where candidates can be based. Groundtruth generates an apply link you send wherever you already post the role.",
  },
  {
    icon: FiUserCheck,
    title: "Candidates apply with GitHub",
    body: "No resume upload. Candidates connect their GitHub, so the account is provably theirs before anything gets read or scored.",
  },
  {
    icon: FiBarChart2,
    title: "See them ranked with evidence",
    body: "Your dashboard shows every applicant scored against this specific role, each point linked back to a real repo, commit, or contribution.",
  },
  {
    icon: FiSend,
    title: "Reach out with specifics",
    body: "Draft outreach that references what a candidate actually built, not a template. You review and send it from your own inbox.",
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

        {/* SEE IT IN ACTION */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
          see it in action
        </div>
        <h2 className="text-[26px] font-bold tracking-tight mb-14">
          From a username to a decision
        </h2>

        {/* step 01: verify */}
        <div className="mb-16">
          <div className="flex gap-4 mb-5">
            <span className="font-mono text-[13px] text-white/40 w-6 flex-shrink-0">01</span>
            <div>
              <div className="font-semibold text-[16px] mb-1.5">Verify, not guess</div>
              <div className="text-[13px] text-white/60 leading-relaxed max-w-sm">
                Paste a GitHub. We read commit history, check whether repos
                are forks or abandoned pushes, before anything gets scored.
              </div>
            </div>
          </div>
          <TerminalFrame label="groundtruth / verify">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center bg-black border border-white/15 rounded-lg px-3.5">
                <span className="font-mono text-[13px] text-white/40 whitespace-nowrap">
                  github.com/
                </span>
                <span className="font-mono text-[13px] text-white py-3 px-1">var-raphael</span>
              </div>
              <div className="flex flex-col gap-3">
                <EvidenceLine
                  claim="Ships real products, not just repos"
                  source="var-raphael.vercel.app · gnat, deployed and live"
                />
                <EvidenceLine
                  claim="Actively maintains code, not a one-time push"
                  source="github.com/var-raphael/QUOREL · 21 commits/90d"
                />
              </div>
            </div>
          </TerminalFrame>
        </div>

        {/* step 02: score */}
        <div className="mb-16">
          <div className="flex gap-4 mb-5">
            <span className="font-mono text-[13px] text-white/40 w-6 flex-shrink-0">02</span>
            <div>
              <div className="font-semibold text-[16px] mb-1.5">Score against the role</div>
              <div className="text-[13px] text-white/60 leading-relaxed max-w-sm">
                The same evidence is weighed against the job you&apos;re
                hiring for. Every point in the score links back to a repo, a
                commit, or a deployed URL, so you can check it yourself.
              </div>
            </div>
          </div>
          <TerminalFrame label="groundtruth / score · founding-fullstack-ai">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium text-white">Raphael Samuel</div>
                  <span className="font-mono text-[11px] uppercase tracking-wide text-[#3FB950] flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    strong match
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-full" />
                  </div>
                  <span className="font-mono text-[13px] text-white/80">10/10</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
                <EvidenceLine
                  claim="Built an MCP-native data API from scratch"
                  source="github.com/var-raphael/QUOREL"
                />
                <EvidenceLine
                  claim="Ships infra with real users, not just repos"
                  source="quorel-uwrn.onrender.com · live, 21 commits/90d"
                />
              </div>
            </div>
          </TerminalFrame>
        </div>

        {/* step 03: outreach */}
        <div className="mb-20">
          <div className="flex gap-4 mb-5">
            <span className="font-mono text-[13px] text-white/40 w-6 flex-shrink-0">03</span>
            <div>
              <div className="font-semibold text-[16px] mb-1.5">Reach out with specifics</div>
              <div className="text-[13px] text-white/60 leading-relaxed max-w-sm">
                Every draft references the candidate&apos;s actual work, not
                a template. You review and send it yourself, from your own
                inbox.
              </div>
            </div>
          </div>
          <TerminalFrame label="groundtruth / outreach">
            <div className="p-5 flex flex-col gap-3">
              <div className="grid grid-cols-[3.5rem_1fr] gap-y-1 text-[12px] font-mono">
                <span className="text-white/40">To</span>
                <span className="text-white/80 truncate">
                  raphael@var-raphael.dev
                </span>
                <span className="text-white/40">Subject</span>
                <span className="text-white/80 truncate">
                  Your work on gnat caught our eye
                </span>
              </div>
              <div className="text-[13px] text-white/70 leading-relaxed pt-3 border-t border-white/10">
                Hi Raphael,
                <br />
                <br />
                I came across your work on gnat and your MCP-native data API,
                quorel. Built an MCP-native data API from scratch is exactly
                the kind of infra work this role is hiring for.
                <br />
                <br />
                Would love to chat about what we&apos;re building.
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/40 pt-2 border-t border-white/10">
                <FiGithub size={12} />
                generated from verified evidence, not a template
              </div>
            </div>
          </TerminalFrame>
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

"use client";

import { useState, useRef, useEffect } from "react";
import {
  FiMenu,
  FiX,
  FiLogOut,
  FiPlusCircle,
  FiBriefcase,
  FiBookOpen,
  FiInfo,
  FiPhone,
  FiDollarSign,
  FiCopy,
  FiCheckCircle,
  FiTrash2,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiExternalLink,
  FiLink,
  FiMail,
} from "react-icons/fi";
import { SiGithub, SiX } from "react-icons/si";
// LinkedIn isn't in react-icons' bundled Simple Icons set in this version,
// so it's sourced from Font Awesome's set instead, which still carries it.
import { FaLinkedin } from "react-icons/fa6";
import type { IconType } from "react-icons";

// --- mock data shape, matches the hard_data / llm_remarks schema ---

// a project this candidate actually built, used as evidence for a reason
type Evidence = {
  project: string; // repo/project name, e.g. "vexaro"
  liveUrl?: string; // present if the project has a live/deployed URL
  repoUrl?: string; // present if the project has a public repo
};

// llm_remarks.reasons are scored PER JOB, same candidate, different job, different reasons/score.
// a single reason can point to more than one piece of evidence.
type JobReasoning = {
  jobId: string;
  score: number;
  stackMatch: "strong" | "partial" | "weak";
  reasons: { point: string; evidence: Evidence[] }[];
};

type Candidate = {
  id: string;
  name: string;
  timezone: string;
  stack: string[];
  byJob: Record<string, JobReasoning>;
  topRepos: {
    name: string;
    desc: string;
    stack: string[];
    commits90d: number;
    lastCommit: string;
    verified: boolean;
    liveUrl?: string;
    repoUrl?: string;
  }[];
  socials: { github: string; portfolio: string; linkedin?: string; x?: string; email: string };
};

// language -> accent color, common convention
const LANG_COLORS: Record<string, string> = {
  Go: "text-[#29D3F5] border-[#29D3F5]/50 bg-[#29D3F5]/[0.14]",
  TypeScript: "text-[#5B9FF5] border-[#5B9FF5]/50 bg-[#5B9FF5]/[0.14]",
  JavaScript: "text-[#F5DE4E] border-[#F5DE4E]/50 bg-[#F5DE4E]/[0.14]",
  Python: "text-[#FFD84D] border-[#FFD84D]/50 bg-[#FFD84D]/[0.12]",
  HTML: "text-[#FF7A50] border-[#FF7A50]/50 bg-[#FF7A50]/[0.14]",
  Java: "text-[#FF5A5B] border-[#FF5A5B]/50 bg-[#FF5A5B]/[0.14]",
};
const DEFAULT_LANG_COLOR = "text-white/80 border-white/30 bg-white/[0.06]";

function langColor(lang: string) {
  return LANG_COLORS[lang] ?? DEFAULT_LANG_COLOR;
}

// Groundtruth mark: prompt triangle with an embedded check at 20px+ (nav,
// app icon, hero); below that, drop the check and use a plain triangle
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

// Builds a Gmail compose URL, pre-filled with a subject + body generated
// from this candidate's actual repos and top-scoring reason for the active
// job. Deterministic template, no LLM call: pulls the strongest concrete
// detail already in hard_data/llm_remarks rather than inventing anything.
function buildOutreachEmail(c: Candidate, job: { id: string; title: string }): { subject: string; body: string } {
  const reasoning = c.byJob[job.id];
  const topReason = reasoning?.reasons[0];
  const topRepo = c.topRepos[0];
  const firstName = c.name.split(" ")[0];

  // subject: lead with the most specific repo/stack detail available
  const subject = topRepo
    ? `Your work on ${topRepo.name} caught our eye`
    : `Your ${c.stack[0] ?? "engineering"} work caught our eye`;

  // body: greeting -> concrete callout from repos, tied into the top reason -> role tie-in -> soft CTA
  const calloutRepo = topRepo?.desc
    ? `your work on ${topRepo.name} (${topRepo.desc.charAt(0).toLowerCase()}${topRepo.desc.slice(1)})`
    : topRepo
    ? `your work on ${topRepo.name}`
    : `your background in ${c.stack.slice(0, 2).join(" and ")}`;

  const calloutReason = topReason
    ? ` ${topReason.point}.`
    : "";

  const body =
    `Hi ${firstName},\n\n` +
    `I came across ${calloutRepo}.${calloutReason}\n\n` +
    `We're hiring for ${job.title} and think your background is a strong fit for what we're building. Would love to chat about what we're working on.\n\n` +
    `Best,\n`;

  return { subject, body };
}

// URLSearchParams form-encodes spaces as "+", which mail clients render
// literally in mailto: bodies instead of decoding back to spaces. Encoding
// manually with encodeURIComponent uses %20 instead, which every client
// (and Gmail/Outlook's web composers) handles correctly.
function encodeQuery(params: Record<string, string>) {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

// mailto: respects whatever mail client the recruiter already has set as
// their OS/browser default, so it works regardless of provider without
// assuming Gmail specifically.
function mailtoUrl(to: string, subject: string, body: string) {
  return `mailto:${to}?${encodeQuery({ subject, body })}`;
}

// Same country set as the candidate apply form, so a job's required country
// and a candidate's own country always compare against identical options.
const JOB_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Nigeria",
  "India",
  "Brazil",
  "Australia",
  "Japan",
  "Singapore",
  "Netherlands",
  "South Africa",
];

const initialJobs = [
  {
    id: "founding-fullstack-ai-001",
    title: "Founding Full-Stack (AI)",
    count: 47,
    limit: 100,
    newSinceLastVisit: 6,
    locationMode: "anywhere" as const,
    locationCountries: [] as string[],
  },
  {
    id: "backend-infra-002",
    title: "Backend Infra Engineer",
    count: 23,
    limit: 100,
    newSinceLastVisit: 2,
    locationMode: "country" as const,
    locationCountries: ["United States", "Canada"],
  },
  {
    id: "ui-ux-eng-003",
    title: "UI/UX Engineer",
    count: 26,
    limit: 20,
    newSinceLastVisit: 0,
    locationMode: "onsite" as const,
    locationCountries: ["United States"],
  },
];

type Job = (typeof initialJobs)[number];

// Turns a job id into the public apply-link candidates use. Real deployment
// would read the origin from window.location, but a fixed placeholder domain
// keeps this component pure/testable without touching the browser API.
function applyUrl(jobId: string) {
  return `https://groundtruth.app/apply/${jobId}`;
}

function locationLabel(job: Job): string {
  if (job.locationMode === "anywhere") return "Remote, anywhere";
  const countries = job.locationCountries.length > 0 ? job.locationCountries.join(", ") : "unspecified";
  return job.locationMode === "onsite" ? `On-site · ${countries}` : `Remote · ${countries}`;
}

// Raphael's actual projects, reused as evidence across jobs, weighted differently per job.
const vexaro: Evidence = { project: "vexaro", repoUrl: "https://github.com/var-raphael/vexaro" };
const quorel: Evidence = {
  project: "quorel",
  liveUrl: "https://quorel-uwrn.onrender.com",
  repoUrl: "https://github.com/var-raphael/QUOREL",
};
const gnat: Evidence = {
  project: "gnat",
  liveUrl: "https://var-raphael.vercel.app",
  repoUrl: "https://github.com/var-raphael/Gnat",
};
const portfolioEv: Evidence = { project: "var-raphael.vercel.app", liveUrl: "https://var-raphael.vercel.app" };

const mockCandidates: Candidate[] = Array.from({ length: 20 }).map((_, i) => {
  const isRaphael = i === 0;

  const byJob: Record<string, JobReasoning> = isRaphael
    ? {
        "founding-fullstack-ai-001": {
          jobId: "founding-fullstack-ai-001",
          score: 10,
          stackMatch: "strong",
          reasons: [
            {
              point: "Built an MCP-native data API from scratch, the core primitive this role is hiring for",
              evidence: [quorel],
            },
            {
              point: "Ships infra with real users, not just repos. Both a single-binary analytics tool and a live data API are deployed and running today",
              evidence: [gnat, quorel],
            },
            {
              point: "Maintains SDKs across Go, Python, and TypeScript, matching the full-stack breadth this role requires",
              evidence: [vexaro, quorel],
            },
            {
              point: "411 commits this year with an evening and weekday cadence, consistent with founding-stage ownership",
              evidence: [quorel, gnat],
            },
            {
              point: "Stack overlap is strong, not partial. Every required language (Go, TypeScript, Python) shows up in shipped, verified repos",
              evidence: [vexaro, quorel, gnat],
            },
            {
              point: "Timezone (UTC+1) falls within this role's required overlap window, so there's no scheduling friction",
              evidence: [quorel],
            },
            {
              point: "Shows real range across frontend, backend, infra, and database work rather than staying boxed into one layer, matching this role's explicit ask for someone who can own the pipeline end to end",
              evidence: [gnat, quorel, vexaro],
            },
          ],
        },
        "backend-infra-002": {
          jobId: "backend-infra-002",
          score: 9,
          stackMatch: "strong",
          reasons: [
            {
              point: "Runs a versioned data API on a 500MB-RAM server, exactly the constraint this role is built around",
              evidence: [quorel],
            },
            {
              point: "Go-first systems design across multiple projects: single-binary deploys, no Docker dependency",
              evidence: [gnat, vexaro],
            },
            {
              point: "Active repo maintenance in the last 90 days on more than one project, not an abandoned push",
              evidence: [vexaro, quorel],
            },
            {
              point: "Stack overlap is strong. Required Go and Python both appear in shipped, verified infra repos",
              evidence: [quorel, gnat],
            },
            {
              point: "Timezone (UTC+1) falls within this role's required overlap window",
              evidence: [gnat],
            },
            {
              point: "Demonstrated range from data pipeline work to database-layer design (versioned, queryable storage), matching the infra ownership this role expects",
              evidence: [quorel],
            },
          ],
        },
        "ui-ux-eng-003": {
          jobId: "ui-ux-eng-003",
          score: 3,
          stackMatch: "weak",
          reasons: [
            {
              point: "No frontend or design-system work found across portfolio or top repos",
              evidence: [portfolioEv],
            },
            {
              point: "Primary language footprint is backend-only across all top repos: Go, Python, minimal client-side code",
              evidence: [vexaro, gnat],
            },
            {
              point: "Stack overlap is weak. This role's required frontend and design tooling doesn't appear anywhere in verified repos",
              evidence: [vexaro],
            },
          ],
        },
      }
    : {
        "founding-fullstack-ai-001": {
          jobId: "founding-fullstack-ai-001",
          score: Math.max(3, 10 - Math.floor(i / 2.2)),
          stackMatch: i < 6 ? "strong" : i < 13 ? "partial" : "weak",
          reasons: [
            {
              point: "Has shipped a backend service with verified commit history",
              evidence: [{ project: "project-x", repoUrl: "https://github.com/example/project-x" }],
            },
            {
              point: "Stack overlaps with the required Go and Python for this role",
              evidence: [{ project: "project-x", repoUrl: "https://github.com/example/project-x" }],
            },
          ],
        },
        "backend-infra-002": {
          jobId: "backend-infra-002",
          score: Math.max(2, 9 - Math.floor(i / 2)),
          stackMatch: i < 5 ? "strong" : i < 12 ? "partial" : "weak",
          reasons: [
            {
              point: "Backend-focused repo activity in the last 90 days",
              evidence: [{ project: "project-x", repoUrl: "https://github.com/example/project-x" }],
            },
          ],
        },
        "ui-ux-eng-003": {
          jobId: "ui-ux-eng-003",
          score: Math.max(1, 6 - Math.floor(i / 3)),
          stackMatch: i < 3 ? "partial" : "weak",
          reasons: [
            {
              point: "Limited evidence of frontend or UI-focused work",
              evidence: [{ project: "project-x", repoUrl: "https://github.com/example/project-x" }],
            },
          ],
        },
      };

  return {
    id: `cand-${i}`,
    name: isRaphael ? "Raphael Samuel" : `Candidate ${i + 1}`,
    timezone: i % 3 === 0 ? "UTC+1" : i % 3 === 1 ? "UTC-5" : "UTC+0",
    stack: isRaphael ? ["Go", "TypeScript", "Python"] : ["Go", "Python"],
    byJob,
    topRepos: isRaphael
      ? [
          {
            name: "gnat",
            desc: "Self-hosted single-binary Go analytics platform",
            stack: ["Go"],
            commits90d: 34,
            lastCommit: "2 days ago",
            verified: true,
            liveUrl: "https://var-raphael.vercel.app",
            repoUrl: "https://github.com/var-raphael/Gnat",
          },
          {
            name: "quorel",
            desc: "Versioned data extraction platform with MCP support",
            stack: ["Go", "Python", "TypeScript"],
            commits90d: 21,
            lastCommit: "5 days ago",
            verified: true,
            liveUrl: "https://quorel-uwrn.onrender.com",
            repoUrl: "https://github.com/var-raphael/QUOREL",
          },
        ]
      : [
          {
            name: "project-x",
            desc: "Backend service",
            stack: ["Go"],
            commits90d: 12,
            lastCommit: "1 week ago",
            verified: true,
            repoUrl: "https://github.com/example/project-x",
          },
        ],
    socials: {
      github: "github.com/var-raphael",
      portfolio: "var-raphael.vercel.app",
      linkedin: "linkedin.com/in/samuel-raphael",
      x: "x.com/PhantomDev001",
      email: "raphael@var-raphael.dev",
    },
  };
});

const PAGE_SIZE = 20;

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-white" style={{ width: `${score * 10}%` }} />
      </div>
      <span className="font-mono text-[13px] text-white/80 tabular-nums">{score}/10</span>
    </div>
  );
}

function MatchIndicator({ match }: { match: JobReasoning["stackMatch"] }) {
  const styles = {
    strong: "text-[#3FB950]",
    partial: "text-[#F0883E]",
    weak: "text-white/35",
  };
  const label = { strong: "strong match", partial: "partial match", weak: "weak match" };
  return (
    <span className={`font-mono text-[11px] uppercase tracking-wide flex items-center gap-1.5 ${styles[match]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label[match]}
    </span>
  );
}

function StackTag({ lang }: { lang: string }) {
  return (
    <span className={`font-mono text-[11px] border rounded px-2 py-0.5 ${langColor(lang)}`}>
      {lang}
    </span>
  );
}

// Each icon carries its platform's brand color where the platform actually
// has one. GitHub and X's marks are monochrome by convention (black/white),
// so those stay a light neutral rather than being forced into a "color".
// Generic icons (portfolio link, email) have no brand to reflect, so they
// stay neutral too. Text stays white/60 -> white on hover in all cases, so
// the color read comes from the icon alone, not the whole row.
const BRAND_ICON_COLOR = {
  github: "text-white/70",
  portfolio: "text-white/40",
  linkedin: "text-[#0A66C2]",
  email: "text-white/40",
  x: "text-white/70",
} as const;

function SocialRow({ socials }: { socials: Candidate["socials"] }) {
  // icon-based rows: react-icons/fi for generic UI, react-icons/si for brand
  // marks. Simple Icons (the "si" set) is maintained specifically to track
  // brand/trademark changes, so this doesn't rot the way lucide's bundled
  // brand glyphs did.
  const iconItems: { icon: IconType; label: string; href: string; colorKey: keyof typeof BRAND_ICON_COLOR }[] = [
    { icon: SiGithub, label: socials.github, href: `https://${socials.github}`, colorKey: "github" },
    { icon: FiLink, label: socials.portfolio, href: `https://${socials.portfolio}`, colorKey: "portfolio" },
    ...(socials.linkedin
      ? [{ icon: FaLinkedin, label: socials.linkedin, href: `https://${socials.linkedin}`, colorKey: "linkedin" as const }]
      : []),
    { icon: FiMail, label: socials.email, href: `mailto:${socials.email}`, colorKey: "email" },
  ];

  return (
    <div className="flex flex-col gap-2 pt-1">
      {iconItems.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="flex items-center gap-2.5 font-mono text-[12px] text-white/60 hover:text-white"
        >
          <item.icon size={13} className={`${BRAND_ICON_COLOR[item.colorKey]} flex-shrink-0`} />
          <span className="truncate">{item.label}</span>
        </a>
      ))}
      {/* X/Twitter now uses react-icons' SiX (Simple Icons), the real brand
          mark, instead of a manual unicode glyph stand-in. */}
      {socials.x && (
        <a
          href={`https://${socials.x}`}
          className="flex items-center gap-2.5 font-mono text-[12px] text-white/60 hover:text-white"
        >
          <SiX size={13} className={`${BRAND_ICON_COLOR.x} flex-shrink-0`} />
          <span className="truncate">{socials.x}</span>
        </a>
      )}
    </div>
  );
}

// Evidence link(s) for a reason. Behavior:
// - one piece of evidence with both live + repo -> click opens a small tooltip with both options
// - one piece of evidence with only one url -> link goes straight there, no tooltip
// - multiple pieces of evidence -> each rendered as its own small link/tooltip, comma separated
function SingleEvidenceLink({ evidence }: { evidence: Evidence }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!tooltipOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setTooltipOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [tooltipOpen]);

  const hasBoth = Boolean(evidence.liveUrl && evidence.repoUrl);
  const singleUrl = evidence.liveUrl ?? evidence.repoUrl;

  if (!hasBoth) {
    return (
      <a
        href={singleUrl}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[10px] text-white/50 hover:text-white underline decoration-dotted underline-offset-2"
      >
        {evidence.project}
      </a>
    );
  }

  return (
    <span ref={ref} className="relative inline-block">
      <button
        onClick={() => setTooltipOpen((v) => !v)}
        className="font-mono text-[10px] text-white/50 hover:text-white underline decoration-dotted underline-offset-2"
      >
        {evidence.project}
      </button>
      {tooltipOpen && (
        <div className="absolute left-0 top-5 z-30 w-40 bg-black border border-white/15 rounded-lg overflow-hidden shadow-lg">
          <a
            href={evidence.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10"
          >
            <FiExternalLink size={12} className="text-white/40" /> View live
          </a>
          <a
            href={evidence.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-white/80 hover:bg-white/[0.06] hover:text-white"
          >
            <SiGithub size={12} className="text-white/40" /> View on GitHub
          </a>
        </div>
      )}
    </span>
  );
}

function EvidenceLinks({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="font-mono text-[10px] text-white/40 flex flex-wrap items-center gap-x-1">
      <span>evidence:</span>
      {evidence.map((ev, idx) => (
        <span key={ev.project} className="flex items-center">
          <SingleEvidenceLink evidence={ev} />
          {idx < evidence.length - 1 && <span className="text-white/30">,</span>}
        </span>
      ))}
    </div>
  );
}

function CandidateCard({ c, activeJob }: { c: Candidate; activeJob: { id: string; title: string } }) {
  const [open, setOpen] = useState(false);
  const jobReasoning = c.byJob[activeJob.id];
  const outreach = buildOutreachEmail(c, activeJob);

  // a brand-new job has no scored candidates yet, applicants are stored but
  // not yet evaluated against it. say so plainly rather than showing a fake
  // score or crashing on a missing lookup.
  if (!jobReasoning) {
    return (
      <div className="border border-white/10 rounded-xl bg-white/[0.02] px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-mono text-[11px] text-white/60 flex-shrink-0">
          {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[14px] truncate">{c.name}</div>
          <span className="font-mono text-[11px] text-white/40">not yet evaluated for this role</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-mono text-[11px] text-white/60 flex-shrink-0">
            {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-[14px] truncate">{c.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <MatchIndicator match={jobReasoning.stackMatch} />
              <span className="font-mono text-[11px] text-white/40">{c.timezone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ScoreBar score={jobReasoning.score} />
          {open ? (
            <FiChevronUp size={16} className="text-white/40" />
          ) : (
            <FiChevronDown size={16} className="text-white/40" />
          )}
        </div>
      </button>

      {/* collapsed peek: hints at the top reason before the user taps, fading
          into black so it reads as a preview rather than cut-off text */}
      {!open && jobReasoning.reasons[0] && (
        <div className="relative px-4 pb-3 -mt-1">
          <div className="flex items-start gap-2 pl-11">
            <FiCheck size={12} className="text-[#3FB950]/70 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-white/50 leading-snug max-h-[2.6em] overflow-hidden">
              {jobReasoning.reasons[0].point}
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}

      {open && (
        <div className="border-t border-white/10 p-4 pt-4 flex flex-col gap-5">
          {/* hard_data first: stack */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">
              stack
            </div>
            <div className="flex flex-wrap gap-1.5">
              {c.stack.map((s) => (
                <StackTag key={s} lang={s} />
              ))}
            </div>
          </div>

          {/* hard_data: top repos, verified, with stack/commits/last activity */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">
              top repos
            </div>
            <div className="flex flex-col gap-2">
              {c.topRepos.map((r) => (
                <div key={r.name} className="border border-white/10 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[12px] text-white">{r.name}</span>
                    {r.verified && (
                      <span className="font-mono text-[10px] text-[#3FB950] flex items-center gap-1 flex-shrink-0">
                        <FiCheck size={11} /> verified
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-white/60 mb-2">{r.desc}</div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {r.stack.map((s) => (
                      <StackTag key={s} lang={s} />
                    ))}
                  </div>
                  <div className="font-mono text-[10px] text-white/40">
                    {r.commits90d} commits / 90d, last commit {r.lastCommit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* hard_data: socials, iconized */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-1">
              contact & profiles
            </div>
            <SocialRow socials={c.socials} />
          </div>

          {/* llm_remarks second: reasons, specific to the active job, each with linked evidence */}
          <div className="pt-1 border-t border-white/10 -mx-4 px-4 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3FB950]/70 mb-3">
              why this score
            </div>
            <div className="flex flex-col gap-3">
              {jobReasoning.reasons.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <FiCheck size={14} className="text-[#3FB950] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] text-white/90">{r.point}</div>
                    <div className="mt-0.5">
                      <EvidenceLinks evidence={r.evidence} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* action: primary click opens the recruiter's default mail
              client via mailto:, so it works regardless of provider. the
              chevron offers Gmail / Outlook web directly for people who
              specifically want the browser version. */}
          <DraftEmailButton candidateEmail={c.socials.email} candidateFirstName={c.name.split(" ")[0]} outreach={outreach} />
        </div>
      )}
    </div>
  );
}

function DraftEmailButton({
  candidateEmail,
  candidateFirstName,
  outreach,
}: {
  candidateEmail: string;
  candidateFirstName: string;
  outreach: { subject: string; body: string };
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5 mt-1"
      >
        <FiMail size={13} />
        Draft email to {candidateFirstName}
      </button>
      {modalOpen && (
        <EmailPreviewModal
          candidateEmail={candidateEmail}
          initialSubject={outreach.subject}
          initialBody={outreach.body}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function EmailPreviewModal({
  candidateEmail,
  initialSubject,
  initialBody,
  onClose,
}: {
  candidateEmail: string;
  initialSubject: string;
  initialBody: string;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-white/50">
            Review email
          </span>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white p-1 -m-1">
            <FiX size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
              To
            </label>
            <div className="text-[13px] text-white/80 font-mono">{candidateEmail}</div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white leading-relaxed focus:outline-none focus:border-white/30 resize-none"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
          <a
            href={mailtoUrl(candidateEmail, subject, body)}
            onClick={onClose}
            className="flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
          >
            <FiMail size={13} />
            Open in mail app
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: "green" | "amber";
}) {
  const accentClass = accent === "green" ? "text-[#3FB950]" : accent === "amber" ? "text-[#F0883E]" : "text-white";
  return (
    <div className="border border-white/10 rounded-lg bg-white/[0.02] px-3.5 py-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/40 truncate mb-1.5">
        {label}
      </div>
      <div className={`text-[20px] font-bold leading-none ${accentClass}`}>{value}</div>
      {detail && <div className="font-mono text-[10px] text-white/40 mt-1 truncate">{detail}</div>}
    </div>
  );
}

// per-job stat row: capacity, strong matches, candidates stored but not yet
// ranked (over the plan limit), and new applicants since last visit. strong
// match / queued counts are derived live from the real candidate data
// rather than hardcoded, so they can never drift out of sync with what the
// list below actually shows.
function JobStats({ job, candidates }: { job: Job; candidates: Candidate[] }) {
  const evaluated = candidates.filter((c) => c.byJob[job.id]);
  const strongCount = evaluated.filter((c) => c.byJob[job.id].stackMatch === "strong").length;
  const queuedCount = Math.max(0, job.count - job.limit);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
      <StatCard
        label="candidates"
        value={`${job.count}/${job.limit}`}
        detail={job.count >= job.limit ? "plan limit reached" : `${job.limit - job.count} remaining`}
      />
      <StatCard label="strong matches" value={String(strongCount)} accent="green" />
      <StatCard
        label="queued, unranked"
        value={String(queuedCount)}
        detail={queuedCount > 0 ? "upgrade to rank" : undefined}
        accent={queuedCount > 0 ? "amber" : undefined}
      />
      <StatCard
        label="new since last visit"
        value={String(job.newSinceLastVisit)}
        accent={job.newSinceLastVisit > 0 ? "green" : undefined}
      />
    </div>
  );
}

export default function CandidatesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [jobs, setJobs] = useState(initialJobs);
  const [activeJob, setActiveJob] = useState(jobs[0]);
  const [page, setPage] = useState(1);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const totalPages = Math.ceil(mockCandidates.length / PAGE_SIZE);
  const pageItems = mockCandidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-24">
        {/* nav — sticky so it stays visible while the page scrolls */}
        <nav className="sticky top-0 z-30 -mx-6 px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 font-mono text-[13px] mb-8 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <span className="font-semibold flex-shrink-0 flex items-center gap-2">
            <Logo size={18} /> groundtruth
          </span>

          <div className="flex items-center gap-2 min-w-0">
            {/* jobs dropdown */}
            <div className="min-w-0">
              <button
                onClick={() => setJobsOpen(!jobsOpen)}
                className="flex items-center gap-1.5 text-[12px] text-white/70 hover:text-white border border-white/15 rounded-full pl-3 pr-2.5 py-1.5 max-w-[160px] sm:max-w-none"
              >
                <FiBriefcase size={13} className="flex-shrink-0" />
                <span className="truncate">{activeJob.title}</span>
                <FiChevronDown
                  size={13}
                  className={`flex-shrink-0 ${jobsOpen ? "rotate-180 transition-transform" : "transition-transform"}`}
                />
              </button>
              {jobsOpen && (
                <div className="absolute right-0 top-9 w-[min(18rem,calc(100vw-3rem))] bg-black border border-white/15 rounded-lg overflow-hidden z-20">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`flex items-center gap-1 border-b border-white/10 last:border-b-0 ${
                        activeJob.id === job.id ? "bg-white/[0.04]" : ""
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveJob(job);
                          setJobsOpen(false);
                          setPage(1);
                        }}
                        className={`flex-1 min-w-0 flex flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-white/[0.06] ${
                          activeJob.id === job.id ? "text-white" : "text-white/70"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px]">{job.title}</span>
                          <span className="font-mono text-[11px] text-white/40 flex-shrink-0">{job.count}</span>
                        </span>
                        <span className="font-mono text-[10px] text-white/35 truncate">
                          {locationLabel(job)}
                        </span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(applyUrl(job.id));
                            setCopiedJobId(job.id);
                            setTimeout(() => setCopiedJobId((id) => (id === job.id ? null : id)), 1800);
                          } catch {
                            // clipboard access can fail (permissions, insecure
                            // context); silently no-op rather than throw, the
                            // button remains clickable to retry
                          }
                        }}
                        aria-label={`Copy apply link for ${job.title}`}
                        className="flex-shrink-0 p-2.5 mr-1 text-white/40 hover:text-white"
                      >
                        {copiedJobId === job.id ? (
                          <FiCheckCircle size={14} className="text-[#3FB950]" />
                        ) : (
                          <FiCopy size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(job);
                          setJobsOpen(false);
                        }}
                        aria-label={`Delete ${job.title}`}
                        className="flex-shrink-0 p-2.5 mr-1 text-red-500/70 hover:text-red-500"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* main menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
                className="p-2 -m-1 text-white/80 hover:text-white"
              >
                {menuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-52 bg-black border border-white/15 rounded-lg overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setCreateJobOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-left text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10"
                  >
                    <FiPlusCircle size={15} className="text-white/50" />
                    Create job
                  </button>
                  {[
                    { label: "Pricing", icon: FiDollarSign },
                    { label: "Resources", icon: FiBookOpen },
                    { label: "About", icon: FiInfo },
                    { label: "Talk to founder", icon: FiPhone },
                    { label: "Logout", icon: FiLogOut },
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
          </div>
        </nav>

        {/* page header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-bold mb-1">{activeJob.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[12px] text-white/40">
              {mockCandidates.length} candidates, ranked by verified evidence
            </span>
            <span className="font-mono text-[11px] text-white/50 border border-white/15 rounded px-2 py-0.5">
              {locationLabel(activeJob)}
            </span>
          </div>
        </div>

        <JobStats job={activeJob} candidates={mockCandidates} />

        {/* candidate list, sorted by score for the active job. candidates
            without a byJob entry for a freshly created job sort last rather
            than crashing on a missing lookup */}
        <div className="flex flex-col gap-2.5 mb-8">
          {pageItems
            .slice()
            .sort((a, b) => (b.byJob[activeJob.id]?.score ?? -1) - (a.byJob[activeJob.id]?.score ?? -1))
            .map((c) => (
              <CandidateCard key={c.id} c={c} activeJob={activeJob} />
            ))}
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between font-mono text-[12px] text-white/50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="disabled:opacity-30 hover:text-white"
            >
              ← prev
            </button>
            <span>
              page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="disabled:opacity-30 hover:text-white"
            >
              next →
            </button>
          </div>
        )}
      </div>

      {createJobOpen && (
        <CreateJobModal
          onClose={() => setCreateJobOpen(false)}
          onCreate={(newJob) => {
            setJobs((prev) => [newJob, ...prev]);
            setActiveJob(newJob);
            setPage(1);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteJobModal
          job={deleteTarget}
          isOnlyJob={jobs.length <= 1}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (jobs.length <= 1) return; // at least one job must always exist
            setJobs((prev) => {
              const next = prev.filter((j) => j.id !== deleteTarget.id);
              if (activeJob.id === deleteTarget.id) {
                setActiveJob(next[0]);
                setPage(1);
              }
              return next;
            });
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function DeleteJobModal({
  job,
  isOnlyJob,
  onCancel,
  onConfirm,
}: {
  job: Job;
  isOnlyJob: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isOnlyJob ? "bg-[#F0883E]/10" : "bg-red-500/10"
            }`}
          >
            <FiAlertTriangle size={16} className={isOnlyJob ? "text-[#F0883E]" : "text-red-500"} />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white mb-1">
              {isOnlyJob ? "Can't delete your only job" : "Delete this job?"}
            </div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              {isOnlyJob ? (
                <>Create another job before deleting <span className="text-white">{job.title}</span>.</>
              ) : (
                <>
                  <span className="text-white">{job.title}</span> and its {job.count} candidate
                  {job.count === 1 ? "" : "s"} will be permanently removed. This can&apos;t be
                  undone.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg py-2.5"
          >
            {isOnlyJob ? "Got it" : "Cancel"}
          </button>
          {!isOnlyJob && (
            <button
              onClick={onConfirm}
              className="flex-1 font-mono text-[12px] text-white bg-red-600/90 hover:bg-red-600 rounded-lg py-2.5"
            >
              Delete job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function slugifyJobTitle(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  // short suffix keeps ids unique even if two jobs share a title
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "role"}-${suffix}`;
}

function CreateJobModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (job: Job) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<"anywhere" | "country" | "onsite">("anywhere");
  const [locationCountries, setLocationCountries] = useState<string[]>([]);
  const [minYears, setMinYears] = useState("");
  const [createdJob, setCreatedJob] = useState<{ id: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const canSubmit = title.trim().length > 0;

  const addStackTag = () => {
    const tag = stackInput.trim();
    if (tag && !stack.includes(tag)) setStack((prev) => [...prev, tag]);
    setStackInput("");
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    const id = slugifyJobTitle(title);
    // new jobs start on the account's current plan limit; defaulting to the
    // free tier here since this mock has no real billing/account state
    const job: Job = {
      id,
      title: title.trim(),
      count: 0,
      limit: 20,
      newSinceLastVisit: 0,
      locationMode,
      locationCountries: locationMode === "anywhere" ? [] : locationCountries,
    };
    onCreate(job);
    setCreatedJob({ id, title: job.title });
    try {
      await navigator.clipboard.writeText(applyUrl(id));
      setCopied(true);
    } catch {
      // clipboard may be unavailable; the link is still shown and has its
      // own copy button below, so this isn't a dead end
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90vh] bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-white/50">
            {createdJob ? "Job created" : "Create job"}
          </span>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white p-1 -m-1">
            <FiX size={16} />
          </button>
        </div>

        {!createdJob ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                Job title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Backend Engineer"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* structured match criteria: what candidate evidence gets
                scored against, separate from the freeform description */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                Stack
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {stack.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                  >
                    {s}
                    <button
                      onClick={() => setStack((prev) => prev.filter((t) => t !== s))}
                      aria-label={`Remove ${s}`}
                      className="text-white/40 hover:text-white"
                    >
                      <FiX size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={stackInput}
                onChange={(e) => setStackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addStackTag();
                  }
                }}
                onBlur={addStackTag}
                placeholder="Rust, PostgreSQL, tokio — press enter to add"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  Min. years exp.
                </label>
                <input
                  type="number"
                  min={0}
                  value={minYears}
                  onChange={(e) => setMinYears(e.target.value)}
                  placeholder="3"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  Location
                </label>
                <select
                  value={locationMode}
                  onChange={(e) => setLocationMode(e.target.value as typeof locationMode)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/30 appearance-none"
                >
                  <option value="anywhere" className="bg-black">Remote, anywhere</option>
                  <option value="country" className="bg-black">Remote, specific country</option>
                  <option value="onsite" className="bg-black">On-site</option>
                </select>
              </div>
            </div>

            {locationMode !== "anywhere" && (
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  {locationMode === "onsite" ? "Office countries" : "Required countries"}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {locationCountries.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                    >
                      {c}
                      <button
                        onClick={() => setLocationCountries((prev) => prev.filter((x) => x !== c))}
                        aria-label={`Remove ${c}`}
                        className="text-white/40 hover:text-white"
                      >
                        <FiX size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    const c = e.target.value;
                    if (c && !locationCountries.includes(c)) {
                      setLocationCountries((prev) => [...prev, c]);
                    }
                  }}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/30 appearance-none"
                >
                  <option value="" className="bg-black">
                    Add a country
                  </option>
                  {JOB_COUNTRIES.filter((c) => !locationCountries.includes(c)).map((c) => (
                    <option key={c} value={c} className="bg-black">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell candidates about the company and the role: what you're building, what this person will own, and why it matters."
                rows={5}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 leading-relaxed focus:outline-none focus:border-white/30 resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
            <div className="flex items-start gap-2.5">
              <FiCheckCircle size={16} className="text-[#3FB950] mt-0.5 flex-shrink-0" />
              <div className="text-[13px] text-white/90 leading-relaxed">
                <span className="font-medium text-white">{createdJob.title}</span> is live. Share
                this link so candidates can apply.
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5">
              <code className="flex-1 min-w-0 truncate font-mono text-[12px] text-white/70">
                {applyUrl(createdJob.id)}
              </code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(applyUrl(createdJob.id));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {
                    // no-op, button remains available to retry
                  }
                }}
                aria-label="Copy apply link"
                className="flex-shrink-0 text-white/50 hover:text-white p-1"
              >
                {copied ? <FiCheckCircle size={14} className="text-[#3FB950]" /> : <FiCopy size={14} />}
              </button>
            </div>
            {copied && (
              <span className="font-mono text-[11px] text-[#3FB950]">Link copied to clipboard</span>
            )}
          </div>
        )}

        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
          {!createdJob ? (
            <button
              onClick={handleCreate}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white rounded-lg py-2.5"
            >
              Create job →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

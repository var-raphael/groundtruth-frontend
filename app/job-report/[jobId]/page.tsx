"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FiLoader,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiExternalLink,
  FiLink,
  FiMail,
} from "react-icons/fi";
import { SiGithub, SiX } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import type { IconType } from "react-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

const SIMPLE_ICON_SLUGS: Record<string, string> = {
  go: "go",
  golang: "go",
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  html: "html5",
  css: "css3",
  java: "openjdk",
  react: "react",
  "react router": "reactrouter",
  "next.js": "nextdotjs",
  nextjs: "nextdotjs",
  "tailwind css": "tailwindcss",
  tailwindcss: "tailwindcss",
  postgres: "postgresql",
  postgresql: "postgresql",
  mysql: "mysql",
  sqlite: "sqlite",
  mongodb: "mongodb",
  redis: "redis",
  supabase: "supabase",
  prisma: "prisma",
  docker: "docker",
  shopify: "shopify",
  vercel: "vercel",
  zod: "zod",
  vite: "vite",
  node: "nodedotjs",
  "node.js": "nodedotjs",
  express: "express",
  graphql: "graphql",
  rust: "rust",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  rails: "rubyonrails",
  django: "django",
  flask: "flask",
  laravel: "laravel",
  php: "php",
  aws: "amazonwebservices",
  gcp: "googlecloud",
  firebase: "firebase",
  kubernetes: "kubernetes",
  "c#": "csharp",
  ".net": "dotnet",
};

function normalizeForIcon(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*(analytics|sdk|client|cli|package|library)$/i, "")
    .trim();
}

const DARK_ICON_SLUGS = new Set(["nextdotjs", "vercel", "github", "openjdk", "express"]);

function stackIconUrl(name: string): string | null {
  const slug = SIMPLE_ICON_SLUGS[normalizeForIcon(name)];
  if (!slug) return null;
  return DARK_ICON_SLUGS.has(slug)
    ? `https://cdn.simpleicons.org/${slug}/ffffff`
    : `https://cdn.simpleicons.org/${slug}`;
}

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

const FETCH_TIMEOUT_MS = 10000;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Request timed out — is the server running?");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

type Evidence = {
  name: string;
  description?: string;
  repoUrl: string;
  liveUrl?: string;
  isLive: boolean;
  detectedStack: string[];
  commits90d?: number;
  activeWeeks90d?: number;
  score: number;
};

type Contribution = {
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  prTitle: string;
  prUrl: string;
  mergedPrCount: number;
  contributorCount: number;
  stars: number;
};

type ReasonEvidence = { project: string; repoUrl?: string; liveUrl?: string };

type Reasoning = {
  score: number;
  stackMatch: "strong" | "partial" | "weak";
  positiveReasons: { point: string; evidence: ReasonEvidence[] }[];
  negativeReasons: { point: string; evidence: ReasonEvidence[] }[];
  hasTrustFlag: boolean;
};

type CandidateSummary = {
  candidateId: string;
  name: string;
  githubUsername: string;
  email: string;
  country: string;
  city?: string;
  timezone?: string;
  claimedExperienceYears: number;
  linkedin?: string;
  x?: string;
  portfolio?: string;
};

type CandidateReport = {
  candidateId: string;
  candidate: CandidateSummary;
  evidence: Evidence[];
  contributions?: Contribution[];
  reasoning: Reasoning;
};

type JobReport = {
  job: {
    id: string;
    title: string;
    stack: string[];
  };
  reports: CandidateReport[];
};

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(10, score)) * 10}%` }} />
      </div>
      <span className="font-mono text-[13px] text-white/80 tabular-nums">{score.toFixed(1)}/10</span>
    </div>
  );
}

function MatchIndicator({ match }: { match: Reasoning["stackMatch"] }) {
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
  const iconUrl = stackIconUrl(lang);
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/85 border border-white/20 bg-white/[0.06] rounded px-2 py-0.5">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" width={11} height={11} className="flex-shrink-0" />
      ) : null}
      {lang}
    </span>
  );
}

const BRAND_ICON_COLOR = {
  github: "text-white/70",
  portfolio: "text-white/40",
  linkedin: "text-[#0A66C2]",
  x: "text-white/70",
} as const;

function SocialRow({ candidate }: { candidate: CandidateSummary }) {
  const iconItems: { icon: IconType; label: string; href: string; colorKey: keyof typeof BRAND_ICON_COLOR }[] = [
    { icon: SiGithub, label: candidate.githubUsername, href: `https://github.com/${candidate.githubUsername}`, colorKey: "github" },
    ...(candidate.portfolio
      ? [{ icon: FiLink, label: candidate.portfolio, href: candidate.portfolio, colorKey: "portfolio" as const }]
      : []),
    ...(candidate.linkedin
      ? [{ icon: FaLinkedin, label: candidate.linkedin, href: `https://${candidate.linkedin}`, colorKey: "linkedin" as const }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-2 pt-1">
      {iconItems.map((item) => (
        <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 font-mono text-[12px] text-white/60 hover:text-white">
          <item.icon size={13} className={`${BRAND_ICON_COLOR[item.colorKey]} flex-shrink-0`} />
          <span className="truncate">{item.label}</span>
        </a>
      ))}
      {candidate.x && (
        <a href={`https://${candidate.x}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 font-mono text-[12px] text-white/60 hover:text-white">
          <SiX size={13} className={`${BRAND_ICON_COLOR.x} flex-shrink-0`} />
          <span className="truncate">{candidate.x}</span>
        </a>
      )}
    </div>
  );
}

function EvidenceLinks({ evidence }: { evidence: ReasonEvidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <div className="font-mono text-[10px] text-white/40 flex flex-wrap items-center gap-x-1">
      <span>evidence:</span>
      {evidence.map((ev, idx) => {
        const url = ev.liveUrl ?? ev.repoUrl;
        return (
          <span key={`${ev.project}-${idx}`} className="flex items-center">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-white/50 hover:text-white underline decoration-dotted underline-offset-2">
                {ev.project}
              </a>
            ) : (
              <span>{ev.project}</span>
            )}
            {idx < evidence.length - 1 && <span className="text-white/30">,</span>}
          </span>
        );
      })}
    </div>
  );
}

function CandidateCard({ report, rank }: { report: CandidateReport; rank: number }) {
  const [open, setOpen] = useState(false);
  const c = report.candidate;
  const r = report.reasoning;

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-mono text-[11px] text-white/60 flex-shrink-0">
            {rank}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-[14px] truncate">{c.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <MatchIndicator match={r.stackMatch} />
              {r.hasTrustFlag && (
                <span className="font-mono text-[11px] text-[#F0883E] flex items-center gap-1 border border-[#F0883E]/40 rounded px-1.5 py-0.5">
                  <FiAlertTriangle size={11} /> trust flag
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ScoreBar score={r.score} />
          {open ? <FiChevronUp size={16} className="text-white/40" /> : <FiChevronDown size={16} className="text-white/40" />}
        </div>
      </button>

      {!open && r.positiveReasons[0] && (
        <div className="relative px-4 pb-3 -mt-1">
          <div className="flex items-start gap-2 pl-11">
            <FiCheck size={12} className="text-[#3FB950]/70 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-white/50 leading-snug max-h-[2.6em] overflow-hidden">{r.positiveReasons[0].point}</p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}

      {open && (
        <div className="border-t border-white/10 p-4 pt-4 flex flex-col gap-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">top repos</div>
            <div className="flex flex-col gap-2">
              {report.evidence.map((r) => (
                <div key={r.name} className="border border-white/10 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <a href={r.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-mono text-[12px] text-white hover:underline">
                      <SiGithub size={11} className="text-white/40 flex-shrink-0" />
                      {r.name}
                    </a>
                    {r.isLive && r.liveUrl && (
                      <a href={r.liveUrl} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-[#3FB950] flex items-center gap-1 hover:underline flex-shrink-0">
                        <FiExternalLink size={11} /> live
                      </a>
                    )}
                  </div>
                  {r.description && <div className="text-[12px] text-white/60 mb-2">{r.description}</div>}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {r.detectedStack.map((s) => (
                      <StackTag key={s} lang={s} />
                    ))}
                  </div>
                  <div className="font-mono text-[10px] text-white/40">
                    {r.commits90d ?? 0} commits / {r.activeWeeks90d ?? 0} active weeks (90d)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.contributions && report.contributions.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">open-source contributions</div>
              <div className="flex flex-col gap-2">
                {report.contributions.map((contrib, idx) => (
                  <div key={idx} className="border border-white/10 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <a href={contrib.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-mono text-[12px] text-white hover:underline">
                        <SiGithub size={11} className="text-white/40 flex-shrink-0" />
                        {contrib.repoOwner}/{contrib.repoName}
                      </a>
                      <span className="font-mono text-[10px] text-white/40 flex-shrink-0">{contrib.stars.toLocaleString()}★</span>
                    </div>
                    <a href={contrib.prUrl} target="_blank" rel="noreferrer" className="text-[12px] text-white/60 hover:text-white hover:underline block mb-2">
                      {contrib.prTitle}
                    </a>
                    <div className="font-mono text-[10px] text-white/40">
                      {contrib.mergedPrCount} merged PR{contrib.mergedPrCount === 1 ? "" : "s"} · {contrib.contributorCount} contributors
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">candidate details</div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(c.city || c.country || c.timezone) && (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">location</div>
                  <div className="font-mono text-[12px] text-white/70">{[c.city, c.country, c.timezone].filter(Boolean).join(" · ")}</div>
                </div>
              )}
              {c.claimedExperienceYears > 0 && (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">claimed experience</div>
                  <div className="font-mono text-[12px] text-white/70">{c.claimedExperienceYears} year{c.claimedExperienceYears === 1 ? "" : "s"}</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-1">profiles</div>
            <SocialRow candidate={c} />
          </div>

          <div className="pt-1 border-t border-white/10 -mx-4 px-4 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3FB950]/70 mb-3">why this score</div>
            <div className="flex flex-col gap-3">
              {r.positiveReasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <FiCheck size={14} className="text-[#3FB950] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] text-white/90">{reason.point}</div>
                    <div className="mt-0.5">
                      <EvidenceLinks evidence={reason.evidence} />
                    </div>
                  </div>
                </div>
              ))}
              {r.negativeReasons.map((reason, idx) => (
                <div key={`neg-${idx}`} className="flex items-start gap-2.5">
                  <FiAlertTriangle size={14} className="text-[#F0883E] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] text-white/70">{reason.point}</div>
                    <div className="mt-0.5">
                      <EvidenceLinks evidence={reason.evidence} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// TEMP: mock data to preview this page without a backend. REVERT before shipping.
const MOCK_JOB_REPORT: JobReport = {
  job: {
    id: "mock-job-1",
    title: "Founding Engineer",
    stack: ["Go", "Rust", "PostgreSQL", "Docker"],
  },
  reports: [
    {
      candidateId: "c1",
      candidate: {
        candidateId: "c1",
        name: "Raphael Samuel",
        githubUsername: "var-raphael",
        email: "raphael@example.com",
        country: "Nigeria",
        city: "Lagos",
        timezone: "UTC+1",
        claimedExperienceYears: 5,
        linkedin: "linkedin.com/in/var-raphael",
        portfolio: "https://var-raphael.vercel.app",
      },
      evidence: [
        {
          name: "quorel",
          description: "MCP-native data API built from scratch.",
          repoUrl: "https://github.com/var-raphael/quorel",
          liveUrl: "https://quorel-uwrn.onrender.com",
          isLive: true,
          detectedStack: ["Go", "PostgreSQL", "Docker"],
          commits90d: 41,
          activeWeeks90d: 9,
          score: 8.9,
        },
        {
          name: "gnat",
          description: "Self-hosted, privacy-first analytics in a single Go binary.",
          repoUrl: "https://github.com/var-raphael/gnat",
          isLive: false,
          detectedStack: ["Go", "SQLite"],
          commits90d: 32,
          activeWeeks90d: 6,
          score: 7.4,
        },
      ],
      contributions: [
        {
          repoOwner: "golang",
          repoName: "go",
          repoUrl: "https://github.com/golang/go",
          prTitle: "net/http: fix header parsing edge case",
          prUrl: "https://github.com/golang/go/pull/1",
          mergedPrCount: 2,
          contributorCount: 3200,
          stars: 124000,
        },
      ],
      reasoning: {
        score: 8.4,
        stackMatch: "strong",
        hasTrustFlag: false,
        positiveReasons: [
          {
            point: "Shows sustained involvement in Go ecosystems across multiple production-grade repos.",
            evidence: [{ project: "quorel", repoUrl: "https://github.com/var-raphael/quorel" }],
          },
          {
            point: "Ships infra with real, deployed users — not just source pushed and abandoned.",
            evidence: [{ project: "quorel", liveUrl: "https://quorel-uwrn.onrender.com" }],
          },
        ],
        negativeReasons: [
          {
            point: "No direct evidence of Rust usage in any repo, despite the job listing it.",
            evidence: [],
          },
        ],
      },
    },
    {
      candidateId: "c2",
      candidate: {
        candidateId: "c2",
        name: "Olly Test",
        githubUsername: "olly-test",
        email: "olly@example.com",
        country: "United Kingdom",
        city: "London",
        timezone: "UTC+0",
        claimedExperienceYears: 3,
        portfolio: "https://olly.dev",
      },
      evidence: [
        {
          name: "edge-router",
          description: "Rust-based edge routing layer with hot config reload.",
          repoUrl: "https://github.com/olly-test/edge-router",
          isLive: false,
          detectedStack: ["Rust", "Docker"],
          commits90d: 18,
          activeWeeks90d: 4,
          score: 6.1,
        },
      ],
      reasoning: {
        score: 5.4,
        stackMatch: "partial",
        hasTrustFlag: true,
        positiveReasons: [
          {
            point: "Demonstrates working knowledge of Rust in a systems-level project.",
            evidence: [{ project: "edge-router", repoUrl: "https://github.com/olly-test/edge-router" }],
          },
        ],
        negativeReasons: [
          {
            point: "No Go or PostgreSQL usage found across any public repo.",
            evidence: [],
          },
          {
            point: "Low commit frequency in the last 90 days relative to claimed experience.",
            evidence: [{ project: "edge-router", repoUrl: "https://github.com/olly-test/edge-router" }],
          },
        ],
      },
    },
  ],
};

export default function JobReportPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  const [data, setData] = useState<JobReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!jobId) return;
    // TEMP: short-circuit with mock data instead of hitting the real API. REVERT before shipping.
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      setData(MOCK_JOB_REPORT);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [jobId]);

  useEffect(() => load(), [load]);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-24">
        <nav className="sticky top-0 z-30 -mx-6 px-6 py-4 flex items-center justify-between font-mono text-[13px] mb-8 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <span className="font-semibold flex items-center gap-2">
            <Logo size={18} /> groundtruth
          </span>
          <a
            href="/signup"
            className="bg-white hover:bg-white/90 active:bg-white/80 text-black font-mono text-[12px] font-semibold rounded-lg px-3.5 py-2 transition-colors flex-shrink-0"
          >
            Try groundtruth free
          </a>
        </nav>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-24 font-mono text-[12px] text-white/50">
            <FiLoader size={14} className="animate-spin" /> Loading report...
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 text-center py-24 font-mono text-[12px] text-red-400">
            <FiAlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={load} className="flex items-center gap-2 text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2 transition-colors">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="mb-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
                screening report
              </div>
              <h1 className="text-[26px] font-bold tracking-tight mb-3">{data.job.title}</h1>
              <p className="text-[14px] text-white/60 leading-relaxed max-w-md mb-3">
                We ran this role through groundtruth — here&apos;s how these candidates scored,
                ranked by verified GitHub evidence.
              </p>
              {data.job.stack.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.job.stack.map((s) => (
                    <StackTag key={s} lang={s} />
                  ))}
                </div>
              )}
            </div>

            {data.reports.length === 0 ? (
              <div className="text-center py-16 font-mono text-[12px] text-white/40">
                No scored candidates yet — check back shortly.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {data.reports
                  .slice()
                  .sort((a, b) => b.reasoning.score - a.reasoning.score)
                  .map((report, i) => (
                    <CandidateCard key={report.candidateId} report={report} rank={i + 1} />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

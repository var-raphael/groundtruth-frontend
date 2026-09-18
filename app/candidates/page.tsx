"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  FiLoader,
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

// Strips common qualifier suffixes so a specific detected signal (e.g. "Vercel
// Analytics", "Prisma Client", "AWS SDK") still maps to its base tech's icon,
// without needing a hardcoded slug entry for every variant the detector reports.
function normalizeForIcon(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*(analytics|sdk|client|cli|package|library)$/i, "")
    .trim();
}

const DARK_ICON_SLUGS = new Set([
  "nextdotjs",
  "vercel",
  "github",
  "openjdk",
  "express",
]);

function stackIconUrl(name: string): string | null {
  const slug = SIMPLE_ICON_SLUGS[normalizeForIcon(name)];
  if (!slug) return null;
  // No color param = CDN's default, which is the icon's real brand color.
  return DARK_ICON_SLUGS.has(slug)
    ? `https://cdn.simpleicons.org/${slug}/ffffff`
    : `https://cdn.simpleicons.org/${slug}`;
}

type Evidence = {
  name: string;
  description?: string;
  repoUrl: string;
  liveUrl?: string;
  isLive: boolean;
  languages: Record<string, number>;
  detectedStack: string[];
  detectedStackError?: string;
  commits90d?: number;
  activeWeeks90d?: number;
  suspiciousPadding?: boolean;
  hasReadme?: boolean;
  readmeTruncated?: boolean;
  junkDirs?: string[];
  envFilesPushed?: string[];
  score: number;
};

type Contribution = {
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  prTitle: string;
  prUrl: string;
  mergedAt: string;
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
  githubId?: number;
  githubUsername: string;
  email: string;
  country: string;
  city?: string;
  timezone?: string;
  claimedExperienceYears: number;
  linkedin?: string;
  x?: string;
  portfolio?: string;
  status: string;
  statusUpdatedAt: string;
  appliedAt: string;
};

type CandidateReport = {
  candidateId: string;
  jobId: string;
  generatedAt: string;
  candidate: CandidateSummary;
  evidence: Evidence[];
  contributions?: Contribution[];
  reasoning: Reasoning;
  warning?: string;
};

type ListReportsResponse = {
  reports: CandidateReport[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Job = {
  id: string;
  recruiter_id: string;
  title: string;
  description: string;
  stack: string[];
  location_mode: "anywhere" | "country" | "onsite";
  location_countries: string[];
  min_years_experience: number;
  timezone: string;
  min_overlap_hours: number;
  candidate_limit: number;
  created_at: string;
};

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

function encodeQuery(params: Record<string, string>) {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

function mailtoUrl(to: string, subject: string, body: string) {
  return `mailto:${to}?${encodeQuery({ subject, body })}`;
}

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

function applyUrl(jobId: string) {
  return `https://groundtruth.app/apply/${jobId}`;
}

function locationLabel(job: Job): string {
  if (job.location_mode === "anywhere") return "Remote, anywhere";
  const countries = job.location_countries.length > 0 ? job.location_countries.join(", ") : "unspecified";
  return job.location_mode === "onsite" ? `On-site · ${countries}` : `Remote · ${countries}`;
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

const PAGE_SIZE = 20;

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
  email: "text-white/40",
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
    { icon: FiMail, label: candidate.email, href: `mailto:${candidate.email}`, colorKey: "email" },
  ];

  return (
    <div className="flex flex-col gap-2 pt-1">
      {iconItems.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 font-mono text-[12px] text-white/60 hover:text-white"
        >
          <item.icon size={13} className={`${BRAND_ICON_COLOR[item.colorKey]} flex-shrink-0`} />
          <span className="truncate">{item.label}</span>
        </a>
      ))}
      {candidate.x && (
        <a
          href={`https://${candidate.x}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 font-mono text-[12px] text-white/60 hover:text-white"
        >
          <SiX size={13} className={`${BRAND_ICON_COLOR.x} flex-shrink-0`} />
          <span className="truncate">{candidate.x}</span>
        </a>
      )}
    </div>
  );
}

function SingleEvidenceLink({ evidence }: { evidence: ReasonEvidence }) {
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

  if (!singleUrl) {
    return <span className="font-mono text-[10px] text-white/50">{evidence.project}</span>;
  }

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

function EvidenceLinks({ evidence }: { evidence: ReasonEvidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <div className="font-mono text-[10px] text-white/40 flex flex-wrap items-center gap-x-1">
      <span>evidence:</span>
      {evidence.map((ev, idx) => (
        <span key={`${ev.project}-${idx}`} className="flex items-center">
          <SingleEvidenceLink evidence={ev} />
          {idx < evidence.length - 1 && <span className="text-white/30">,</span>}
        </span>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function CandidateCard({ report, job }: { report: CandidateReport; job: Job }) {
  const [open, setOpen] = useState(false);
  const c = report.candidate;
  const r = report.reasoning;

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
          {open ? (
            <FiChevronUp size={16} className="text-white/40" />
          ) : (
            <FiChevronDown size={16} className="text-white/40" />
          )}
        </div>
      </button>

      {!open && r.positiveReasons[0] && (
        <div className="relative px-4 pb-3 -mt-1">
          <div className="flex items-start gap-2 pl-11">
            <FiCheck size={12} className="text-[#3FB950]/70 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-white/50 leading-snug max-h-[2.6em] overflow-hidden">
              {r.positiveReasons[0].point}
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}

      {open && (
        <div className="border-t border-white/10 p-4 pt-4 flex flex-col gap-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">
              top repos
            </div>
            <div className="flex flex-col gap-2">
              {report.evidence.map((r) => (
                <div key={r.name} className="border border-white/10 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <a
                      href={r.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-mono text-[12px] text-white hover:underline"
                    >
                      <SiGithub size={11} className="text-white/40 flex-shrink-0" />
                      {r.name}
                    </a>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.isLive && r.liveUrl && (
                        <a
                          href={r.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-[#3FB950] flex items-center gap-1 hover:underline"
                        >
                          <FiExternalLink size={11} /> live
                        </a>
                      )}
                    </div>
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
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">
                open-source contributions
              </div>
              <div className="flex flex-col gap-2">
                {report.contributions.map((contrib, idx) => (
                  <div key={idx} className="border border-white/10 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <a
                        href={contrib.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-mono text-[12px] text-white hover:underline"
                      >
                        <SiGithub size={11} className="text-white/40 flex-shrink-0" />
                        {contrib.repoOwner}/{contrib.repoName}
                      </a>
                      <span className="font-mono text-[10px] text-white/40 flex-shrink-0">
                        {contrib.stars.toLocaleString()}★
                      </span>
                    </div>
                    <a
                      href={contrib.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] text-white/60 hover:text-white hover:underline block mb-2"
                    >
                      {contrib.prTitle}
                    </a>
                    <div className="font-mono text-[10px] text-white/40">
                      {contrib.mergedPrCount} merged PR{contrib.mergedPrCount === 1 ? "" : "s"} ·{" "}
                      {contrib.contributorCount} contributors
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">
              candidate details
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(c.city || c.country || c.timezone) && (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">
                    location
                  </div>
                  <div className="font-mono text-[12px] text-white/70">
                    {[c.city, c.country, c.timezone].filter(Boolean).join(" · ")}
                  </div>
                </div>
              )}
              {c.claimedExperienceYears > 0 && (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">
                    claimed experience
                  </div>
                  <div className="font-mono text-[12px] text-white/70">
                    {c.claimedExperienceYears} year{c.claimedExperienceYears === 1 ? "" : "s"}
                  </div>
                </div>
              )}
              {c.appliedAt && (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">
                    applied
                  </div>
                  <div className="font-mono text-[12px] text-white/70">{timeAgo(c.appliedAt)}</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-1">
              contact & profiles
            </div>
            <SocialRow candidate={c} />
          </div>

          <div className="pt-1 border-t border-white/10 -mx-4 px-4 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#3FB950]/70 mb-3">
              why this score
            </div>
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

          <DraftEmailButton candidateId={c.candidateId} candidateEmail={c.email} candidateFirstName={c.name.split(" ")[0]} />
        </div>
      )}
    </div>
  );
}

function DraftEmailButton({
  candidateId,
  candidateEmail,
  candidateFirstName,
}: {
  candidateId: string;
  candidateEmail: string;
  candidateFirstName: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);

  const handleClick = async () => {
    setModalOpen(true);
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ subject: string; body: string }>(
        `/candidates/${candidateId}/outreach`,
        { method: "POST" }
      );
      setDraft(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to draft email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5 mt-1"
      >
        <FiMail size={13} />
        Draft email to {candidateFirstName}
      </button>
      {modalOpen && (
        <EmailPreviewModal
          candidateEmail={candidateEmail}
          loading={loading}
          error={error}
          draft={draft}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function EmailPreviewModal({
  candidateEmail,
  loading,
  error,
  draft,
  onClose,
}: {
  candidateEmail: string;
  loading: boolean;
  error: string | null;
  draft: { subject: string; body: string } | null;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (draft) {
      setSubject(draft.subject);
      setBody(draft.body);
    }
  }, [draft]);

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

        {loading && (
          <div className="flex-1 flex items-center justify-center gap-2 py-12 text-white/50 font-mono text-[12px]">
            <FiLoader size={14} className="animate-spin" /> Drafting with AI...
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex items-center justify-center px-6 py-12 text-center">
            <div>
              <FiAlertTriangle size={18} className="text-red-500 mx-auto mb-2" />
              <p className="text-[13px] text-white/70">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && draft && (
          <>
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
          </>
        )}
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

function JobStats({ job, reports, total }: { job: Job; reports: CandidateReport[]; total: number }) {
  const strongCount = reports.filter((r) => r.reasoning.stackMatch === "strong").length;
  const atLimit = total >= job.candidate_limit;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
      <StatCard
        label="scored candidates"
        value={`${total}/${job.candidate_limit}`}
        detail={atLimit ? "plan limit reached" : `${job.candidate_limit - total} remaining`}
      />
      <StatCard label="strong matches (this page)" value={String(strongCount)} accent="green" />
      <StatCard label="min years exp." value={String(job.min_years_experience)} />
    </div>
  );
}

export default function CandidatesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const [reportsData, setReportsData] = useState<ListReportsResponse | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const loadJobs = useCallback(() => {
    let cancelled = false;
    setJobsLoading(true);
    setJobsError(null);
    apiFetch<Job[]>("/jobs")
      .then((data) => {
        if (cancelled) return;
        setJobs(data ?? []);
        if (data && data.length > 0) setActiveJob(data[0]);
      })
      .catch((e) => !cancelled && setJobsError(e instanceof Error ? e.message : "Failed to load jobs"))
      .finally(() => !cancelled && setJobsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadJobs(), [loadJobs]);

  const loadReports = useCallback((jobId: string, pageNum: number) => {
    let cancelled = false;
    setReportsLoading(true);
    setReportsError(null);
    apiFetch<ListReportsResponse>(`/jobs/${jobId}/reports?page=${pageNum}&pageSize=${PAGE_SIZE}`)
      .then((data) => !cancelled && setReportsData(data))
      .catch((e) => !cancelled && setReportsError(e instanceof Error ? e.message : "Failed to load candidates"))
      .finally(() => !cancelled && setReportsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeJob) return;
    return loadReports(activeJob.id, page);
  }, [activeJob, page, loadReports]);

  const handleDeleteJob = async (job: Job) => {
    try {
      await apiFetch(`/jobs/${job.id}`, { method: "DELETE" });
      setJobs((prev) => {
        const next = prev.filter((j) => j.id !== job.id);
        if (activeJob?.id === job.id) {
          setActiveJob(next[0] ?? null);
          setPage(1);
        }
        return next;
      });
    } catch (e) {
      setJobsError(e instanceof Error ? e.message : "Failed to delete job");
    }
    setDeleteTarget(null);
  };

  const handleCreateJob = async (payload: CreateJobPayload) => {
    const created = await apiFetch<Job>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setJobs((prev) => [created, ...prev]);
    setActiveJob(created);
    setPage(1);
    return created;
  };

  if (jobsLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-[13px] text-white/50">
        <FiLoader size={16} className="animate-spin mr-2" /> Loading jobs...
      </div>
    );
  }

  if (jobsError) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 font-mono text-[13px] text-center px-6">
        <FiAlertTriangle size={18} className="text-red-400" />
        <span className="text-red-400">{jobsError}</span>
        <button
          onClick={loadJobs}
          className="flex items-center gap-2 text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!activeJob) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 font-mono text-[13px] text-white/50">
        <span>No jobs yet.</span>
        <button
          onClick={() => setCreateJobOpen(true)}
          className="flex items-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg px-4 py-2.5"
        >
          <FiPlusCircle size={14} /> Create your first job
        </button>
        {createJobOpen && (
          <CreateJobModal onClose={() => setCreateJobOpen(false)} onCreate={handleCreateJob} />
        )}
      </div>
    );
  }

  const reports = reportsData?.reports ?? [];
  const totalPages = reportsData?.totalPages ?? 1;
  const total = reportsData?.total ?? 0;

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-24">
        <nav className="sticky top-0 z-30 -mx-6 px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 font-mono text-[13px] mb-8 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <span className="font-semibold flex-shrink-0 flex items-center gap-2">
            <Logo size={18} /> groundtruth
          </span>

          <div className="flex items-center gap-2 min-w-0">
            <div className="relative min-w-0">
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
                            /* clipboard unavailable, button stays clickable to retry */
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

        <div className="mb-6">
          <h1 className="text-[22px] font-bold mb-1">{activeJob.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[12px] text-white/40">
              {total} scored candidates, ranked by verified evidence
            </span>
            <span className="font-mono text-[11px] text-white/50 border border-white/15 rounded px-2 py-0.5">
              {locationLabel(activeJob)}
            </span>
          </div>
        </div>

        <JobStats job={activeJob} reports={reports} total={total} />

        {reportsLoading && (
          <div className="flex items-center justify-center gap-2 py-12 font-mono text-[12px] text-white/50">
            <FiLoader size={14} className="animate-spin" /> Loading candidates...
          </div>
        )}

        {reportsError && !reportsLoading && (
          <div className="flex flex-col items-center gap-3 text-center py-12 font-mono text-[12px] text-red-400">
            <span>{reportsError}</span>
            <button
              onClick={() => loadReports(activeJob.id, page)}
              className="flex items-center gap-2 text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2"
            >
              Retry
            </button>
          </div>
        )}

        {!reportsLoading && !reportsError && reports.length === 0 && (
          <div className="text-center py-12 font-mono text-[12px] text-white/40">
            No scored candidates for this job yet.
          </div>
        )}

        {!reportsLoading && !reportsError && reports.length > 0 && (
          <div className="flex flex-col gap-2.5 mb-8">
            {reports.map((report) => (
              <CandidateCard key={report.candidateId} report={report} job={activeJob} />
            ))}
          </div>
        )}

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
        <CreateJobModal onClose={() => setCreateJobOpen(false)} onCreate={handleCreateJob} />
      )}

      {deleteTarget && (
        <DeleteJobModal
          job={deleteTarget}
          isOnlyJob={jobs.length <= 1}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDeleteJob(deleteTarget)}
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
                  <span className="text-white">{job.title}</span> and its candidates will be
                  permanently removed. This can&apos;t be undone.
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

type CreateJobPayload = {
  title: string;
  description: string;
  stack: string[];
  location_mode: "anywhere" | "country" | "onsite";
  location_countries: string[];
  min_years_experience: number;
  timezone: string;
  min_overlap_hours: number;
};

function CreateJobModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: CreateJobPayload) => Promise<Job>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<"anywhere" | "country" | "onsite">("anywhere");
  const [locationCountries, setLocationCountries] = useState<string[]>([]);
  const [minYears, setMinYears] = useState("");
  const [timezone, setTimezone] = useState("+00:00");
  const [minOverlapHours, setMinOverlapHours] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<{ id: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    stack.length > 0 &&
    (locationMode === "anywhere" || locationCountries.length > 0);

  const addStackTag = () => {
    const tag = stackInput.trim();
    if (tag && !stack.includes(tag)) setStack((prev) => [...prev, tag]);
    setStackInput("");
  };

  const handleCreate = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await onCreate({
        title: title.trim(),
        description: description.trim(),
        stack,
        location_mode: locationMode,
        location_countries: locationMode === "anywhere" ? [] : locationCountries,
        min_years_experience: minYears ? parseInt(minYears, 10) : 0,
        timezone,
        min_overlap_hours: minOverlapHours ? parseInt(minOverlapHours, 10) : 0,
      });
      setCreatedJob({ id: created.id, title: created.title });
      try {
        await navigator.clipboard.writeText(applyUrl(created.id));
        setCopied(true);
      } catch {
        /* clipboard unavailable, link still shown with its own copy button */
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setSubmitting(false);
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  Your timezone
                </label>
                <input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="+01:00"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  Min. overlap hours
                </label>
                <input
                  type="number"
                  min={0}
                  value={minOverlapHours}
                  onChange={(e) => setMinOverlapHours(e.target.value)}
                  placeholder="4"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
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

            {submitError && (
              <div className="text-[12px] text-red-400 font-mono">{submitError}</div>
            )}
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
                    /* no-op, button remains available to retry */
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
              disabled={!canSubmit || submitting}
              className="w-full flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white rounded-lg py-2.5"
            >
              {submitting ? <FiLoader size={14} className="animate-spin" /> : null}
              {submitting ? "Creating..." : "Create job →"}
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

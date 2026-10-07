"use client";

import type { ReactNode } from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  FiMenu,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import { SiGithub, SiX } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { TechBadge } from "../../candidates/TechBadge";

const USE_MOCK_DATA = false;
const mockReportData = null;

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

type Evidence = {
  name: string;
  description?: string;
  repoUrl: string;
  liveUrl?: string;
  isLive: boolean;
  releaseUrl?: string;
  releaseTag?: string;
  languages: Record<string, number>;
  detectedStack?: string[];
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

type ReasonEvidence = { project: string; repoUrl?: string; liveUrl?: string; releaseUrl?: string };

type StackCoverage = {
  technology: string;
  percentage: number;
  repoCount: number;
  repos: string[];
};

type ScoreBreakdown = {
  stackMatch: number;
  stackCoverage: StackCoverage[];
  evidenceStrength: number;
  contributions: number;
  llmJudgment: number;
};

type Reasoning = {
  score: number;
  breakdown?: ScoreBreakdown;
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
  lastScannedAt: string;
  candidate: CandidateSummary;
  overlapHours?: number;
  evidence?: Evidence[];
  contributions?: Contribution[];
  reasoning: Reasoning;
  warning?: string;
  pending?: boolean;
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
  timezones?: string[];
  min_overlap_hours: number;
  candidate_limit: number;
  created_at: string;
};

type JobReport = {
  job: Job;
  reports: CandidateReport[];
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

const countryNameCache = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

function countryName(iso2: string): string {
  try {
    return countryNameCache?.of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
}

function countryFlagUrl(iso2: string, width: 24 | 40 = 24): string {
  return `https://flagcdn.com/${width}x${width === 24 ? 18 : 30}/${iso2.toLowerCase()}.png`;
}

function CountryFlag({ code, size = 16 }: { code: string; size?: number }) {
  return (
    <img
      src={countryFlagUrl(code)}
      alt=""
      width={size * 1.33}
      height={size}
      className="inline-block rounded-[2px] flex-shrink-0 align-middle"
      loading="lazy"
    />
  );
}

function locationLabel(job: Job): string {
  if (job.location_mode === "anywhere") return "Remote, anywhere";
  const list = job.location_countries ?? [];
  const countries = list.length > 0 ? list.map((code) => countryName(code)).join(", ") : "unspecified";
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
      throw new Error("Request timed out, is the server running?");
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

function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; flip: boolean } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current &&
        !wrapRef.current.contains(target) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    const onScrollOrResize = () => setOpen(false);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  // Position the bubble relative to the viewport (fixed), computed from the
  // trigger's actual on-screen location, so it can never be clipped by a
  // parent's overflow-hidden and always stays within the screen edges.
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const triggerRect = wrapRef.current.getBoundingClientRect();
    const margin = 8;
    const bubbleWidth = Math.min(192, window.innerWidth - margin * 2);

    let left = triggerRect.left + triggerRect.width / 2 - bubbleWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - bubbleWidth - margin));

    const spaceAbove = triggerRect.top;
    const flip = spaceAbove < 80; // not enough room above -> show below instead

    const top = flip ? triggerRect.bottom + 8 : triggerRect.top - 8;

    setPos({ top, left, flip });
  }, [open]);

  const arrowLeft =
    pos && wrapRef.current
      ? wrapRef.current.getBoundingClientRect().left +
        wrapRef.current.getBoundingClientRect().width / 2 -
        pos.left
      : 0;

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="cursor-help outline-none"
      >
        {children}
      </span>
      {open &&
        mounted &&
        pos &&
        createPortal(
          <div
            ref={bubbleRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: Math.min(192, window.innerWidth - 16),
              transform: pos.flip ? "translateY(0)" : "translateY(-100%)",
            }}
            className="z-[100] bg-black border border-white/15 rounded-lg px-2.5 py-2 text-[11px] leading-snug text-white/80 shadow-lg font-sans normal-case tracking-normal"
          >
            {text}
            <span
              style={{ left: arrowLeft }}
              className={`absolute -translate-x-1/2 w-2 h-2 bg-black border-white/15 rotate-45 ${
                pos.flip
                  ? "top-0 -mt-1 border-l border-t"
                  : "bottom-0 -mb-1 border-b border-r"
              }`}
            />
          </div>,
          document.body
        )}
    </span>
  );
}

const SCORE_EXPLANATIONS = {
  overall: "The combined 0-10 score across stack match, evidence strength, contributions, and LLM judgment.",
  stackMatch: "How closely the candidate's detected tech stack overlaps with the job's required stack.",
  evidenceStrength: "How strong and verifiable the candidate's project evidence is, based on commit activity, live deployments, and repo quality.",
  contributions: "Credit for merged pull requests to external, third-party open-source repositories.",
  llmJudgment: "An AI reviewer's holistic read of the candidate's profile, code, and project quality.",
} as const;

// Value-based coloring: the number itself signals how good that score is,
// using the same green/amber vocabulary as "strong match" / "trust flag"
// elsewhere in the app, plus a red tier for genuinely weak scores.
function scoreColorClass(value: number, max: number): string {
  const pct = max > 0 ? value / max : 0;
  if (pct >= 0.75) return "text-[#3FB950]";
  if (pct >= 0.45) return "text-white";
  if (pct >= 0.25) return "text-[#F0883E]";
  return "text-red-400";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(10, score)) * 10}%` }} />
      </div>
      <Tooltip text={SCORE_EXPLANATIONS.overall}>
        <span
          className={`font-mono text-[13px] font-bold tabular-nums border-b border-dotted border-white/40 ${scoreColorClass(
            score,
            10
          )}`}
        >
          {score.toFixed(1)}/10
        </span>
      </Tooltip>
    </div>
  );
}

function ScoreBreakdownRow({ breakdown }: { breakdown: ScoreBreakdown }) {
  const items: { key: keyof typeof SCORE_EXPLANATIONS; label: string; value: number; max: number }[] = [
    { key: "stackMatch", label: "stack", value: breakdown.stackMatch, max: 10 },
    { key: "evidenceStrength", label: "evidence", value: breakdown.evidenceStrength, max: 10 },
    { key: "contributions", label: "contributions", value: breakdown.contributions, max: 10 },
    { key: "llmJudgment", label: "llm", value: breakdown.llmJudgment, max: 10 },
  ];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2.5">
      {items.map((item) => (
        <div key={item.key}>
          <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">
            {item.label}
          </div>
          <Tooltip text={SCORE_EXPLANATIONS[item.key]}>
            <span
              className={`font-mono text-[13px] font-bold tabular-nums border-b border-dotted border-white/40 ${scoreColorClass(
                item.value,
                item.max
              )}`}
            >
              {item.value.toFixed(1)}/{item.max}
            </span>
          </Tooltip>
        </div>
      ))}
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
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/85 border border-white/20 bg-white/[0.06] rounded px-2 py-0.5">
      <TechBadge name={lang} size={13} />
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
    ...(candidate.email
      ? [{ icon: FiMail, label: candidate.email, href: `mailto:${candidate.email}`, colorKey: "email" as const }]
      : []),
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

  const siteUrl = evidence.liveUrl ?? evidence.releaseUrl;
  const siteLabel = evidence.liveUrl ? "View live" : "View release";
  const hasBoth = Boolean(siteUrl && evidence.repoUrl);
  const singleUrl = siteUrl ?? evidence.repoUrl;

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
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10"
          >
            <FiExternalLink size={12} className="text-white/40" /> {siteLabel}
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

function EvidenceLinks({ evidence: evidenceProp }: { evidence?: ReasonEvidence[] }) {
  const evidence = evidenceProp ?? [];
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

// ---- Draft-email cap: this is a view-only shared report, so outreach ------
// drafting is limited to a small number of uses per visit rather than being
// wired to job/recruiter management actions like rescanning or deleting.
const MAX_DRAFTS = 3;

function DraftEmailButton({
  candidateId,
  candidateEmail,
  candidateFirstName,
  draftsUsed,
  draftsRemaining,
  onDraftUsed,
}: {
  candidateId: string;
  candidateEmail: string;
  candidateFirstName: string;
  draftsUsed: boolean;
  draftsRemaining: number;
  onDraftUsed: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);

  const atLimit = draftsRemaining <= 0 && !draftsUsed;

  const loadDraft = async () => {
    if (atLimit) return;
    setModalOpen(true);
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK_DATA) {
        await new Promise((res) => setTimeout(res, 500));
        setDraft({
          subject: `Quick question, ${candidateFirstName}`,
          body: `Hi ${candidateFirstName},\n\nI came across your GitHub profile while reviewing candidates for a role and wanted to reach out directly. Your recent project work stood out, particularly the depth of the commit history and the fact that it's actually deployed and in use.\n\nWould you be open to a short call this week to talk through the role?\n\nBest,\nThe hiring team`,
        });
      } else {
        const generated = await apiFetch<{ subject: string; body: string }>(
          `/public/candidates/${candidateId}/outreach`,
          { method: "POST" }
        );
        setDraft(generated);
      }
      if (!draftsUsed) onDraftUsed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load draft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={loadDraft}
        disabled={atLimit}
        className="flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg py-2.5"
      >
        <FiMail size={13} />
        {atLimit ? "Draft limit reached" : `Draft email to ${candidateFirstName}`}
      </button>
      {!atLimit && (
        <span className="font-mono text-[10px] text-white/30 text-center">
          {draftsUsed ? "Draft used" : `${draftsRemaining} of ${MAX_DRAFTS} drafts left on this report`}
        </span>
      )}
      {modalOpen && (
        <EmailPreviewModal
          candidateEmail={candidateEmail}
          loading={loading}
          error={error}
          draft={draft}
          onDraftChange={setDraft}
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
  onDraftChange,
  onClose,
}: {
  candidateEmail: string;
  loading: boolean;
  error: string | null;
  draft: { subject: string; body: string } | null;
  onDraftChange: (draft: { subject: string; body: string }) => void;
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
              {candidateEmail && (
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                    To
                  </label>
                  <div className="text-[13px] text-white/80 font-mono">{candidateEmail}</div>
                </div>
              )}

              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    onDraftChange({ subject: e.target.value, body });
                  }}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    onDraftChange({ subject, body: e.target.value });
                  }}
                  rows={10}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white leading-relaxed focus:outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
              {candidateEmail ? (
                <a
                  href={mailtoUrl(candidateEmail, subject, body)}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
                >
                  <FiMail size={13} />
                  Open in mail app
                </a>
              ) : (
                <button
                  onClick={() => navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).catch(() => {})}
                  className="w-full flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
                >
                  <FiMail size={13} />
                  Copy email
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  report,
  job,
  rank,
  draftUsedFor,
  draftsRemaining,
  onDraftUsed,
}: {
  report: CandidateReport;
  job: Job;
  rank: number;
  draftUsedFor: Set<string>;
  draftsRemaining: number;
  onDraftUsed: (candidateId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const c = report.candidate;
  const r = report.reasoning;
  const evidence = report.evidence ?? [];
  const alreadyDrafted = draftUsedFor.has(c.candidateId);
  const showOverlap = Boolean(c.timezone) && typeof report.overlapHours === "number";

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
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
          {open ? (
            <FiChevronUp size={16} className="text-white/40" />
          ) : (
            <FiChevronDown size={16} className="text-white/40" />
          )}
        </div>
      </button>

      {!open && r.positiveReasons?.[0] && (
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
          {r.breakdown && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">
                score breakdown
              </div>
              <ScoreBreakdownRow breakdown={r.breakdown} />
            </div>
          )}

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2">
              top repos
            </div>
            <div className="flex flex-col gap-2">
              {evidence.map((repo) => (
                <div key={repo.name} className="border border-white/10 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <a
                      href={repo.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-mono text-[12px] text-white hover:underline"
                    >
                      <SiGithub size={11} className="text-white/40 flex-shrink-0" />
                      {repo.name}
                    </a>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {repo.isLive && repo.liveUrl && (
                        <a
                          href={repo.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-[#3FB950] flex items-center gap-1 hover:underline"
                        >
                          <FiExternalLink size={11} /> live
                        </a>
                      )}
                      {!repo.liveUrl && repo.releaseUrl && (
                        <a
                          href={repo.releaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-white/60 flex items-center gap-1 hover:text-white hover:underline"
                        >
                          <FiExternalLink size={11} /> release{repo.releaseTag ? ` ${repo.releaseTag}` : ""}
                        </a>
                      )}
                    </div>
                  </div>
                  {repo.description && <div className="text-[12px] text-white/60 mb-2">{repo.description}</div>}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(repo.detectedStack ?? []).map((s) => (
                      <StackTag key={s} lang={s} />
                    ))}
                  </div>
                  <div className="font-mono text-[10px] text-white/40">
                    {repo.commits90d ?? 0} commits / {repo.activeWeeks90d ?? 0} active weeks (90d)
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
                        className="flex items-center gap-1.5 font-mono text-[12px] text-white hover:underline min-w-0"
                      >
                        <SiGithub size={11} className="text-white/40 flex-shrink-0" />
                        <span className="truncate">
                          {contrib.repoOwner}/{contrib.repoName}
                        </span>
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
              {showOverlap && (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">
                    timezone overlap
                  </div>
                  <div
                    className={`font-mono text-[12px] ${
                      (report.overlapHours ?? 0) >= job.min_overlap_hours ? "text-white/70" : "text-[#F0883E]"
                    }`}
                  >
                    {report.overlapHours}h{job.min_overlap_hours > 0 ? ` / ${job.min_overlap_hours}h min` : ""}
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
              {(r.positiveReasons ?? []).map((reason, idx) => (
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
              {(r.negativeReasons ?? []).map((reason, idx) => (
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

          <div className="flex flex-col gap-2">
            <DraftEmailButton
              candidateId={c.candidateId}
              candidateEmail={c.email}
              candidateFirstName={c.name.split(" ")[0]}
              draftsUsed={alreadyDrafted}
              draftsRemaining={draftsRemaining}
              onDraftUsed={() => onDraftUsed(c.candidateId)}
            />
          </div>
        </div>
      )}
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
  accent?: "green" | "amber" | "red";
}) {
  const accentClass =
    accent === "green"
      ? "text-[#3FB950]"
      : accent === "amber"
      ? "text-[#F0883E]"
      : accent === "red"
      ? "text-red-400"
      : "text-white";
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

function JobStats({ job, reports }: { job: Job; reports: CandidateReport[] }) {
  const strongCount = reports.filter((r) => r.reasoning?.stackMatch === "strong").length;
  const avgScore =
    reports.length > 0 ? reports.reduce((sum, r) => sum + r.reasoning.score, 0) / reports.length : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
      <StatCard label="scored candidates" value={String(reports.length)} />
      <StatCard label="strong matches" value={String(strongCount)} accent="green" />
      <StatCard label="average score" value={`${avgScore.toFixed(1)}/10`} />
      <StatCard label="min years exp." value={String(job.min_years_experience)} />
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-1">{label}</div>
      <div className="text-[13px] text-white/90">{children}</div>
    </div>
  );
}

function RoleDetails({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const countries = job.location_countries ?? [];
  const timezones = job.timezones ?? [];

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 font-mono text-[12px] rounded-lg border border-white/15 px-3 py-2 text-white/60 hover:text-white hover:border-white/30 transition-colors"
      >
        Role details
        {open ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-3 border border-white/10 rounded-xl bg-white/[0.02] p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Min. years exp.">{job.min_years_experience}</DetailRow>
            <DetailRow label="Location">
              {job.location_mode === "anywhere"
                ? "Remote, anywhere"
                : job.location_mode === "onsite"
                ? "On-site"
                : "Remote, specific country"}
            </DetailRow>
          </div>

          {job.location_mode !== "anywhere" && countries.length > 0 && (
            <DetailRow label={job.location_mode === "onsite" ? "Office countries" : "Required countries"}>
              <div className="flex flex-wrap gap-1.5">
                {countries.map((code) => (
                  <span
                    key={code}
                    className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                  >
                    <CountryFlag code={code} /> {countryName(code)}
                  </span>
                ))}
              </div>
            </DetailRow>
          )}

          {timezones.length > 0 && (
            <DetailRow label="Team timezone(s)">
              <div className="flex flex-wrap gap-1.5">
                {timezones.map((tz) => (
                  <span
                    key={tz}
                    className="font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                  >
                    {tz}
                  </span>
                ))}
              </div>
            </DetailRow>
          )}

          <DetailRow label="Min. overlap hours">{job.min_overlap_hours}</DetailRow>

          {job.description && (
            <DetailRow label="Description">
              <p className="leading-relaxed whitespace-pre-wrap text-white/70">{job.description}</p>
            </DetailRow>
          )}
        </div>
      )}
    </div>
  );
}

type FilterState = {
  minOverall: number;
  minContributions: number;
  minEvidence: number;
  minLlm: number;
  countries: string[];
  minYearsExp: number;
  stack: string[];
};

const DEFAULT_FILTERS: FilterState = {
  minOverall: 0,
  minContributions: 0,
  minEvidence: 0,
  minLlm: 0,
  countries: [],
  minYearsExp: 0,
  stack: [],
};

function isFilterActive(f: FilterState): boolean {
  return (
    f.minOverall > 0 ||
    f.minContributions > 0 ||
    f.minEvidence > 0 ||
    f.minLlm > 0 ||
    f.countries.length > 0 ||
    f.minYearsExp > 0 ||
    f.stack.length > 0
  );
}

function reportMatchesFilters(report: CandidateReport, f: FilterState): boolean {
  const r = report.reasoning;
  const b = r.breakdown;

  if (r.score < f.minOverall) return false;
  if (b) {
    if (b.contributions < f.minContributions) return false;
    if (b.evidenceStrength < f.minEvidence) return false;
    if (b.llmJudgment < f.minLlm) return false;
  } else if (f.minContributions > 0 || f.minEvidence > 0 || f.minLlm > 0) {
    return false;
  }

  if (f.countries.length > 0 && !f.countries.includes(report.candidate.country)) return false;
  if (report.candidate.claimedExperienceYears < f.minYearsExp) return false;

  if (f.stack.length > 0) {
    const candidateStack = new Set(
      (report.evidence ?? []).flatMap((e) => (e.detectedStack ?? []).map((s) => s.toLowerCase()))
    );
    const hasAll = f.stack.every((s) => candidateStack.has(s.toLowerCase()));
    if (!hasAll) return false;
  }

  return true;
}

function ScoreSliderFilter({
  label,
  tooltip,
  value,
  onChange,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Tooltip text={tooltip}>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/50 border-b border-dotted border-white/30 cursor-help">
            {label}
          </span>
        </Tooltip>
        <span className="font-mono text-[11px] font-bold text-white tabular-nums">
          {value === 0 ? "any" : `${value.toFixed(1)}+`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white h-1"
      />
    </div>
  );
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/50 mb-1.5">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`font-mono text-[11px] rounded px-2 py-1 border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "text-white/70 border-white/15 bg-white/[0.04] hover:border-white/30"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterPanel({
  open,
  onClose,
  filters,
  onChange,
  availableCountries,
  availableStack,
  matchCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  availableCountries: string[];
  availableStack: string[];
  matchCount: number;
}) {
  if (!open) return null;

  const toggleCountry = (c: string) =>
    onChange({
      ...filters,
      countries: filters.countries.includes(c)
        ? filters.countries.filter((x) => x !== c)
        : [...filters.countries, c],
    });

  const toggleStack = (s: string) =>
    onChange({
      ...filters,
      stack: filters.stack.includes(s) ? filters.stack.filter((x) => x !== s) : [...filters.stack, s],
    });

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.02] p-4 mb-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScoreSliderFilter
          label="overall"
          tooltip={SCORE_EXPLANATIONS.overall}
          value={filters.minOverall}
          onChange={(v) => onChange({ ...filters, minOverall: v })}
        />
        <ScoreSliderFilter
          label="evidence"
          tooltip={SCORE_EXPLANATIONS.evidenceStrength}
          value={filters.minEvidence}
          onChange={(v) => onChange({ ...filters, minEvidence: v })}
        />
        <ScoreSliderFilter
          label="contributions"
          tooltip={SCORE_EXPLANATIONS.contributions}
          value={filters.minContributions}
          onChange={(v) => onChange({ ...filters, minContributions: v })}
        />
        <ScoreSliderFilter
          label="llm"
          tooltip={SCORE_EXPLANATIONS.llmJudgment}
          value={filters.minLlm}
          onChange={(v) => onChange({ ...filters, minLlm: v })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/50">
            min. years experience
          </span>
          <span className="font-mono text-[11px] font-bold text-white tabular-nums">
            {filters.minYearsExp === 0 ? "any" : `${filters.minYearsExp}+`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={15}
          step={1}
          value={filters.minYearsExp}
          onChange={(e) => onChange({ ...filters, minYearsExp: Number(e.target.value) })}
          className="w-full accent-white h-1"
        />
      </div>

      <MultiSelectFilter
        label="country"
        options={availableCountries}
        selected={filters.countries}
        onToggle={toggleCountry}
      />

      <MultiSelectFilter
        label="stack"
        options={availableStack}
        selected={filters.stack}
        onToggle={toggleStack}
      />

      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <span className="font-mono text-[11px] text-white/40">
          {matchCount} match{matchCount === 1 ? "" : "es"}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="font-mono text-[11px] text-white/50 hover:text-white"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="font-mono text-[11px] text-black bg-white hover:bg-white/90 rounded-lg px-3 py-1.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobReportPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  const [data, setData] = useState<JobReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [draftUsedFor, setDraftUsedFor] = useState<Set<string>>(new Set());

  const load = () => {
    if (!jobId && !USE_MOCK_DATA) return;
    setLoading(true);
    setError(null);

    if (USE_MOCK_DATA) {
      const t = setTimeout(() => {
        setData(mockReportData as unknown as JobReport);
        setLoading(false);
      }, 400);
      return () => clearTimeout(t);
    }

    apiFetch<JobReport>(`/public/jobs/${jobId}/report`)
      .then((res) => setData(res))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const cleanup = load();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const reports = useMemo(
    () => (data?.reports ?? []).filter((r) => !r.pending && r.reasoning),
    [data]
  );

  const availableCountries = useMemo(
    () => Array.from(new Set(reports.map((r) => r.candidate.country).filter(Boolean))).sort(),
    [reports]
  );

  const availableStack = useMemo(
    () =>
      Array.from(
        new Set(reports.flatMap((r) => (r.evidence ?? []).flatMap((e) => e.detectedStack ?? [])))
      ).sort(),
    [reports]
  );

  const filteredReports = useMemo(
    () => reports.filter((r) => reportMatchesFilters(r, filters)),
    [reports, filters]
  );

  const filtersActive = isFilterActive(filters);
  const draftsRemaining = Math.max(0, MAX_DRAFTS - draftUsedFor.size);

  const handleDraftUsed = (candidateId: string) => {
    setDraftUsedFor((prev) => {
      if (prev.has(candidateId)) return prev;
      const next = new Set(prev);
      next.add(candidateId);
      return next;
    });
  };

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
            <button
              onClick={load}
              className="flex items-center gap-2 text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2 transition-colors"
            >
              <FiRefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="mb-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
                screening report
              </div>
              <h1 className="text-[26px] font-bold tracking-tight mb-2">{data.job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                <p className="text-[14px] text-white/60 leading-relaxed max-w-md">
                  We ran this role through groundtruth, here&apos;s how these candidates scored,
                  ranked by verified GitHub evidence.
                </p>
              </div>
              <span className="font-mono text-[11px] text-white/50 border border-white/15 rounded px-2 py-0.5 inline-block mb-3">
                {locationLabel(data.job)}
              </span>
              {data.job.stack.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.job.stack.map((s) => (
                    <StackTag key={s} lang={s} />
                  ))}
                </div>
              )}
            </div>

            <RoleDetails job={data.job} />

            <JobStats job={data.job} reports={reports} />

            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`flex items-center gap-2 font-mono text-[12px] rounded-lg border px-3 py-2 transition-colors ${
                  filtersOpen || filtersActive
                    ? "border-white/30 text-white bg-white/[0.06]"
                    : "border-white/15 text-white/60 hover:text-white hover:border-white/30"
                }`}
              >
                <FiMenu size={13} className="rotate-90" />
                Filters
                {filtersActive && <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950]" />}
              </button>
              {filtersActive && !filtersOpen && (
                <span className="font-mono text-[11px] text-white/40">
                  {filteredReports.length} of {reports.length} shown
                </span>
              )}
            </div>

            <FilterPanel
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              filters={filters}
              onChange={setFilters}
              availableCountries={availableCountries}
              availableStack={availableStack}
              matchCount={filteredReports.length}
            />

            {reports.length === 0 && (
              <div className="text-center py-16 font-mono text-[12px] text-white/40">
                No scored candidates yet, check back shortly.
              </div>
            )}

            {reports.length > 0 && filteredReports.length === 0 && (
              <div className="flex flex-col items-center gap-3 text-center py-16 font-mono text-[12px] text-white/40">
                <span>No candidates match your filters.</span>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2"
                >
                  Clear filters
                </button>
              </div>
            )}

            {filteredReports.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {filteredReports
                  .slice()
                  .sort((a, b) => b.reasoning.score - a.reasoning.score)
                  .map((report, i) => (
                    <CandidateCard
                      key={report.candidateId}
                      report={report}
                      job={data.job}
                      rank={i + 1}
                      draftUsedFor={draftUsedFor}
                      draftsRemaining={draftsRemaining}
                      onDraftUsed={handleDraftUsed}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

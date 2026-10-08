"use client";

import type { ReactNode } from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FiMenu,
  FiX,
  FiPlusCircle,
  FiBriefcase,
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
  FiRefreshCw,
  FiSave,
  FiDownload,
  FiLock,
} from "react-icons/fi";
import { SiGithub, SiX } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { getRecruiterSupabase } from "../../lib/supabase";
import { TechBadge } from "./TechBadge";
import SiteNav from "../components/SiteNav";
import { TechAutocomplete } from "./TechAutocomplete";

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
  overlapHours: number;
  evidence?: Evidence[];
  contributions?: Contribution[];
  reasoning?: Reasoning;
  warning?: string;
  pending?: boolean;
};

type ListReportsResponse = {
  reports: CandidateReport[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unscannedCount?: number;
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
  timezones: string[];
  min_overlap_hours: number;
  candidate_limit: number;
  created_at: string;
};

function encodeQuery(params: Record<string, string>) {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

function mailtoUrl(to: string, subject: string, body: string) {
  return `mailto:${to}?${encodeQuery({ subject, body })}`;
}

// ISO 3166-1 alpha-2 codes. This list is the fixed ISO standard itself (not
// live data), so it's safe to keep as a static array — but names and flags
// are derived at runtime via Intl, not hardcoded.
const ISO_COUNTRY_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN",
  "CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE",
  "EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM",
  "HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM",
  "JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC",
  "LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK",
  "ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG",
  "PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS",
  "ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO",
  "TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
];

const countryNameCache = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

function countryName(iso2: string): string {
  return countryNameCache?.of(iso2) ?? iso2;
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

// Candidate countries may be stored as an ISO code ("DE") or a name ("Germany").
// Resolve either form to an ISO code so we can show a flag.
const countryCodeByName = (() => {
  const map = new Map<string, string>();
  for (const code of ISO_COUNTRY_CODES) map.set(countryName(code).toLowerCase(), code);
  return map;
})();

function resolveCountryCode(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^[A-Za-z]{2}$/.test(v) && ISO_COUNTRY_CODES.includes(v.toUpperCase())) {
    return v.toUpperCase();
  }
  return countryCodeByName.get(v.toLowerCase()) ?? null;
}

function CountryLabel({ value, size = 14 }: { value: string; size?: number }) {
  const code = resolveCountryCode(value);
  if (!code) return <>{value}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <CountryFlag code={code} size={size} />
      {countryName(code)}
    </span>
  );
}

const JOB_COUNTRIES = ISO_COUNTRY_CODES
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function applyUrl(jobId: string) {
  const base = (APP_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}/apply/${jobId}`;
}

function JobLocation({ job }: { job: Job }) {
  if (job.location_mode === "anywhere") return <>Remote, anywhere</>;
  const list = job.location_countries ?? [];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span>{job.location_mode === "onsite" ? "On-site" : "Remote"}</span>
      <span className="text-white/30">·</span>
      {list.length === 0 ? (
        <span>unspecified</span>
      ) : (
        list.map((code) => (
          <span key={code} className="inline-flex items-center gap-1.5">
            <CountryFlag code={code} size={12} />
            {countryName(code)}
          </span>
        ))
      )}
    </span>
  );
}

const FETCH_TIMEOUT_MS = 10000;

class ApiError extends Error {
  status: number;
  data: Record<string, unknown> | null;

  constructor(status: number, message: string, data: Record<string, unknown> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await getRecruiterSupabase().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = await authHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...auth, ...options?.headers },
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

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data: Record<string, unknown> | null = null;
    let message = text || `${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        data = parsed;
        if (typeof parsed.error === "string" && parsed.error) {
          message = parsed.error;
        }
      }
    } catch {
    }
    throw new ApiError(res.status, message, data);
  }
  if (res.status === 204 || res.status === 202) return undefined as T;
  return res.json();
}

const PAGE_SIZE = 20;

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
  overall: "The combined 0–10 score across stack match, evidence strength, contributions, and LLM judgment.",
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

const RESCAN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

function hoursUntilRescan(lastScannedAt: string): number {
  const last = new Date(lastScannedAt).getTime();
  if (Number.isNaN(last)) return 0;
  const remainingMs = RESCAN_COOLDOWN_MS - (Date.now() - last);
  return Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
}

function RescanButton({
  candidateId,
  lastScannedAt,
  onRescanStarted,
}: {
  candidateId: string;
  lastScannedAt: string;
  onRescanStarted: (candidateId: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoursLeft = hoursUntilRescan(lastScannedAt);
  const onCooldown = hoursLeft > 0;

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRescan = async () => {
    if (onCooldown || submitting) return;
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<void>(`/candidates/${candidateId}/rescan`, {
        method: "POST",
      });
      onRescanStarted(candidateId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rescan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={onCooldown || submitting}
        className="flex items-center justify-center gap-2 font-mono text-[12px] text-white/80 hover:text-white disabled:opacity-40 border border-white/15 rounded-lg py-2.5 transition-colors"
      >
        {submitting ? <FiLoader size={13} className="animate-spin" /> : <FiRefreshCw size={13} />}
        {submitting ? "Rescanning..." : onCooldown ? `Rescan available in ${hoursLeft}h` : "Rescan candidate"}
      </button>
      <span className="font-mono text-[10px] text-white/30 text-center">
        Can be regenerated once per 24 hours
      </span>
      {error && (
        <span className="font-mono text-[11px] text-red-400 text-center">{error}</span>
      )}
      {confirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(false);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F0883E]/10">
                  <FiAlertTriangle size={16} className="text-[#F0883E]" />
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-white mb-1">Rescan this candidate?</div>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    This re-runs the analysis and replaces the current report. It counts toward your
                    plan's rescan limit.
                  </p>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-white/10 flex gap-2.5">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRescan}
                  className="flex-1 flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
                >
                  Rescan
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function PendingCandidateCard({ report }: { report: CandidateReport }) {
  const c = report.candidate;
  const label = c.status === "scoring" ? "Scoring..." : c.status === "extracting" ? "Extracting..." : c.status === "extracted" ? "Extracted, queued for scoring" : c.status === "failed" ? "Failed" : c.status === "unscanned" ? "Unscanned, over plan limit" : "Queued";

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[14px] truncate">{c.name}</div>
          <div className="font-mono text-[11px] text-white/40 mt-1">{c.githubUsername}</div>
        </div>
        <span
          className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide flex-shrink-0 ${
            c.status === "failed" ? "text-red-400" : "text-white/50"
          }`}
        >
          {c.status !== "failed" && c.status !== "unscanned" && <FiLoader size={11} className="animate-spin" />}
          {label}
        </span>
      </div>
    </div>
  );
}

function CandidateCard({
  report,
  job,
  onRescanStarted,
}: {
  report: CandidateReport;
  job: Job;
  onRescanStarted: (candidateId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const c = report.candidate;

  if (report.pending || !report.reasoning) {
    return <PendingCandidateCard report={report} />;
  }
  const r = report.reasoning;
  const evidence = report.evidence ?? [];

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
              {evidence.map((r) => (
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
                      {!r.liveUrl && r.releaseUrl && (
                        <a
                          href={r.releaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-white/60 flex items-center gap-1 hover:text-white hover:underline"
                        >
                          <FiExternalLink size={11} /> release{r.releaseTag ? ` ${r.releaseTag}` : ""}
                        </a>
                      )}
                    </div>
                  </div>
                  {r.description && <div className="text-[12px] text-white/60 mb-2">{r.description}</div>}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(r.detectedStack ?? []).map((s) => (
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
                  <div className="font-mono text-[12px] text-white/70 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {[
                      c.city ? <span key="city">{c.city}</span> : null,
                      c.country ? <CountryLabel key="country" value={c.country} /> : null,
                      c.timezone ? <span key="tz">{c.timezone}</span> : null,
                    ]
                      .filter(Boolean)
                      .map((node, i) => (
                        <span key={i} className="inline-flex items-center gap-x-1.5">
                          {i > 0 && <span className="text-white/30">·</span>}
                          {node}
                        </span>
                      ))}
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
              {c.timezone && (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 mb-0.5">
                    timezone overlap
                  </div>
                  <div
                    className={`font-mono text-[12px] ${
                      report.overlapHours >= job.min_overlap_hours ? "text-white/70" : "text-[#F0883E]"
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
            <RescanButton
              candidateId={c.candidateId}
              lastScannedAt={report.lastScannedAt}
              onRescanStarted={onRescanStarted}
            />
            <DraftEmailButton candidateId={c.candidateId} candidateEmail={c.email} candidateFirstName={c.name.split(" ")[0]} />
          </div>
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

  const loadSavedDraft = async () => {
    setModalOpen(true);
    setLoading(true);
    setError(null);
    try {
      let existing: { subject: string; body: string } | null = null;
      try {
        existing = await apiFetch<{ subject: string; body: string }>(
          `/candidates/${candidateId}/outreach`,
          { method: "GET" }
        );
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
      if (existing) {
        setDraft(existing);
      } else {
        const generated = await apiFetch<{ subject: string; body: string }>(
          `/candidates/${candidateId}/outreach`,
          { method: "POST" }
        );
        setDraft(generated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load draft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={loadSavedDraft}
        className="flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
      >
        <FiMail size={13} />
        Draft email to {candidateFirstName}
      </button>
      {modalOpen && (
        <EmailPreviewModal
          candidateId={candidateId}
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
  candidateId,
  candidateEmail,
  loading,
  error,
  draft,
  onDraftChange,
  onClose,
}: {
  candidateId: string;
  candidateEmail: string;
  loading: boolean;
  error: string | null;
  draft: { subject: string; body: string } | null;
  onDraftChange: (draft: { subject: string; body: string }) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const handleRegenerate = async () => {
    setRegenerating(true);
    setActionError(null);
    setSaved(false);
    try {
      const fresh = await apiFetch<{ subject: string; body: string }>(
        `/candidates/${candidateId}/outreach?regenerate=true`,
        { method: "POST" }
      );
      onDraftChange(fresh);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setActionError(null);
    try {
      await apiFetch(`/candidates/${candidateId}/outreach`, {
        method: "PUT",
        body: JSON.stringify({ subject, body }),
      });
      onDraftChange({ subject, body });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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

              {actionError && (
                <span className="font-mono text-[11px] text-red-400">{actionError}</span>
              )}
              {saved && (
                <span className="font-mono text-[11px] text-[#3FB950]">Draft saved</span>
              )}
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex-shrink-0 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || saving}
                  className="flex-1 flex items-center justify-center gap-2 font-mono text-[12px] text-white/80 hover:text-white disabled:opacity-40 border border-white/15 rounded-lg py-2.5 transition-colors"
                >
                  {regenerating ? <FiLoader size={13} className="animate-spin" /> : <FiRefreshCw size={13} />}
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || regenerating}
                  className="flex-1 flex items-center justify-center gap-2 font-mono text-[12px] text-white/80 hover:text-white disabled:opacity-40 border border-white/15 rounded-lg py-2.5 transition-colors"
                >
                  {saving ? <FiLoader size={13} className="animate-spin" /> : <FiSave size={13} />}
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
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
  accent?: "green" | "amber" | "red";
}) {
  const accentClass = accent === "green" ? "text-[#3FB950]" : accent === "amber" ? "text-[#F0883E]" : accent === "red" ? "text-red-400" : "text-white";
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
  if (report.pending || !report.reasoning) {
    return true;
  }

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
  renderOption,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  renderOption?: (opt: string) => ReactNode;
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
              className={`flex items-center font-mono text-[11px] rounded px-2 py-1 border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "text-white/70 border-white/15 bg-white/[0.04] hover:border-white/30"
              }`}
            >
              {renderOption ? renderOption(opt) : opt}
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
        renderOption={(c) => <CountryLabel value={c} size={12} />}
      />

      <MultiSelectFilter
        label="stack"
        options={availableStack}
        selected={filters.stack}
        onToggle={toggleStack}
        renderOption={(s) => (
          <span className="inline-flex items-center gap-1.5">
            <TechBadge name={s} size={12} />
            {s}
          </span>
        )}
      />

      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <span className="font-mono text-[11px] text-white/40">
          {matchCount} match{matchCount === 1 ? "" : "es"} on this page
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

function JobStats({ job, reports, total, unscanned }: { job: Job; reports: CandidateReport[]; total: number; unscanned: number }) {
  const strongCount = reports.filter((r) => r.reasoning?.stackMatch === "strong").length;
  const counted = total - unscanned;
  const atLimit = counted >= job.candidate_limit;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
      <StatCard
        label="scored candidates"
        value={`${counted}/${job.candidate_limit}`}
        detail={atLimit ? "plan limit reached" : `${job.candidate_limit - counted} remaining`}
      />
      {unscanned > 0 && (
        <StatCard
          label="unscanned candidate(s)"
          value={String(unscanned)}
          detail="over plan limit"
          accent="red"
        />
      )}
      <StatCard label="strong matches (this page)" value={String(strongCount)} accent="green" />
      <StatCard label="min years exp." value={String(job.min_years_experience)} />
    </div>
  );
}

export default function CandidatesPage() {
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
  const [autoPrompted, setAutoPrompted] = useState(false);
  const [jobLimitOpen, setJobLimitOpen] = useState(false);
  const [maxJobs, setMaxJobs] = useState<number | null>(null);
  const [exportFormats, setExportFormats] = useState<string[] | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [viewJobOpen, setViewJobOpen] = useState(false);
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const loadJobs = useCallback(() => {
    let cancelled = false;
    setJobsLoading(true);
    setJobsError(null);

    apiFetch<{ maxJobs: number; exportFormats?: string[] }>("/me/plan")
      .then((p) => {
        if (cancelled) return;
        setMaxJobs(p.maxJobs);
        if (p.exportFormats) setExportFormats(p.exportFormats);
      })
      .catch(() => {});

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

  const loadReports = useCallback((jobId: string, pageNum: number, silent = false) => {
    let cancelled = false;
    if (!silent) {
      setReportsLoading(true);
      setReportsError(null);
    }

    apiFetch<ListReportsResponse>(`/jobs/${jobId}/reports?page=${pageNum}&pageSize=${PAGE_SIZE}`)
      .then((data) => !cancelled && setReportsData(data))
      .catch((e) => !cancelled && !silent && setReportsError(e instanceof Error ? e.message : "Failed to load candidates"))
      .finally(() => !cancelled && !silent && setReportsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeJob) return;
    return loadReports(activeJob.id, page);
  }, [activeJob, page, loadReports]);

  useEffect(() => {
    if (!activeJob) return;
    const hasPending = (reportsData?.reports ?? []).some((r) => r.pending);
    if (!hasPending) return;

    const timer = setTimeout(() => {
      loadReports(activeJob.id, page, true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeJob, page, reportsData, loadReports]);

  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    setFiltersOpen(false);
  }, [activeJob?.id]);

  const reportsForHooks = reportsData?.reports ?? [];

  const availableCountries = useMemo(
    () =>
      Array.from(new Set(reportsForHooks.map((r) => r.candidate.country).filter(Boolean))).sort(),
    [reportsForHooks]
  );

  const availableStack = useMemo(
    () =>
      Array.from(
        new Set(reportsForHooks.flatMap((r) => (r.evidence ?? []).flatMap((e) => e.detectedStack ?? [])))
      ).sort(),
    [reportsForHooks]
  );

  const filteredReports = useMemo(
    () => reportsForHooks.filter((r) => reportMatchesFilters(r, filters)),
    [reportsForHooks, filters]
  );

  const handleJobDeleted = (job: Job) => {
    setJobs((prev) => {
      const next = prev.filter((j) => j.id !== job.id);
      if (activeJob?.id === job.id) {
        setActiveJob(next[0] ?? null);
        setPage(1);
      }
      return next;
    });
    setDeleteTarget(null);
  };

  const handleCreateJob = async (payload: CreateJobPayload) => {
    const created = await apiFetch<Job>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setJobs((prev) => [created, ...prev]);
    // First job: keep the empty-state tree mounted so the "Job created" screen
    // (with the apply link) stays visible. The effect below activates it on close.
    if (activeJob) {
      setActiveJob(created);
      setPage(1);
    }
    return created;
  };

  const atJobLimit = maxJobs !== null && maxJobs !== -1 && jobs.length >= maxJobs;
  const openCreateJob = () => (atJobLimit ? setJobLimitOpen(true) : setCreateJobOpen(true));

  // New account with zero jobs: go straight to the create form, once per visit.
  useEffect(() => {
    if (jobsLoading || jobsError || jobs.length > 0 || autoPrompted) return;
    setAutoPrompted(true);
    setCreateJobOpen(true);
  }, [jobsLoading, jobsError, jobs.length, autoPrompted]);

  // After the first job is created and the modal is closed, open its dashboard.
  useEffect(() => {
    if (!activeJob && jobs.length > 0 && !createJobOpen) {
      setActiveJob(jobs[0]);
      setPage(1);
    }
  }, [activeJob, jobs, createJobOpen]);

  const handleUpdateJob = async (jobId: string, payload: CreateJobPayload) => {
    const updated = await apiFetch<Job>(`/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    setActiveJob((prev) => (prev?.id === jobId ? updated : prev));
    return updated;
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
      <div className="min-h-screen bg-black text-white font-sans">
        <div className="mx-auto max-w-3xl px-6 pb-24">
          <SiteNav compact />
          <div className="pt-6">
            <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight mb-3">
              Post your first role
            </h1>
            <p className="text-[14px] text-white/60 leading-relaxed max-w-md mb-6">
              Set the stack you need and get an apply link. Candidates apply with
              GitHub and are scored against this role automatically.
            </p>
            <button
              onClick={openCreateJob}
              className="flex items-center gap-2 font-mono text-[13px] font-semibold text-black bg-white hover:bg-white/90 rounded-lg px-5 py-3"
            >
              <FiPlusCircle size={14} /> Create your first job →
            </button>
          </div>
        </div>
        {createJobOpen && (
          <JobFormModal onClose={() => setCreateJobOpen(false)} onCreate={handleCreateJob} />
        )}
        {jobLimitOpen && <JobLimitModal onClose={() => setJobLimitOpen(false)} />}
      </div>
    );
  }

  const reports = reportsData?.reports ?? [];
  const totalPages = reportsData?.totalPages ?? 1;
  const total = reportsData?.total ?? 0;
  const unscanned = reportsData?.unscannedCount ?? 0;
  const filtersActive = isFilterActive(filters);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <SiteNav
          compact
          leading={
            <>
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
                        <span className="font-mono text-[10px] text-white/35 block">
                          <JobLocation job={job} />
                        </span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(applyUrl(job.id));
                            setCopiedJobId(job.id);
                            setTimeout(() => setCopiedJobId((id) => (id === job.id ? null : id)), 1800);
                          } catch {
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
            </>
          }
          menuTop={(close) => (
            <button
              onClick={() => {
                close();
                openCreateJob();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-left text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10"
            >
              <FiPlusCircle size={15} className="text-white/50" />
              Create job
            </button>
          )}
        />

        {unscanned > 0 && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#D29922]/40 bg-[#D29922]/10 px-3.5 py-2.5">
            <FiAlertTriangle size={14} className="text-[#E3B341] flex-shrink-0 mt-0.5" />
            <span className="text-[12px] leading-relaxed text-[#E3B341]">
              {unscanned} candidate{unscanned === 1 ? " wasn't" : "s weren't"} scanned because you're over your plan's limit.
              <a href="/pricing" className="underline font-semibold hover:text-white">Upgrade your plan</a> and{" "}
              {unscanned === 1 ? "it'll" : "they'll"} be scanned automatically.
            </span>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] font-bold mb-1">{activeJob.title}</h1>
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {total > 0 && (
                <button
                  onClick={() => setExportOpen(true)}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-white/50 hover:text-white border border-white/15 rounded-lg px-2.5 py-1.5"
                >
                  <FiDownload size={11} />
                  Export
                </button>
              )}
              <button
                onClick={() => setViewJobOpen(true)}
                className="font-mono text-[11px] text-white/50 hover:text-white border border-white/15 rounded-lg px-2.5 py-1.5"
              >
                View
              </button>
              {total === 0 && (
                <button
                  onClick={() => setEditJobOpen(true)}
                  className="font-mono text-[11px] text-white/50 hover:text-white border border-white/15 rounded-lg px-2.5 py-1.5"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[12px] text-white/40">
              {total} scored candidates, ranked by verified evidence
            </span>
            <span className="font-mono text-[11px] text-white/50 border border-white/15 rounded px-2 py-0.5">
              <JobLocation job={activeJob} />
            </span>
          </div>
        </div>

        <JobStats job={activeJob} reports={reports} total={total} unscanned={unscanned} />

        {viewJobOpen && <JobDetailsModal job={activeJob} onClose={() => setViewJobOpen(false)} />}
        {exportOpen && (
          <ExportModal job={activeJob} formats={exportFormats} onClose={() => setExportOpen(false)} />
        )}
        {editJobOpen && (
          <JobFormModal
            editJob={activeJob}
            onClose={() => setEditJobOpen(false)}
            onCreate={handleCreateJob}
            onUpdate={handleUpdateJob}
          />
        )}

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
            {filtersActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950]" />
            )}
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

        {!reportsLoading && !reportsError && reports.length > 0 && filteredReports.length === 0 && (
          <div className="flex flex-col items-center gap-3 text-center py-12 font-mono text-[12px] text-white/40">
            <span>No candidates on this page match your filters.</span>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2"
            >
              Clear filters
            </button>
          </div>
        )}

        {!reportsLoading && !reportsError && filteredReports.length > 0 && (
          <div className="flex flex-col gap-2.5 mb-8">
            {filteredReports.map((report) => (
              <CandidateCard
                key={report.candidateId}
                report={report}
                job={activeJob}
                onRescanStarted={(candidateId) =>
                  setReportsData((prev) =>
                    prev
                      ? {
                          ...prev,
                          reports: prev.reports.map((r) =>
                            r.candidateId === candidateId
                              ? { ...r, pending: true, candidate: { ...r.candidate, status: "scoring" } }
                              : r
                          ),
                        }
                      : prev
                  )
                }
              />
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
        <JobFormModal onClose={() => setCreateJobOpen(false)} onCreate={handleCreateJob} />
      )}

      {jobLimitOpen && <JobLimitModal onClose={() => setJobLimitOpen(false)} />}

      {deleteTarget && (
        <DeleteJobModal
          job={deleteTarget}
          isOnlyJob={jobs.length <= 1}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={() => handleJobDeleted(deleteTarget)}
        />
      )}
    </div>
  );
}

function DeleteJobModal({
  job,
  isOnlyJob,
  onCancel,
  onDeleted,
}: {
  job: Job;
  isOnlyJob: boolean;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [confirmToken, setConfirmToken] = useState<string | null>(null);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<void>(
        confirmToken ? `/jobs/${job.id}?confirm_token=${confirmToken}` : `/jobs/${job.id}`,
        { method: "DELETE" }
      );
      onDeleted();
      return;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.data) {
        const token = e.data.confirmToken;
        const count = e.data.candidateCount;
        if (typeof token === "string" && typeof count === "number") {
          setConfirmToken(token);
          setCandidateCount(count);
          setSubmitting(false);
          return;
        }
      }
      setError(e instanceof Error ? e.message : "Failed to delete job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    try {
      await downloadExport(job, "csv", "csv");
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  };

  const needsConfirmation = confirmToken !== null;

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
              {isOnlyJob
                ? "Can't delete your only job"
                : needsConfirmation
                ? "Download a report first"
                : "Delete this job?"}
            </div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              {isOnlyJob ? (
                <>Create another job before deleting <span className="text-white">{job.title}</span>.</>
              ) : needsConfirmation ? (
                <>
                  <span className="text-white">{job.title}</span> has {candidateCount} candidate
                  {candidateCount === 1 ? "" : "s"}. Download a copy of the results before deleting —
                  this can&apos;t be undone.
                </>
              ) : (
                <>
                  <span className="text-white">{job.title}</span> and its candidates will be
                  permanently removed. This can&apos;t be undone.
                </>
              )}
            </p>
          </div>
          {needsConfirmation && (
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 font-mono text-[12px] text-white/80 hover:text-white border border-white/15 rounded-lg py-2.5"
            >
              {downloaded ? <FiCheckCircle size={13} className="text-[#3FB950]" /> : <FiExternalLink size={13} />}
              {downloaded ? "Report downloaded" : "Download report (CSV)"}
            </button>
          )}
          {error && <span className="font-mono text-[11px] text-red-400">{error}</span>}
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
              onClick={handleDelete}
              disabled={submitting || (needsConfirmation && !downloaded)}
              className="flex-1 flex items-center justify-center gap-2 font-mono text-[12px] text-white bg-red-600/90 hover:bg-red-600 disabled:opacity-40 rounded-lg py-2.5"
            >
              {submitting ? <FiLoader size={13} className="animate-spin" /> : null}
              {submitting ? "Deleting..." : needsConfirmation ? "Delete job" : "Delete job"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimezoneMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const allZones = useMemo<string[]>(() => {
    try {
      // Built into the JS runtime — no hardcoded list, no external API.
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allZones;
    return allZones.filter((z) => z.toLowerCase().includes(q));
  }, [allZones, query]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const toggle = (tz: string) => {
    if (selected.includes(tz)) {
      onChange(selected.filter((t) => t !== tz));
    } else {
      onChange([...selected, tz]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/70 focus:outline-none focus:border-white/30"
      >
        <span>{selected.length > 0 ? `${selected.length} zone${selected.length > 1 ? "s" : ""} selected` : "Add a timezone"}</span>
        {open ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-black border border-white/15 rounded-lg shadow-lg flex flex-col max-h-64 overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. Berlin, America/New_York"
            className="w-full bg-white/[0.04] border-b border-white/10 px-3 py-2 text-[12px] text-white placeholder:text-white/30 focus:outline-none"
          />
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-white/30 font-mono">No matches</div>
            )}
            {filtered.map((tz) => (
              <label
                key={tz}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/80 font-mono hover:bg-white/[0.06] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(tz)}
                  onChange={() => toggle(tz)}
                  className="accent-[#3FB950]"
                />
                {tz}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CountryMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JOB_COUNTRIES;
    return JOB_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/70 focus:outline-none focus:border-white/30"
      >
        <span>{selected.length > 0 ? `${selected.length} countr${selected.length > 1 ? "ies" : "y"} selected` : "Add a country"}</span>
        {open ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-black border border-white/15 rounded-lg shadow-lg flex flex-col max-h-64 overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. Nigeria, NG"
            className="w-full bg-white/[0.04] border-b border-white/10 px-3 py-2 text-[12px] text-white placeholder:text-white/30 focus:outline-none"
          />
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-white/30 font-mono">No matches</div>
            )}
            {filtered.map((c) => (
              <label
                key={c.code}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/80 font-mono hover:bg-white/[0.06] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(c.code)}
                  onChange={() => toggle(c.code)}
                  className="accent-[#3FB950]"
                />
                <CountryFlag code={c.code} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}
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
  timezones: string[];
  min_overlap_hours: number;
};

function JobDetailsModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 mb-1">{label}</div>
      <div className="text-[13px] text-white/90">{children}</div>
    </div>
  );

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
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-white/50">Job details</span>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white p-1 -m-1">
            <FiX size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <Row label="Job title">{job.title}</Row>

          <Row label="Stack">
            <div className="flex flex-wrap gap-1.5">
              {(job.stack ?? []).map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                >
                  <TechBadge name={s} size={12} />
                  {s}
                </span>
              ))}
            </div>
          </Row>

          <div className="grid grid-cols-2 gap-3">
            <Row label="Min. years exp.">{job.min_years_experience}</Row>
            <Row label="Location">
              {job.location_mode === "anywhere"
                ? "Remote, anywhere"
                : job.location_mode === "onsite"
                ? "On-site"
                : "Remote, specific country"}
            </Row>
          </div>

          {job.location_mode !== "anywhere" && (
            <Row label={job.location_mode === "onsite" ? "Office countries" : "Required countries"}>
              <div className="flex flex-wrap gap-1.5">
                {(job.location_countries ?? []).map((code) => (
                  <span
                    key={code}
                    className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                  >
                    <CountryFlag code={code} /> {countryName(code)}
                  </span>
                ))}
              </div>
            </Row>
          )}

          <Row label="Team timezone(s)">
            <div className="flex flex-wrap gap-1.5">
              {(job.timezones ?? []).map((tz) => (
                <span
                  key={tz}
                  className="font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                >
                  {tz}
                </span>
              ))}
            </div>
          </Row>

          <Row label="Min. overlap hours">{job.min_overlap_hours}</Row>

          <Row label="Description">
            <p className="leading-relaxed whitespace-pre-wrap text-white/70">{job.description}</p>
          </Row>

          <Row label="Apply link">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5">
              <code className="flex-1 min-w-0 truncate font-mono text-[12px] text-white/60">
                {applyUrl(job.id)}
              </code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(applyUrl(job.id));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {
                  }
                }}
                aria-label="Copy apply link"
                className="flex-shrink-0 text-white/50 hover:text-white p-1"
              >
                {copied ? <FiCheckCircle size={14} className="text-[#3FB950]" /> : <FiCopy size={14} />}
              </button>
            </div>
            {copied && (
              <span className="font-mono text-[11px] text-[#3FB950] mt-1 inline-block">
                Link copied to clipboard
              </span>
            )}
          </Row>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const EXPORT_FORMATS: { id: string; label: string; note: string; ext: string }[] = [
  { id: "json", label: "JSON", note: "Full structured data", ext: "json" },
  { id: "csv", label: "CSV", note: "Opens in any spreadsheet", ext: "csv" },
  { id: "excel", label: "Excel", note: "Multi-sheet workbook", ext: "xlsx" },
  { id: "pdf", label: "PDF", note: "Shareable report", ext: "pdf" },
];

async function downloadExport(job: Job, format: string, ext: string) {
  const res = await fetch(`${API_URL}/jobs/${job.id}/export?format=${format}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const slug = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-candidates.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ExportModal({
  job,
  formats,
  onClose,
}: {
  job: Job;
  formats: string[] | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handle = async (f: { id: string; ext: string }) => {
    if (busy) return;
    setBusy(f.id);
    setError(null);
    setDone(null);
    try {
      await downloadExport(job, f.id, f.ext);
      setDone(f.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold text-white mb-1">Export candidates</div>
            <p className="text-[12px] text-white/50 leading-relaxed">
              Download every scored candidate for {job.title}.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 -m-1 text-white/50 hover:text-white">
            <FiX size={16} />
          </button>
        </div>

        <div className="px-3 pb-3 flex flex-col">
          {EXPORT_FORMATS.map((f) => {
            const allowed = formats === null || formats.includes(f.id);
            return allowed ? (
              <button
                key={f.id}
                onClick={() => handle(f)}
                disabled={busy !== null}
                className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-left hover:bg-white/[0.06] disabled:opacity-50"
              >
                <span>
                  <span className="block text-[13px] text-white">{f.label}</span>
                  <span className="block font-mono text-[11px] text-white/40">{f.note}</span>
                </span>
                {busy === f.id ? (
                  <FiLoader size={14} className="animate-spin text-white/50" />
                ) : done === f.id ? (
                  <FiCheck size={14} className="text-[#3FB950]" />
                ) : (
                  <FiDownload size={14} className="text-white/40" />
                )}
              </button>
            ) : (
              <a
                key={f.id}
                href="/pricing"
                className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.06]"
              >
                <span>
                  <span className="block text-[13px] text-white/50">{f.label}</span>
                  <span className="block font-mono text-[11px] text-white/30">{f.note}</span>
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#E3B341] border border-[#D29922]/40 bg-[#D29922]/10 rounded px-1.5 py-0.5">
                  <FiLock size={10} />
                  Upgrade
                </span>
              </a>
            );
          })}
        </div>

        {error && (
          <div className="px-5 pb-4 font-mono text-[11px] text-red-400 leading-relaxed">{error}</div>
        )}
      </div>
    </div>
  );
}

function JobLimitModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#D29922]/10">
            <FiAlertTriangle size={16} className="text-[#E3B341]" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white mb-1">Job limit reached</div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              You've used all the jobs your plan allows. Upgrade your plan to create more jobs.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg py-2.5"
          >
            Not now
          </button>
          <a
            href="/pricing"
            className="flex-1 text-center font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg py-2.5"
          >
            View plans
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

function JobFormModal({
  onClose,
  onCreate,
  onUpdate,
  editJob,
}: {
  onClose: () => void;
  onCreate: (payload: CreateJobPayload) => Promise<Job>;
  onUpdate?: (jobId: string, payload: CreateJobPayload) => Promise<Job>;
  editJob?: Job;
}) {
  const isEdit = !!editJob;
  const [title, setTitle] = useState(editJob?.title ?? "");
  const [description, setDescription] = useState(editJob?.description ?? "");
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack] = useState<string[]>(editJob?.stack ?? []);
  const [locationMode, setLocationMode] = useState<"anywhere" | "country" | "onsite">(
    editJob?.location_mode ?? "anywhere"
  );
  const [locationCountries, setLocationCountries] = useState<string[]>(editJob?.location_countries ?? []);
  const [minYears, setMinYears] = useState(editJob ? String(editJob.min_years_experience) : "");
  const [timezones, setTimezones] = useState<string[]>(() => {
    if (editJob?.timezones?.length) return editJob.timezones;
    try {
      return [Intl.DateTimeFormat().resolvedOptions().timeZone];
    } catch {
      return [];
    }
  });
  const [minOverlapHours, setMinOverlapHours] = useState(editJob ? String(editJob.min_overlap_hours) : "0");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<{ id: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

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
    timezones.length > 0 &&
    (locationMode === "anywhere" || locationCountries.length > 0);

  const handleCreate = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload: CreateJobPayload = {
      title: title.trim(),
      description: description.trim(),
      stack,
      location_mode: locationMode,
      location_countries: locationMode === "anywhere" ? [] : locationCountries,
      min_years_experience: minYears ? parseInt(minYears, 10) : 0,
      timezones,
      min_overlap_hours: minOverlapHours ? parseInt(minOverlapHours, 10) : 0,
    };
    try {
      if (isEdit && editJob && onUpdate) {
        await onUpdate(editJob.id, payload);
        onClose();
        return;
      }
      const created = await onCreate(payload);
      setCreatedJob({ id: created.id, title: created.title });
      try {
        await navigator.clipboard.writeText(applyUrl(created.id));
        setCopied(true);
      } catch {
      }
    } catch (e) {
      if (!isEdit && e instanceof ApiError && e.status === 403) {
        setLimitReached(true);
        return;
      }
      setSubmitError(e instanceof Error ? e.message : `Failed to ${isEdit ? "update" : "create"} job`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={onClose}
    >
      {limitReached && <JobLimitModal onClose={() => setLimitReached(false)} />}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90vh] bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-white/50">
            {createdJob ? "Job created" : isEdit ? "Edit job" : "Create job"}
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
                    <TechBadge name={s} size={12} />
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
              <TechAutocomplete
                value={stackInput}
                onChange={setStackInput}
                onAdd={(tag) => setStack((prev) => (prev.includes(tag) ? prev : [...prev, tag]))}
                existing={stack}
                placeholder="Rust, PostgreSQL, tokio (press enter to add)"
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

            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                Your team's timezone(s)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {timezones.map((tz) => (
                  <span
                    key={tz}
                    className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                  >
                    {tz}
                    <button
                      onClick={() => setTimezones((prev) => prev.filter((t) => t !== tz))}
                      aria-label={`Remove ${tz}`}
                      className="text-white/40 hover:text-white"
                    >
                      <FiX size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <TimezoneMultiSelect selected={timezones} onChange={setTimezones} />
              <p className="font-mono text-[10px] text-white/30 mt-1">
                Add every zone your team works from. A candidate qualifies if they overlap with at least one.
              </p>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                Min. overlap hours
              </label>
              <input
                type="number"
                min={0}
                max={24}
                step={1}
                inputMode="numeric"
                value={minOverlapHours}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                  if (digitsOnly === "") {
                    setMinOverlapHours("");
                    return;
                  }
                  const clamped = Math.min(24, parseInt(digitsOnly, 10));
                  setMinOverlapHours(String(clamped));
                }}
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === ",") e.preventDefault();
                }}
                placeholder="4"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
              <p className="font-mono text-[10px] text-white/30 mt-1">0–24 hours.</p>
            </div>

            {locationMode !== "anywhere" && (
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
                  {locationMode === "onsite" ? "Office countries" : "Required countries"}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {locationCountries.map((code) => (
                    <span
                      key={code}
                      className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80"
                    >
                      <CountryFlag code={code} /> {countryName(code)}
                      <button
                        onClick={() => setLocationCountries((prev) => prev.filter((x) => x !== code))}
                        aria-label={`Remove ${countryName(code)}`}
                        className="text-white/40 hover:text-white"
                      >
                        <FiX size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <CountryMultiSelect selected={locationCountries} onChange={setLocationCountries} />
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
              {submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create job →"}
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

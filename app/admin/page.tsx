"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FiLock,
  FiLoader,
  FiAlertTriangle,
  FiPlusCircle,
  FiCopy,
  FiCheckCircle,
  FiTrash2,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiUsers,
} from "react-icons/fi";
import { getRecruiterSupabase } from "../../lib/supabase";
import { TechBadge } from "../candidates/TechBadge";
import { TechAutocomplete } from "../candidates/TechAutocomplete";

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

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

const FETCH_TIMEOUT_MS = 20000;
const FORBIDDEN = "FORBIDDEN";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await getRecruiterSupabase().auth.getSession();
  const token = data.session?.access_token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
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
  if (res.status === 403) {
    throw new Error(FORBIDDEN);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

type JobStatus = "draft" | "scanning" | "ready";

type Job = {
  id: string;
  title: string;
  description: string;
  stack: string[];
  location_mode: "anywhere" | "country" | "onsite";
  location_countries: string[];
  min_years_experience: number;
  candidate_count: number;
  scored_count: number;
  status: JobStatus;
  created_at: string;
};

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

const JOB_COUNTRIES = ISO_COUNTRY_CODES
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

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

function reportUrl(jobId: string) {
  const base = (APP_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}/job-report/${jobId}`;
}

// ── candidate paste ───────────────────────────────────────────────────────

function parseGithubLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, ""));
}

function BulkPasteCandidates({
  job,
  onQueued,
}: {
  job: Job;
  onQueued: (jobId: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ queued: number; failed: string[] } | null>(null);

  const usernames = parseGithubLines(raw);

  const handleSubmit = async () => {
    if (usernames.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<{ queued: number; failed: string[] }>(
        `/admin/jobs/${job.id}/candidates/bulk`,
        {
          method: "POST",
          body: JSON.stringify({ github_usernames: usernames }),
        }
      );
      setResult(res);
      if (res.queued > 0) setRaw("");
      onQueued(job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to queue candidates");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-white/10 px-4 py-4 flex flex-col gap-3">
      <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
        Paste GitHub usernames — one per line
      </label>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"var-raphael\nhttps://github.com/octocat\ntorvalds"}
        rows={6}
        className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3.5 py-3 font-mono text-[13px] text-white placeholder:text-white/30 outline-none resize-none transition-colors"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-white/40">
          {usernames.length > 0 ? `${usernames.length} candidate${usernames.length === 1 ? "" : "s"}` : "no candidates yet"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={usernames.length === 0 || submitting}
          className="flex items-center gap-2 font-mono text-[12px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-30 rounded-lg px-4 py-2.5 transition-colors flex-shrink-0"
        >
          {submitting ? <FiLoader size={13} className="animate-spin" /> : null}
          {submitting ? "Queuing..." : "Run scan →"}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 font-mono text-[12px] text-red-400">
          <FiAlertTriangle size={13} /> {error}
        </div>
      )}
      {result && result.queued > 0 && (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#3FB950]">
          <FiCheckCircle size={13} /> Queued {result.queued} candidate{result.queued === 1 ? "" : "s"} for scanning
        </div>
      )}
      {result && result.failed.length > 0 && (
        <div className="font-mono text-[11px] text-[#F0883E] leading-relaxed">
          {result.failed.map((f) => (
            <div key={f}>{f}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── job row ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<JobStatus, { text: string; color: string }> = {
  draft: { text: "no candidates yet", color: "text-white/40" },
  scanning: { text: "scanning", color: "text-[#F0883E]" },
  ready: { text: "ready to share", color: "text-[#3FB950]" },
};

function JobRow({
  job,
  onQueued,
  onDelete,
}: {
  job: Job;
  onQueued: (jobId: string) => void;
  onDelete: (job: Job) => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const status = STATUS_LABEL[job.status];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl(job.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable, button stays clickable to retry */
    }
  };

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[14px] truncate">{job.title}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className={`font-mono text-[11px] ${status.color}`}>
              {job.status === "scanning" && <FiLoader size={10} className="inline animate-spin mr-1" />}
              {status.text}
            </span>
            <span className="font-mono text-[11px] text-white/40 flex items-center gap-1">
              <FiUsers size={11} /> {job.scored_count}/{job.candidate_count} scored
            </span>
          </div>
        </div>
        {open ? <FiChevronUp size={16} className="text-white/40 flex-shrink-0" /> : <FiChevronDown size={16} className="text-white/40 flex-shrink-0" />}
      </button>

      {open && (
        <>
          <BulkPasteCandidates job={job} onQueued={onQueued} />
          <div className="border-t border-white/10 px-4 py-3 flex flex-wrap items-center gap-2.5">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2 transition-colors"
            >
              {copied ? <FiCheckCircle size={13} className="text-[#3FB950]" /> : <FiCopy size={13} />}
              {copied ? "Copied" : "Copy report link"}
            </button>
            <a
              href={`/job-report/${job.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2 transition-colors"
            >
              <FiExternalLink size={13} /> View report
            </a>
            <button
              onClick={() => onDelete(job)}
              className="flex items-center gap-2 font-mono text-[12px] text-red-500/70 hover:text-red-500 border border-red-500/20 rounded-lg px-3 py-2 ml-auto transition-colors"
            >
              <FiTrash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── create job ────────────────────────────────────────────────────────────

type CreateJobPayload = {
  title: string;
  description: string;
  stack: string[];
  location_mode: "anywhere" | "country" | "onsite";
  location_countries: string[];
  min_years_experience: number;
};

function CreateJobForm({ onCreated }: { onCreated: (job: Job) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<"anywhere" | "country" | "onsite">("anywhere");
  const [locationCountries, setLocationCountries] = useState<string[]>([]);
  const [minYears, setMinYears] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    stack.length > 0 &&
    (locationMode === "anywhere" || locationCountries.length > 0);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStack([]);
    setStackInput("");
    setLocationMode("anywhere");
    setLocationCountries([]);
    setMinYears("");
    setExpanded(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateJobPayload = {
        title: title.trim(),
        description: description.trim(),
        stack,
        location_mode: locationMode,
        location_countries: locationMode === "anywhere" ? [] : locationCountries,
        min_years_experience: minYears ? parseInt(minYears, 10) : 0,
      };
      const created = await apiFetch<Job>("/admin/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onCreated(created);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 font-mono text-[13px] font-semibold text-black bg-white hover:bg-white/90 rounded-xl py-4 transition-colors mb-8"
      >
        <FiPlusCircle size={15} /> New job
      </button>
    );
  }

  return (
    <div className="border border-white/15 rounded-xl bg-white/[0.02] p-5 mb-8 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">New job</span>
        <button onClick={reset} aria-label="Cancel" className="text-white/50 hover:text-white p-1 -m-1">
          <FiX size={16} />
        </button>
      </div>

      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
          Job title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Founding Engineer"
          className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors"
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
            placeholder="5"
            className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40 block mb-1">
            Location
          </label>
          <select
            value={locationMode}
            onChange={(e) => setLocationMode(e.target.value as typeof locationMode)}
            className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3 py-2.5 text-[13px] text-white outline-none appearance-none transition-colors"
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
          placeholder="What the role covers and what you're hiring for."
          rows={4}
          className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 leading-relaxed outline-none resize-none transition-colors"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 font-mono text-[12px] text-red-400">
          <FiAlertTriangle size={13} /> {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full flex items-center justify-center gap-2 font-mono text-[13px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-30 rounded-lg py-3 transition-colors"
      >
        {submitting ? <FiLoader size={14} className="animate-spin" /> : null}
        {submitting ? "Creating..." : "Create job →"}
      </button>
    </div>
  );
}

// ── delete confirmation ──────────────────────────────────────────────────

function DeleteJobModal({
  job,
  onCancel,
  onConfirm,
}: {
  job: Job;
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm bg-black border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/10">
            <FiAlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white mb-1">Delete this job?</div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              <span className="text-white">{job.title}</span> and its candidates will be permanently removed, including the report link. This can&apos;t be undone.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex gap-2.5">
          <button onClick={onCancel} className="flex-1 font-mono text-[12px] text-white/70 hover:text-white border border-white/15 rounded-lg py-2.5 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 font-mono text-[12px] text-white bg-red-600/90 hover:bg-red-600 rounded-lg py-2.5 transition-colors">
            Delete job
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 8000;

export default function AdminPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const loadJobs = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<Job[]>("/admin/jobs")
      .then((data) => setJobs(data))
      .catch((e) => {
        if (e instanceof Error && e.message === FORBIDDEN) {
          setForbidden(true);
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load jobs");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const hasScanning = jobs.some((j) => j.status === "scanning");

  useEffect(() => {
    if (!hasScanning) return;
    const timer = setInterval(() => {
      apiFetch<Job[]>("/admin/jobs")
        .then((data) => setJobs(data))
        .catch(() => {
          /* silent — next tick retries */
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasScanning]);

  const refreshJob = useCallback((jobId: string) => {
    apiFetch<Job>(`/admin/jobs/${jobId}`)
      .then((updated) => setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j))))
      .catch(() => {
        /* silent — polling will pick up the real state */
      });
  }, []);

  const handleDelete = async (job: Job) => {
    try {
      await apiFetch(`/admin/jobs/${job.id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete job");
    }
    setDeleteTarget(null);
  };

  const signOut = async () => {
    await getRecruiterSupabase().auth.signOut();
    window.location.href = "/login";
  };

  if (forbidden) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <FiLock size={24} className="text-white/40 mx-auto mb-4" />
          <h1 className="text-[18px] font-bold mb-2">Admin access only</h1>
          <p className="text-[14px] text-white/60 leading-relaxed mb-5">
            This account isn&apos;t on the admin list.
          </p>
          <a
            href="/candidates"
            className="inline-block font-mono text-[12px] text-black bg-white hover:bg-white/90 rounded-lg px-4 py-2.5"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-24">
        <nav className="sticky top-0 z-30 -mx-6 px-6 py-4 flex items-center justify-between font-mono text-[13px] mb-8 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <span className="font-semibold flex items-center gap-2">
            <Logo size={18} /> groundtruth
          </span>
          <span className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-white/40 flex items-center gap-1.5">
              <FiLock size={11} /> admin
            </span>
            <button onClick={signOut} className="font-mono text-[11px] text-white/40 hover:text-white">
              Sign out
            </button>
          </span>
        </nav>

        <div className="mb-6">
          <h1 className="text-[22px] font-bold mb-1">Sourced jobs</h1>
          <p className="font-mono text-[12px] text-white/40">
            Create a job, paste in candidates you&apos;ve sourced, share the report.
          </p>
        </div>

        <CreateJobForm onCreated={(job) => setJobs((prev) => [job, ...prev])} />

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 font-mono text-[12px] text-white/50">
            <FiLoader size={14} className="animate-spin" /> Loading jobs...
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 text-center py-12 font-mono text-[12px] text-red-400">
            <span>{error}</span>
            <button onClick={loadJobs} className="flex items-center gap-2 text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-2 transition-colors">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-12 font-mono text-[12px] text-white/40">
            No jobs yet — create one above to get started.
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onQueued={refreshJob} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteJobModal job={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget)} />
      )}
    </div>
  );
}

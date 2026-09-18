"use client";

import { useState, useEffect, useCallback } from "react";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
const ADMIN_SESSION_KEY = "gt_admin_session";

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

function reportUrl(jobId: string) {
  if (typeof window === "undefined") return `/job-report/${jobId}`;
  return `${window.location.origin}/job-report/${jobId}`;
}

// ── password gate ────────────────────────────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      onUnlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Incorrect password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold justify-center mb-8">
          <Logo size={18} /> groundtruth
        </div>
        <TerminalFrame label="groundtruth / admin">
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white/60">
              <FiLock size={14} />
              <span className="font-mono text-[12px]">Admin access</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Password"
              autoFocus
              className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3.5 py-3 font-mono text-[14px] text-white placeholder:text-white/30 outline-none transition-colors"
            />
            {error && (
              <div className="flex items-center gap-2 font-mono text-[12px] text-red-400">
                <FiAlertTriangle size={13} /> {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!password || submitting}
              className="w-full flex items-center justify-center gap-2 font-mono text-[13px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-30 rounded-lg py-3 transition-colors"
            >
              {submitting ? <FiLoader size={14} className="animate-spin" /> : null}
              {submitting ? "Checking..." : "Enter →"}
            </button>
          </div>
        </TerminalFrame>
      </div>
    </div>
  );
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
  const [success, setSuccess] = useState<number | null>(null);

  const usernames = parseGithubLines(raw);

  const handleSubmit = async () => {
    if (usernames.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/admin/jobs/${job.id}/candidates/bulk`, {
        method: "POST",
        body: JSON.stringify({ github_usernames: usernames }),
      });
      setSuccess(usernames.length);
      setRaw("");
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
      {success !== null && (
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#3FB950]">
          <FiCheckCircle size={13} /> Queued {success} candidate{success === 1 ? "" : "s"} for scanning
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
            <span className={`font-mono text-[11px] ${status.color}`}>{status.text}</span>
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

  const addStackTag = () => {
    const tag = stackInput.trim();
    if (tag && !stack.includes(tag)) setStack((prev) => [...prev, tag]);
    setStackInput("");
  };

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
              {s}
              <button onClick={() => setStack((prev) => prev.filter((t) => t !== s))} aria-label={`Remove ${s}`} className="text-white/40 hover:text-white">
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
          placeholder="Go, Rust — press enter to add"
          className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors"
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
            {locationCountries.map((c) => (
              <span key={c} className="flex items-center gap-1.5 font-mono text-[11px] border border-white/15 bg-white/[0.04] rounded px-2 py-1 text-white/80">
                {c}
                <button onClick={() => setLocationCountries((prev) => prev.filter((x) => x !== c))} aria-label={`Remove ${c}`} className="text-white/40 hover:text-white">
                  <FiX size={11} />
                </button>
              </span>
            ))}
          </div>
          <select
            value=""
            onChange={(e) => {
              const c = e.target.value;
              if (c && !locationCountries.includes(c)) setLocationCountries((prev) => [...prev, c]);
            }}
            className="w-full bg-black border border-white/15 focus:border-white/50 rounded-lg px-3 py-2.5 text-[13px] text-white outline-none appearance-none transition-colors"
          >
            <option value="" className="bg-black">Add a country</option>
            {JOB_COUNTRIES.filter((c) => !locationCountries.includes(c)).map((c) => (
              <option key={c} value={c} className="bg-black">{c}</option>
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

export default function AdminPage() {
  // TEMP: skipping the password gate to preview the dashboard — no backend yet. REVERT before shipping.
  const [unlocked, setUnlocked] = useState<boolean | null>(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  useEffect(() => {
    // TEMP: skip sessionStorage check while unlocked is hardcoded above. REVERT before shipping.
    // setUnlocked(sessionStorage.getItem(ADMIN_SESSION_KEY) === "1");
  }, []);

  // TEMP: mock jobs so the dashboard has something to show without a backend. REVERT before shipping.
  const MOCK_JOBS: Job[] = [
    {
      id: "mock-job-1",
      title: "Founding Engineer",
      description: "Full-stack founding engineer role, Go + Rust backend.",
      stack: ["Go", "Rust", "PostgreSQL", "Docker"],
      location_mode: "anywhere",
      location_countries: [],
      min_years_experience: 5,
      candidate_count: 2,
      scored_count: 2,
      status: "ready",
      created_at: new Date().toISOString(),
    },
    {
      id: "mock-job-2",
      title: "Backend Engineer, Payments",
      description: "Backend engineer for the payments team.",
      stack: ["Go", "PostgreSQL"],
      location_mode: "country",
      location_countries: ["United States", "Canada"],
      min_years_experience: 3,
      candidate_count: 6,
      scored_count: 3,
      status: "scanning",
      created_at: new Date().toISOString(),
    },
    {
      id: "mock-job-3",
      title: "Frontend Engineer",
      description: "React/Next.js frontend engineer, no candidates pasted yet.",
      stack: ["TypeScript", "React", "Next.js"],
      location_mode: "anywhere",
      location_countries: [],
      min_years_experience: 2,
      candidate_count: 0,
      scored_count: 0,
      status: "draft",
      created_at: new Date().toISOString(),
    },
  ];

  const loadJobs = useCallback(() => {
    // TEMP: short-circuit with mock data instead of hitting the real API. REVERT before shipping.
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      setJobs(MOCK_JOBS);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (unlocked) return loadJobs();
  }, [unlocked, loadJobs]);

  // refresh a single job's status after candidates are queued, so scanning
  // state shows up without a full page reload
  const refreshJob = useCallback((jobId: string) => {
    apiFetch<Job>(`/admin/jobs/${jobId}`)
      .then((updated) => setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j))))
      .catch(() => {
        /* silent — next full reload will pick up the real state */
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

  if (unlocked === null) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-24">
        <nav className="sticky top-0 z-30 -mx-6 px-6 py-4 flex items-center justify-between font-mono text-[13px] mb-8 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <span className="font-semibold flex items-center gap-2">
            <Logo size={18} /> groundtruth
          </span>
          <span className="font-mono text-[11px] text-white/40 flex items-center gap-1.5">
            <FiLock size={11} /> admin
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

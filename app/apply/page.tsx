"use client";

import { useState } from "react";
import {
  FiGithub,
  FiMail,
  FiGlobe,
  FiBriefcase,
  FiLinkedin,
  FiTwitter,
  FiCheckCircle,
  FiUser,
} from "react-icons/fi";

// Groundtruth mark, matching the primary nav lockup elsewhere in the app.
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

// language -> accent color, matching the candidates dashboard's stack pills
const LANG_COLORS: Record<string, string> = {
  Go: "text-[#29D3F5] border-[#29D3F5]/50 bg-[#29D3F5]/[0.14]",
  TypeScript: "text-[#5B9FF5] border-[#5B9FF5]/50 bg-[#5B9FF5]/[0.14]",
  JavaScript: "text-[#F5DE4E] border-[#F5DE4E]/50 bg-[#F5DE4E]/[0.14]",
  Python: "text-[#FFD84D] border-[#FFD84D]/50 bg-[#FFD84D]/[0.12]",
  HTML: "text-[#FF7A50] border-[#FF7A50]/50 bg-[#FF7A50]/[0.14]",
  Java: "text-[#FF5A5B] border-[#FF5A5B]/50 bg-[#FF5A5B]/[0.14]",
};
const DEFAULT_LANG_COLOR = "text-white/80 border-white/30 bg-white/[0.06]";

function StackTag({ lang }: { lang: string }) {
  return (
    <span className={`font-mono text-[11px] border rounded px-2 py-0.5 ${LANG_COLORS[lang] ?? DEFAULT_LANG_COLOR}`}>
      {lang}
    </span>
  );
}

// Minimal country list covering common applicant geographies. A real build
// would use a full ISO-3166 list (e.g. via a country-list package) — kept
// short here since the point is the form shape, not exhaustive coverage.
const COUNTRIES = [
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
  "Other",
];

// Country -> primary timezone. Multi-timezone countries (US, Canada, etc.)
// fall back to their most common zone; precise enough for an overlap check,
// not meant to schedule exact meeting times.
const COUNTRY_TIMEZONE: Record<string, string> = {
  "United States": "UTC-5",
  "United Kingdom": "UTC+0",
  Canada: "UTC-5",
  Germany: "UTC+1",
  France: "UTC+1",
  Nigeria: "UTC+1",
  India: "UTC+5:30",
  Brazil: "UTC-3",
  Australia: "UTC+10",
  Japan: "UTC+9",
  Singapore: "UTC+8",
  Netherlands: "UTC+1",
  "South Africa": "UTC+2",
};

type FormState = {
  fullName: string;
  country: string;
  yearsExperience: string;
  github: string; // set once OAuth connects; empty means not connected
  linkedin: string;
  x: string;
  portfolio: string;
  email: string;
};

const initialForm: FormState = {
  fullName: "",
  country: "",
  yearsExperience: "",
  github: "",
  linkedin: "",
  x: "",
  portfolio: "",
  email: "",
};

// mock job context this application is for. a real page would load this
// from the job id in the URL (the /apply/{jobId} link generated elsewhere).
const job = {
  title: "Founding Full-Stack (AI)",
  company: "Groundtruth",
  description:
    "We're building the verification layer for technical hiring. You'll own the pipeline end to end: ingest, scoring, and the report itself.",
  stack: ["Go", "TypeScript", "Python"],
  locationMode: "country" as "anywhere" | "country" | "onsite",
  locationCountries: ["United States", "Canada"],
};

function locationLabel(): string {
  if (job.locationMode === "anywhere") return "Remote, anywhere";
  const countries = job.locationCountries.length > 0 ? job.locationCountries.join(", ") : "unspecified";
  return job.locationMode === "onsite" ? `On-site · ${countries}` : `Remote · ${countries}`;
}

function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-white/40 mb-2">
        {Icon && <Icon size={12} className="text-white/30" />}
        {label}
        {required && <span className="text-[#3FB950]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-black border border-white/15 focus-within:border-white/50 rounded-lg px-3.5 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none transition-colors";

export default function ApplyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  // Placeholder for the real GitHub OAuth handshake (e.g. via Auth.js).
  // On success, the provider returns a verified username, which is what
  // scoring is anchored to, not a free-text field the candidate could fake.
  const connectGithub = () => {
    update({ github: "var-raphael" });
  };

  const canSubmit =
    form.fullName.trim().length > 0 &&
    form.github.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.country.length > 0 &&
    form.yearsExperience.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <FiCheckCircle size={28} className="text-[#3FB950] mx-auto mb-4" />
          <h1 className="text-[20px] font-bold mb-2">Application received</h1>
          <p className="text-[14px] text-white/60 leading-relaxed">
            Groundtruth will read your GitHub activity and generate a report for{" "}
            <span className="text-white">{job.company}</span>. You don&apos;t need to do anything else.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/10">
      <div className="mx-auto max-w-xl px-6 pt-10 pb-24">
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold mb-10">
          <Logo size={18} /> groundtruth
        </div>

        {/* job context */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
          applying to
        </div>
        <h1 className="text-[26px] font-bold tracking-tight mb-1">{job.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4">
          <span className="font-mono text-[13px] text-white/50">{job.company}</span>
          <span className="font-mono text-[11px] text-white/50 border border-white/15 rounded px-2 py-0.5">
            {locationLabel()}
          </span>
        </div>
        <p className="text-[14px] text-white/60 leading-relaxed mb-4 max-w-md">{job.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-10">
          {job.stack.map((s) => (
            <StackTag key={s} lang={s} />
          ))}
        </div>

        {/* GitHub connect — the one required, verified source */}
        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-5 mb-6">
          <Field label="GitHub" icon={FiGithub} required>
            {form.github ? (
              <div className="flex items-center justify-between gap-3 bg-black border border-[#3FB950]/30 rounded-lg px-3.5 py-3">
                <span className="flex items-center gap-2 font-mono text-[14px] text-white">
                  <FiCheckCircle size={14} className="text-[#3FB950]" />
                  github.com/{form.github}
                </span>
                <button
                  onClick={() => update({ github: "" })}
                  className="font-mono text-[11px] text-white/40 hover:text-white"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectGithub}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black font-mono text-[13px] font-semibold rounded-lg py-3 transition-colors"
              >
                <FiGithub size={15} />
                Connect GitHub
              </button>
            )}
            <p className="font-mono text-[11px] text-white/40 mt-2 leading-relaxed">
              We verify this is your account and read your public activity. Nothing is posted
              on your behalf.
            </p>
          </Field>
        </div>

        {/* the rest of the form */}
        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-5 flex flex-col gap-5">
          <Field label="Full name" icon={FiUser} required>
            <input
              value={form.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
              placeholder="Raphael Samuel"
              className={inputClass}
            />
          </Field>

          <Field label="Email" icon={FiMail} required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>

          <Field label="Country" icon={FiGlobe} required>
            <select
              value={form.country}
              onChange={(e) => update({ country: e.target.value })}
              className={`${inputClass} appearance-none`}
            >
              <option value="" className="bg-black">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-black">
                  {c}
                </option>
              ))}
            </select>
            {form.country && COUNTRY_TIMEZONE[form.country] && (
              <p className="font-mono text-[11px] text-white/40 mt-2">
                Timezone inferred as {COUNTRY_TIMEZONE[form.country]}
              </p>
            )}
            {form.country &&
              job.locationMode !== "anywhere" &&
              !job.locationCountries.includes(form.country) && (
                <p className="font-mono text-[11px] text-[#F0883E] mt-2">
                  This role is based in {job.locationCountries.join(", ")}. You can still apply —
                  this is just shown for your awareness.
                </p>
              )}
          </Field>

          <Field label="Years of experience" icon={FiBriefcase} required>
            <input
              type="number"
              min={0}
              value={form.yearsExperience}
              onChange={(e) => update({ yearsExperience: e.target.value })}
              placeholder="4"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="LinkedIn" icon={FiLinkedin}>
              <input
                value={form.linkedin}
                onChange={(e) => update({ linkedin: e.target.value })}
                placeholder="linkedin.com/in/you"
                className={inputClass}
              />
            </Field>
            <Field label="X / Twitter" icon={FiTwitter}>
              <input
                value={form.x}
                onChange={(e) => update({ x: e.target.value })}
                placeholder="x.com/you"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Portfolio (optional)" icon={FiGlobe}>
            <input
              value={form.portfolio}
              onChange={(e) => update({ portfolio: e.target.value })}
              placeholder="yourname.dev"
              className={inputClass}
            />
          </Field>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full mt-6 bg-white hover:bg-white/90 active:bg-white/80 disabled:opacity-30 disabled:hover:bg-white text-black font-mono text-[14px] font-semibold rounded-lg py-3.5 transition-colors"
        >
          Submit application →
        </button>
        <p className="font-mono text-[11px] text-white/40 text-center mt-3">
          Name, GitHub, email, country, and years of experience are required. Everything else
          helps us evaluate you accurately.
        </p>
      </div>
    </div>
  );
}

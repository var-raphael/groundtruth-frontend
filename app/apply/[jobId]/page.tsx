"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  FiGithub,
  FiMail,
  FiGlobe,
  FiBriefcase,
  FiLinkedin,
  FiTwitter,
  FiCheckCircle,
  FiUser,
  FiChevronDown,
  FiMapPin,
  FiLoader,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  SiGo,
  SiTypescript,
  SiJavascript,
  SiPython,
  SiHtml5,
  SiRust,
  SiRuby,
  SiPhp,
  SiSwift,
  SiKotlin,
  SiCplusplus,
  SiSharp,
  SiElixir,
  SiScala,
  SiDart,
} from "react-icons/si";
import type { IconType } from "react-icons";
import * as ct from "countries-and-timezones";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../../../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

type PublicJob = {
  id: string;
  title: string;
  description: string;
  stack: string[];
  location_mode: "anywhere" | "country" | "onsite";
  location_countries: string[];
};

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

const LANG_META: Record<string, { icon: IconType; color: string }> = {
  Go: { icon: SiGo, color: "text-[#29D3F5]" },
  TypeScript: { icon: SiTypescript, color: "text-[#5B9FF5]" },
  JavaScript: { icon: SiJavascript, color: "text-[#F5DE4E]" },
  Python: { icon: SiPython, color: "text-[#FFD84D]" },
  HTML: { icon: SiHtml5, color: "text-[#FF7A50]" },
  Rust: { icon: SiRust, color: "text-[#F0883E]" },
  Ruby: { icon: SiRuby, color: "text-[#FF5A5B]" },
  PHP: { icon: SiPhp, color: "text-[#7C8CF8]" },
  Swift: { icon: SiSwift, color: "text-[#F0883E]" },
  Kotlin: { icon: SiKotlin, color: "text-[#B084F5]" },
  "C++": { icon: SiCplusplus, color: "text-[#5B9FF5]" },
  "C#": { icon: SiSharp, color: "text-[#3FB950]" },
  Elixir: { icon: SiElixir, color: "text-[#B084F5]" },
  Scala: { icon: SiScala, color: "text-[#FF5A5B]" },
  Dart: { icon: SiDart, color: "text-[#29D3F5]" },
};

function StackTag({ lang }: { lang: string }) {
  const meta = LANG_META[lang];
  return (
    <span className="flex items-center gap-1.5 font-mono text-[12px] text-white/80 border border-white/15 rounded px-2.5 py-1">
      {meta?.icon ? <meta.icon size={13} className={meta.color} /> : null}
      {lang}
    </span>
  );
}

function countryFlagUrl(iso2: string): string {
  return `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`;
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

function countryName(iso2: string): string {
  return ct.getCountry(iso2)?.name ?? iso2;
}

// Older or common names people still type for countries the library lists under their newer official name.
const ALT_SEARCH_NAMES: Record<string, string[]> = {
  TR: ["turkey"],
  CZ: ["czech republic"],
  CV: ["cape verde"],
  TL: ["east timor"],
  VA: ["vatican"],
  SZ: ["swaziland"],
  MM: ["burma"],
  CI: ["cote d'ivoire", "cote divoire"],
};

const COUNTRIES = Object.values(ct.getAllCountries())
  .map((c) => ({ code: c.id, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// A zone only counts as genuinely belonging to a country if that country is first in getCountriesForTimezone (ordered by geographic relevance per the lib's docs) — otherwise it's just borrowed.
function ownsZoneOutright(countryCode: string, zoneName: string): boolean {
  const owners = ct.getCountriesForTimezone(zoneName);
  return owners.length > 0 && owners[0].id === countryCode;
}

// Recognizable city names to prefer when several zones share the same offset+DST behavior (e.g. avoid "Detroit"/"Boise" hiding "New York"/"Phoenix").
const PREFERRED_ZONE_NAMES = new Set([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Australia/Sydney",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Europe/London",
  "Europe/Paris",
  "Europe/Moscow",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
]);

function zonesFor(countryCode: string): string[] {
  const all = ct.getTimezonesForCountry(countryCode) ?? [];
  const canonical = all.filter((tz) => !tz.aliasOf);

  const owned = canonical.filter((tz) => ownsZoneOutright(countryCode, tz.name));
  // Ownership filter is a heuristic: skip it if it would collapse a 2+-zone country to just 1 (a sign of a false positive, e.g. Germany/Zurich), not a real leak.
  const leakFiltered = owned.length > 0 && !(canonical.length >= 2 && owned.length === 1) ? owned : canonical;

  const buckets = new Map<string, (typeof leakFiltered)[number][]>();
  for (const tz of leakFiltered) {
    const key = `${tz.utcOffset}|${tz.dstOffset}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(tz);
    else buckets.set(key, [tz]);
  }

  const deduped: string[] = [];
  for (const bucket of buckets.values()) {
    const preferred = bucket.find((tz) => PREFERRED_ZONE_NAMES.has(tz.name));
    deduped.push((preferred ?? bucket[0]).name);
  }
  return deduped;
}

// Capital-city lookup, used only for display when a country's zone is borrowed from elsewhere (e.g. Mali shows "Africa/Abidjan" since no "Africa/Bamako" exists in tzdata).
import capitalCityData from "country-json/src/country-by-capital-city.json";

const CAPITAL_BY_COUNTRY_NAME = new Map<string, string>(
  capitalCityData
    .filter((c): c is { country: string; city: string } => Boolean(c.city))
    .map((c) => [c.country, c.city])
);

// Name mismatches between countries-and-timezones and country-json (diacritics, political naming).
const CAPITAL_NAME_ALIASES: Record<string, string> = {
  "Democratic Republic of the Congo": "The Democratic Republic of Congo",
  "Republic of the Congo": "Congo",
  "Cabo Verde": "Cape Verde",
  Czechia: "Czech Republic",
  Micronesia: "Micronesia, Federated States of",
  "Timor-Leste": "East Timor",
  Türkiye: "Turkey",
  "United States of America": "United States",
  "Holy See": "Holy See (Vatican City State)",
};

function capitalFor(countryCode: string): string | null {
  const name = ct.getCountry(countryCode)?.name;
  if (!name) return null;
  return CAPITAL_BY_COUNTRY_NAME.get(name) ?? CAPITAL_BY_COUNTRY_NAME.get(CAPITAL_NAME_ALIASES[name]) ?? null;
}

// Show the country's own capital instead of a borrowed zone's city name when the zone isn't genuinely this country's own.
function zoneCityLabel(zone: string, countryCode?: string): string {
  if (countryCode) {
    const owners = ct.getCountriesForTimezone(zone);
    const isBorrowed = owners.length > 0 && owners[0].id !== countryCode;
    if (isBorrowed) {
      const capital = capitalFor(countryCode);
      if (capital) return capital;
    }
  }
  const last = zone.split("/").pop() ?? zone;
  return last.replace(/_/g, " ");
}

function utcOffsetLabel(zone: string): string {
  return ct.getTimezone(zone)?.utcOffsetStr ?? "";
}

function needsCity(countryCode: string): boolean {
  return zonesFor(countryCode).length > 1;
}

function inferredZone(countryCode: string): string | null {
  const zones = zonesFor(countryCode);
  return zones.length === 1 ? zones[0] : null;
}

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 20);
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (ALT_SEARCH_NAMES[c.code] ?? []).some((alt) => alt.includes(q))
    ).slice(0, 50);
  }, [query]);

  const selectedCountry = COUNTRIES.find((c) => c.code === value);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-black border border-white/15 focus-within:border-white/50 rounded-lg px-3.5 py-3 text-[14px] text-white focus:outline-none transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedCountry ? (
            <>
              <CountryFlag code={selectedCountry.code} size={15} />
              <span className="truncate">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-white/30">Select country</span>
          )}
        </span>
        <FiChevronDown size={14} className={`flex-shrink-0 text-white/40 ${open ? "rotate-180" : ""} transition-transform`} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-black border border-white/15 rounded-lg shadow-lg flex flex-col max-h-64 overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. Nigeria, NG"
            className="w-full bg-white/[0.04] border-b border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none"
          />
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-white/30 font-mono">No matches</div>
            )}
            {!query && (
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-white/25 font-mono">
                Type to search all countries
              </div>
            )}
            {filtered.map((c) => (
              <button
                type="button"
                key={c.code}
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-white/[0.06] ${
                  value === c.code ? "bg-white/[0.06] text-white" : "text-white/80"
                }`}
              >
                <CountryFlag code={c.code} size={15} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CitySelect({
  countryCode,
  value,
  onChange,
}: {
  countryCode: string;
  value: string;
  onChange: (zone: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const zones = zonesFor(countryCode);

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

  const disabled = zones.length <= 1;
  const selectedLabel = value ? zoneCityLabel(value, countryCode) : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-black border border-white/15 focus-within:border-white/50 disabled:opacity-40 rounded-lg px-3.5 py-3 text-[14px] text-white focus:outline-none transition-colors"
      >
        <span className="truncate">
          {selectedLabel || (
            <span className="text-white/30">
              {!countryCode
                ? "Select a country first"
                : zones.length === 1
                ? "Not needed"
                : zones.length === 0
                ? "Not available"
                : "Select city"}
            </span>
          )}
        </span>
        <FiChevronDown size={14} className={`flex-shrink-0 text-white/40 ${open ? "rotate-180" : ""} transition-transform`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-black border border-white/15 rounded-lg shadow-lg flex flex-col max-h-56 overflow-y-auto">
          {zones.map((zone) => (
            <button
              type="button"
              key={zone}
              onClick={() => {
                onChange(zone);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-left hover:bg-white/[0.06] ${
                value === zone ? "bg-white/[0.06] text-white" : "text-white/80"
              }`}
            >
              {zoneCityLabel(zone, countryCode)}
              <span className="font-mono text-[10px] text-white/30">UTC{utcOffsetLabel(zone)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type FormState = {
  fullName: string;
  country: string;
  city: string;
  yearsExperience: string;
  linkedin: string;
  x: string;
  portfolio: string;
  email: string;
};

const initialForm: FormState = {
  fullName: "",
  country: "",
  city: "",
  yearsExperience: "",
  linkedin: "",
  x: "",
  portfolio: "",
  email: "",
};

function LocationPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/70 border border-white/15 bg-white/[0.03] rounded-md px-2.5 py-1 flex-shrink-0">
      {children}
    </span>
  );
}

function LocationBadge({ job }: { job: PublicJob }) {
  const prefix = job.location_mode === "onsite" ? "On-site" : "Remote";
  const countries = job.location_countries ?? [];

  if (job.location_mode === "anywhere") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <LocationPill>🌐 Remote, anywhere</LocationPill>
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <LocationPill>{prefix} · unspecified</LocationPill>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <LocationPill>{prefix}</LocationPill>
      {countries.map((code) => (
        <LocationPill key={code}>
          <CountryFlag code={code} size={12} />
          {countryName(code)}
        </LocationPill>
      ))}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  trailing,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  required?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-white/40 mb-2">
        {Icon && <Icon size={12} className="text-white/30" />}
        {label}
        {required && <span className="text-[#3FB950]">*</span>}
        {trailing && <span className="ml-auto normal-case tracking-normal">{trailing}</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-black border border-white/15 focus-within:border-white/50 rounded-lg px-3.5 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none transition-colors";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center px-6">
      <div className="max-w-sm text-center">{children}</div>
    </div>
  );
}

export default function ApplyPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId;

  const [job, setJob] = useState<PublicJob | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState<"notfound" | "failed" | null>(null);

  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const [gh, setGh] = useState<{ username: string } | null>(null);
  const [ghChecking, setGhChecking] = useState(true);
  const [ghError, setGhError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    setJobLoading(true);
    setJobError(null);

    fetch(`${API_URL}/public/jobs/${jobId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setJobError("notfound");
          return;
        }
        if (!res.ok) {
          setJobError("failed");
          return;
        }
        setJob((await res.json()) as PublicJob);
      })
      .catch(() => !cancelled && setJobError("failed"))
      .finally(() => !cancelled && setJobLoading(false));

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    let lastKey = "";

    const resolve = async (session: Session | null) => {
      if (cancelled) return;
      if (!session) {
        setGh(null);
        setGhChecking(false);
        return;
      }

      const key = `${session.access_token}|${session.provider_token ? "p" : ""}`;
      if (key === lastKey) return;
      lastKey = key;

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      };

      try {
        const res = session.provider_token
          ? await fetch(`${API_URL}/public/identity`, {
              method: "POST",
              headers,
              body: JSON.stringify({ github_token: session.provider_token }),
            })
          : await fetch(`${API_URL}/public/identity`, { headers });

        if (cancelled) return;

        if (res.ok) {
          const data = (await res.json()) as { github_username: string };
          setGh({ username: data.github_username });
          setGhError(null);
        } else if (res.status === 401) {
          await supabase.auth.signOut();
          setGh(null);
          setGhError("Your GitHub connection expired. Please connect again.");
        } else if (res.status === 403) {
          await supabase.auth.signOut();
          setGh(null);
        } else {
          setGh(null);
        }
      } catch {
        if (!cancelled) {
          setGh(null);
          setGhError("Couldn't reach the server. Please try again.");
        }
      } finally {
        if (!cancelled) setGhChecking(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      resolve(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!gh || !jobId) return;
    let cancelled = false;

    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return null;
        return fetch(`${API_URL}/public/jobs/${jobId}/application`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then(async (res) => {
        if (!res || !res.ok || cancelled) return;
        const data = (await res.json()) as { applied: boolean };
        if (data.applied) setAlreadyApplied(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [gh, jobId]);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const connectGithub = async () => {
    setGhError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (error) setGhError(error.message);
  };

  const disconnectGithub = async () => {
    await getSupabase().auth.signOut();
    setGh(null);
  };

  const cityRequired = needsCity(form.country);

  const hasProofLink =
    form.linkedin.trim().length > 0 || form.x.trim().length > 0 || form.portfolio.trim().length > 0;

  const canSubmit =
    !submitting &&
    form.fullName.trim().length > 0 &&
    gh !== null &&
    hasProofLink &&
    form.email.trim().length > 0 &&
    form.country.length > 0 &&
    (!cityRequired || form.city.trim().length > 0) &&
    form.yearsExperience.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setGh(null);
        setSubmitError("Please connect GitHub again to continue.");
        return;
      }

      const zone = form.city || inferredZone(form.country);
      const city = zone
        ? zoneCityLabel(zone, form.country)
        : capitalFor(form.country) ?? countryName(form.country);

      const res = await fetch(`${API_URL}/public/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          country: countryName(form.country),
          city,
          years_experience: Number.parseInt(form.yearsExperience, 10) || 0,
          linkedin: form.linkedin.trim(),
          x: form.x.trim(),
          portfolio: form.portfolio.trim(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        return;
      }

      const text = await res.text();
      let message = text;
      try {
        message = (JSON.parse(text) as { error?: string }).error ?? text;
      } catch {}

      if (res.status === 401) {
        await getSupabase().auth.signOut();
        setGh(null);
        setSubmitError("Your GitHub connection expired. Please connect again and resubmit.");
      } else if (res.status === 409) {
        setAlreadyApplied(true);
      } else {
        setSubmitError(message || "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (jobLoading) {
    return (
      <Shell>
        <FiLoader size={22} className="animate-spin text-white/40 mx-auto" />
      </Shell>
    );
  }

  if (jobError === "notfound" || !job) {
    return (
      <Shell>
        <FiAlertTriangle size={26} className="text-[#F0883E] mx-auto mb-4" />
        <h1 className="text-[18px] font-bold mb-2">
          {jobError === "failed" ? "Couldn't load this job" : "This job isn't available"}
        </h1>
        <p className="text-[14px] text-white/60 leading-relaxed">
          {jobError === "failed"
            ? "Something went wrong while loading the application. Please try again in a moment."
            : "The link may be wrong, or the role may have been closed."}
        </p>
      </Shell>
    );
  }

  if (alreadyApplied && !submitted) {
    return (
      <Shell>
        <FiCheckCircle size={28} className="text-[#3FB950] mx-auto mb-4" />
        <h1 className="text-[20px] font-bold mb-2">You've already applied</h1>
        <p className="text-[14px] text-white/60 leading-relaxed">
          We already have your application for <span className="text-white">{job.title}</span>.
          You don&apos;t need to do anything else.
        </p>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <FiCheckCircle size={28} className="text-[#3FB950] mx-auto mb-4" />
        <h1 className="text-[20px] font-bold mb-2">Application received</h1>
        <p className="text-[14px] text-white/60 leading-relaxed">
          Groundtruth will read your GitHub activity and generate a report for the hiring team for{" "}
          <span className="text-white">{job.title}</span>. You don&apos;t need to do anything else.
        </p>
      </Shell>
    );
  }

  const jobCountries = job.location_countries ?? [];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/10">
      <div className="mx-auto max-w-xl px-6 pt-10 pb-24">
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold mb-10">
          <Logo size={18} /> groundtruth
        </div>

        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-3">
          applying to
        </div>
        <h1 className="text-[26px] font-bold tracking-tight mb-3">{job.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
          <LocationBadge job={job} />
        </div>
        <p className="text-[14px] text-white/60 leading-relaxed mb-4 max-w-md whitespace-pre-line">
          {job.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-10">
          {(job.stack ?? []).map((s) => (
            <StackTag key={s} lang={s} />
          ))}
        </div>

        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-5 mb-6">
          <Field label="GitHub" icon={FiGithub} required>
            {ghChecking ? (
              <div className="flex items-center gap-2 bg-black border border-white/15 rounded-lg px-3.5 py-3 font-mono text-[13px] text-white/50">
                <FiLoader size={14} className="animate-spin" />
                Checking your GitHub connection…
              </div>
            ) : gh ? (
              <div className="flex items-center justify-between gap-3 bg-black border border-[#3FB950]/30 rounded-lg px-3.5 py-3">
                <span className="flex items-center gap-2 font-mono text-[14px] text-white">
                  <FiCheckCircle size={14} className="text-[#3FB950]" />
                  github.com/{gh.username}
                </span>
                <button
                  onClick={disconnectGithub}
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
            {ghError && <p className="font-mono text-[11px] text-red-400 mt-2">{ghError}</p>}
            <p className="font-mono text-[11px] text-white/40 mt-2 leading-relaxed">
              We verify this is your account and read your public activity. Nothing is posted
              on your behalf.
            </p>
          </Field>
        </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Country" icon={FiGlobe} required>
              <CountrySelect
                value={form.country}
                onChange={(code) => update({ country: code, city: "" })}
              />
            </Field>
            <Field
              label="City"
              icon={FiMapPin}
              required={cityRequired}
              trailing={
                (() => {
                  const zone = form.city || inferredZone(form.country);
                  if (!zone) return null;
                  const offset = utcOffsetLabel(zone);
                  return (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-[#3FB950] border border-[#3FB950]/30 bg-[#3FB950]/10 rounded px-1.5 py-0.5">
                      {zoneCityLabel(zone, form.country)}
                      {offset && <span className="text-[#3FB950]/70">UTC{offset}</span>}
                    </span>
                  );
                })()
              }
            >
              <CitySelect
                countryCode={form.country}
                value={form.city}
                onChange={(zone) => update({ city: zone })}
              />
            </Field>
          </div>
          {form.country && (
            <p className="font-mono text-[11px] text-white/40 -mt-3">
              {cityRequired
                ? `${countryName(form.country)} spans multiple timezones — pick the city closest to you.`
                : !inferredZone(form.country)
                ? "We'll follow up to confirm your timezone."
                : null}
            </p>
          )}
          {form.country &&
            job.location_mode !== "anywhere" &&
            jobCountries.length > 0 &&
            !jobCountries.includes(form.country) && (
              <p className="font-mono text-[11px] text-[#F0883E] -mt-2">
                This role is based in {jobCountries.map((c) => countryName(c)).join(", ")}. You
                can still apply — this is just shown for your awareness.
              </p>
            )}

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

          <Field label="Portfolio" icon={FiGlobe}>
            <input
              value={form.portfolio}
              onChange={(e) => update({ portfolio: e.target.value })}
              placeholder="yourname.dev"
              className={inputClass}
            />
          </Field>
          <p className="font-mono text-[11px] text-white/40 -mt-2">
            Add at least one of LinkedIn, X, or portfolio.
          </p>
        </div>

        {submitError && (
          <p className="font-mono text-[12px] text-red-400 text-center mt-5">{submitError}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full ${submitError ? "mt-3" : "mt-6"} bg-white hover:bg-white/90 active:bg-white/80 disabled:opacity-30 disabled:hover:bg-white text-black font-mono text-[14px] font-semibold rounded-lg py-3.5 transition-colors`}
        >
          {submitting ? "Submitting…" : "Submit application →"}
        </button>
        <p className="font-mono text-[11px] text-white/40 text-center mt-3">
          Name, GitHub, email, country, city (where applicable), years of experience, and at least
          one profile link are required.
        </p>
      </div>
    </div>
  );
}

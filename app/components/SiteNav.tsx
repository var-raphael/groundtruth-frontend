"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { FiMenu, FiX, FiLogIn, FiLogOut, FiGrid, FiTag, FiPhone, FiMail, FiChevronDown, FiBookOpen } from "react-icons/fi";
import { SiX } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { getRecruiterSupabase } from "../../lib/supabase";
import { FOUNDER_GMAIL, FOUNDER_X, FOUNDER_LINKEDIN } from "./founder-contacts";

export function Logo({ size = 20 }: { size?: number }) {
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

// Contact details come from ./founder-contacts so they survive edits to this file.
const FOUNDER_CONTACTS: { label: string; href: string; icon: IconType }[] = [
  { label: "Gmail", href: FOUNDER_GMAIL ? `mailto:${FOUNDER_GMAIL}` : "", icon: FiMail },
  { label: "X", href: FOUNDER_X, icon: SiX },
  { label: "LinkedIn", href: FOUNDER_LINKEDIN, icon: FaLinkedin },
].filter((c) => c.href);

export function FounderContact({
  variant = "link",
  align = "left",
  onNavigate,
}: {
  variant?: "link" | "menu";
  align?: "left" | "center";
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || variant === "menu") return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, variant]);

  const external = (href: string) =>
    href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {};

  if (variant === "menu") {
    return (
      <div className="border-b border-white/10 last:border-b-0">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white"
        >
          <FiPhone size={15} className="text-white/50" />
          <span className="flex-1 text-left">Talk to founder</span>
          <FiChevronDown
            size={14}
            className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="bg-white/[0.03] border-t border-white/10">
            {FOUNDER_CONTACTS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                {...external(href)}
                onClick={onNavigate}
                className="flex items-center gap-3 pl-11 pr-4 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <Icon size={13} className="text-white/50" />
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 font-mono text-[13px] text-white/70 hover:text-white border-b border-dotted border-white/25"
      >
        Talk to founder
        <FiChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute top-full mt-2 w-44 bg-black border border-white/15 rounded-lg overflow-hidden shadow-lg z-20 ${
            align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          }`}
        >
          {FOUNDER_CONTACTS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              {...external(href)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-left font-mono text-[12px] text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10 last:border-b-0"
            >
              <Icon size={13} className="text-white/50" />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SiteNav({
  leading,
  menuTop,
  compact = false,
}: {
  leading?: ReactNode;
  menuTop?: (close: () => void) => ReactNode;
  compact?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let supabase: ReturnType<typeof getRecruiterSupabase>;
    try {
      supabase = getRecruiterSupabase();
    } catch {
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setMenuOpen(false);
    try {
      await getRecruiterSupabase().auth.signOut();
    } catch {}
    window.location.href = "/";
  };

  return (
    <nav
      className={`sticky top-0 z-30 -mx-6 px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 font-mono text-[13px] bg-black/90 backdrop-blur-sm border-b border-white/10 ${
        compact ? "mb-8" : "mb-16"
      }`}
    >
      <a href="/" className="font-semibold flex items-center gap-2">
        <Logo size={18} /> groundtruth
      </a>

      <div className="flex items-center gap-2 min-w-0">
        {leading}
        <div className="relative">
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
            {menuTop?.(() => setMenuOpen(false))}
            <a
              href={signedIn ? "/pricing" : "/pricings"}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10"
            >
              <FiTag size={15} className="text-white/50" />
              Pricing
            </a>
            <a
              href="/blog"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10"
            >
              <FiBookOpen size={15} className="text-white/50" />
              Blog
            </a>
            <FounderContact variant="menu" onNavigate={() => setMenuOpen(false)} />
            {signedIn ? (
              <>
                <a
                  href="/candidates"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white border-b border-white/10"
                >
                  <FiGrid size={15} className="text-white/50" />
                  Dashboard
                </a>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white"
                >
                  <FiLogOut size={15} className="text-white/50" />
                  Logout
                </button>
              </>
            ) : (
              <a
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white"
              >
                <FiLogIn size={15} className="text-white/50" />
                Login
              </a>
            )}
          </div>
        )}
        </div>
      </div>
    </nav>
  );
}

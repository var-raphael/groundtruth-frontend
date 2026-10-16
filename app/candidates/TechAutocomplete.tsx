"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchTech, type TechEntry } from "./techIcons";
import { TechBadge } from "./TechBadge";

/**
 * Text input + dropdown of matching technologies from job-stack.json.
 * Selecting a suggestion (click or Enter/Tab) adds it via onAdd and
 * clears the input. Typing a value that isn't in the dataset and
 * pressing Enter still adds it as free text (existing behavior).
 */
export function TechAutocomplete({
  value,
  onChange,
  onAdd,
  existing,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: (v: string) => void;
  existing: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const results = searchTech(value, 8);
    const existingLower = new Set(existing.map((e) => e.toLowerCase()));
    return results.filter((r) => !existingLower.has(r.name.toLowerCase()));
  }, [value, existing]);

  useEffect(() => setHighlighted(0), [value]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const commit = (entry?: TechEntry) => {
    const tag = (entry?.name ?? value).trim();
    if (tag) onAdd(tag);
    onChange("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setOpen(true);
        setHighlighted((h) => (h + 1) % suggestions.length);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setOpen(true);
        setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
      }
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (open && suggestions.length > 0) {
        commit(suggestions[highlighted]);
      } else {
        commit();
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Tab" && open && suggestions.length > 0) {
      e.preventDefault();
      commit(suggestions[highlighted]);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a click on a suggestion register before we close.
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 bg-black border border-white/15 rounded-lg overflow-hidden shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s)}
              onMouseEnter={() => setHighlighted(idx)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-mono text-[12px] ${
                idx === highlighted ? "bg-white/[0.08] text-white" : "text-white/75"
              }`}
            >
              <TechBadge name={s.name} size={14} />
              <span className="capitalize">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

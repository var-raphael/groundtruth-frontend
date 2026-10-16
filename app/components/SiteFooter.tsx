const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-black border-t border-white/10 px-6 py-6">
      <div className="mx-auto max-w-3xl flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-white/40">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className="hover:text-white/70">
            {l.label}
          </a>
        ))}
        <span className="sm:ml-auto">© {new Date().getFullYear()} Groundtruth</span>
      </div>
    </footer>
  );
}

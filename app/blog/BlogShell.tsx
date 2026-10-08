import Link from "next/link";
import SiteNav from "../components/SiteNav";

// Same frame as the landing page: black bg, max-w-3xl column, SiteNav on top.
export default function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/10">
      <div className="relative mx-auto max-w-3xl px-6 pt-10 pb-24">
        <SiteNav />
        {children}
        <footer className="mt-20 font-mono text-[11px] text-white/40 text-center flex items-center justify-center gap-5">
          <Link href="/" className="text-white/60 border-b border-dotted border-white/20">
            home
          </Link>
          <Link href="/blog" className="text-white/60 border-b border-dotted border-white/20">
            blog
          </Link>
        </footer>
      </div>
    </div>
  );
}

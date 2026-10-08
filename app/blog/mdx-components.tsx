import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

// Styles for markdown content, matching the landing page.
// No @tailwindcss/typography needed.
export const mdxComponents = {
  h2: (p: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-[22px] font-bold tracking-tight mt-12 mb-4" {...p} />
  ),
  h3: (p: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-[18px] font-bold mt-8 mb-3" {...p} />
  ),
  p: (p: ComponentPropsWithoutRef<"p">) => (
    <p className="text-[15px] text-white/70 leading-relaxed mb-5" {...p} />
  ),
  ul: (p: ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc pl-5 mb-5 space-y-2 text-[15px] text-white/70 leading-relaxed marker:text-white/30" {...p} />
  ),
  ol: (p: ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal pl-5 mb-5 space-y-2 text-[15px] text-white/70 leading-relaxed marker:text-white/30" {...p} />
  ),
  strong: (p: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-white" {...p} />
  ),
  a: ({ href = "", ...p }: ComponentPropsWithoutRef<"a">) => {
    const cls = "text-white border-b border-dotted border-white/40 hover:border-white transition-colors";
    return href.startsWith("/") ? (
      <Link href={href} className={cls} {...p} />
    ) : (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...p} />
    );
  },
  blockquote: (p: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-2 border-[#3FB950] pl-4 my-6 text-white/60 italic" {...p} />
  ),
  code: (p: ComponentPropsWithoutRef<"code">) => (
    <code className="font-mono text-[13px] bg-white/10 rounded px-1.5 py-0.5" {...p} />
  ),
  pre: (p: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="rounded-xl border border-white/15 bg-white/[0.02] p-4 overflow-x-auto my-6 font-mono text-[13px] text-white/80 [&_code]:bg-transparent [&_code]:p-0"
      {...p}
    />
  ),
  hr: () => <hr className="border-white/10 my-10" />,
  img: (p: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="rounded-xl border border-white/15 my-6 w-full" alt="" {...p} />
  ),
};

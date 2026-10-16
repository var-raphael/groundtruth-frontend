import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { withV } from "@/lib/asset-version";
import BlogShell from "./BlogShell";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on verifying developer candidates, evidence-based hiring and building groundtruth.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Blog | groundtruth",
    description: "Notes on verifying developer candidates and evidence-based hiring.",
    images: [{ url: withV("/opengraph-image.png"), width: 1200, height: 630 }],
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <BlogShell>
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-4">
        blog
      </div>
      <h1 className="text-[34px] sm:text-[42px] font-bold leading-[1.12] tracking-tight mb-5">
        Notes on hiring
        <br />
        what&apos;s real.
      </h1>
      <p className="text-[16px] text-white/60 leading-relaxed max-w-md mb-14">
        How to verify developer candidates, read GitHub evidence, and stop
        guessing from resumes.
      </p>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.02] p-6 font-mono text-[12px] text-white/40">
          no posts yet
        </div>
      ) : (
        <div className="flex flex-col">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group border-b border-white/10 py-6 first:border-t"
            >
              <time dateTime={p.date} className="font-mono text-[11px] text-white/40">
                {new Date(p.date).toLocaleDateString("en-US", { dateStyle: "long" })}
              </time>
              <div className="mt-2 flex items-start justify-between gap-4">
                <h2 className="text-[19px] font-bold group-hover:text-[#3FB950] transition-colors">
                  {p.title}
                </h2>
                <span className="font-mono text-white/40 group-hover:text-white transition-colors">→</span>
              </div>
              {p.description && (
                <p className="mt-2 text-[14px] text-white/60 leading-relaxed max-w-md">
                  {p.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </BlogShell>
  );
}

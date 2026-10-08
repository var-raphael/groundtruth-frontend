import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPost } from "@/lib/blog";
import { withV } from "@/lib/asset-version";
import { FounderContact } from "../../components/SiteNav";
import BlogShell from "../BlogShell";
import { mdxComponents } from "../mdx-components";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

// Unknown slugs return a clean 404 instead of rendering on demand.
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  // A page-level openGraph replaces the layout's, so images are set again here.
  const image = withV(post.image ?? "/opengraph-image.png");
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author ?? "groundtruth"],
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    image: `${SITE_URL}${withV(post.image ?? "/opengraph-image.png")}`,
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
    author: { "@type": "Organization", name: post.author ?? "groundtruth" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <BlogShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Link
        href="/blog"
        className="font-mono text-[12px] text-white/60 hover:text-white transition-colors"
      >
        ← all posts
      </Link>

      <article className="mt-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 mb-4">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("en-US", { dateStyle: "long" })}
          </time>
          {post.author && <span> · {post.author}</span>}
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-bold leading-[1.15] tracking-tight mb-5">
          {post.title}
        </h1>
        {post.description && (
          <p className="text-[16px] text-white/60 leading-relaxed mb-10 pb-10 border-b border-white/10">
            {post.description}
          </p>
        )}
        <MDXRemote source={post.content} components={mdxComponents} />
      </article>

      <div className="rounded-xl border border-white/15 bg-white/[0.02] p-8 text-center mt-16">
        <div className="text-[20px] font-bold mb-2">Hire on what&apos;s real</div>
        <p className="text-[14px] text-white/60 mb-6 max-w-sm mx-auto leading-relaxed">
          Groundtruth reads a candidate&apos;s GitHub and hands you a report where
          every line traces back to evidence.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <a
            href="/signup"
            className="bg-white hover:bg-white/90 active:bg-white/80 text-black font-mono text-[13px] font-semibold rounded-lg px-5 py-3 transition-colors"
          >
            Create an account →
          </a>
          <FounderContact align="center" />
        </div>
      </div>
    </BlogShell>
  );
}

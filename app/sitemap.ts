import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const posts = getAllPosts();
  const latestPost = posts[0] ? new Date(posts[0].updated ?? posts[0].date) : now;

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricings`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: latestPost, changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated ?? p.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

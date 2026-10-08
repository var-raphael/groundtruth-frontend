import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO string
  updated?: string; // ISO string
  author?: string;
  image?: string; // e.g. "/blog/my-post.png" in public/
};

export type Post = PostMeta & { content: string };

const toISO = (v: unknown) => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

function readPost(file: string): (Post & { draft: boolean }) | null {
  const slug = file.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
  const { data, content } = matter(raw);
  if (!data.title || !data.date) return null;
  return {
    slug,
    title: String(data.title),
    description: String(data.description ?? ""),
    date: toISO(data.date),
    updated: data.updated ? toISO(data.updated) : undefined,
    author: data.author ? String(data.author) : undefined,
    image: data.image ? String(data.image) : undefined,
    draft: Boolean(data.draft),
    content,
  };
}

// All published posts, newest first. Posts with `draft: true` are skipped.


export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(readPost)
    .filter((p): p is Post & { draft: boolean } => !!p && !p.draft)
    .map(({ content: _c, draft: _d, ...meta }) => meta)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPost(slug: string): Post | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null; // blocks path traversal
  for (const ext of ["mdx", "md"]) {
    const file = `${slug}.${ext}`;
    if (fs.existsSync(path.join(BLOG_DIR, file))) {
      const post = readPost(file);
      return post && !post.draft ? post : null;
    }
  }
  return null;
}

import jobStack from "./job-stack.json";

export type TechEntry = {
  name: string;
  type: "icon" | "text";
  label: string;
  color: string;
};

const STACK: TechEntry[] = jobStack as TechEntry[];

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const BY_NORMALIZED_NAME: Map<string, TechEntry> = new Map(
  STACK.map((entry) => [normalize(entry.name), entry])
);

// ---------------------------------------------------------------------------
// Fuzzy fallback matching, carried over from the old manual mapping.
// job-stack.json only matches exact/normalized names ("nodejs", "cplusplus"),
// so this catches messier user input ("Node.js", "C++", "React Router v6")
// that doesn't normalize to an exact dataset entry, by mapping it to a
// simpleicons.org slug instead. Kept as a fallback layer, not a replacement.
// ---------------------------------------------------------------------------
const SIMPLE_ICON_SLUGS: Record<string, string> = {
  // Languages
  go: "go",
  golang: "go",
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  java: "openjdk",
  kotlin: "kotlin",
  swift: "swift",
  rust: "rust",
  php: "php",
  ruby: "ruby",
  dart: "dart",
  c: "c",
  "c++": "cplusplus",
  cpp: "cplusplus",
  "c#": "csharp",
  ".net": "dotnet",

  // Frontend
  react: "react",
  "react router": "reactrouter",
  nextjs: "nextdotjs",
  "next.js": "nextdotjs",
  vue: "vuedotjs",
  nuxt: "nuxt",
  angular: "angular",
  svelte: "svelte",
  solidjs: "solid",
  astro: "astro",
  vite: "vite",
  webpack: "webpack",
  parcel: "parcel",
  html: "html5",
  html5: "html5",
  css: "css",
  css3: "css",
  sass: "sass",
  scss: "sass",
  tailwind: "tailwindcss",
  tailwindcss: "tailwindcss",
  bootstrap: "bootstrap",
  mui: "mui",
  materialui: "mui",
  shadcn: "shadcnui",

  // Backend
  node: "nodedotjs",
  "node.js": "nodedotjs",
  express: "express",
  nestjs: "nestjs",
  fastify: "fastify",
  hono: "hono",
  django: "django",
  flask: "flask",
  fastapi: "fastapi",
  laravel: "laravel",
  spring: "spring",
  springboot: "springboot",
  rails: "rubyonrails",

  // Databases
  postgres: "postgresql",
  postgresql: "postgresql",
  mysql: "mysql",
  mariadb: "mariadb",
  sqlite: "sqlite",
  mongodb: "mongodb",
  redis: "redis",
  elasticsearch: "elasticsearch",
  opensearch: "opensearch",
  cockroachdb: "cockroachlabs",
  cassandra: "apachecassandra",
  dynamodb: "amazondynamodb",
  influxdb: "influxdb",

  // ORMs
  prisma: "prisma",
  drizzle: "drizzle",
  sequelize: "sequelize",
  typeorm: "typeorm",

  // Cloud
  aws: "amazonaws",
  gcp: "googlecloud",
  googlecloud: "googlecloud",
  azure: "microsoftazure",
  cloudflare: "cloudflare",
  vercel: "vercel",
  netlify: "netlify",
  firebase: "firebase",
  supabase: "supabase",

  // Containers / Infra
  docker: "docker",
  kubernetes: "kubernetes",
  helm: "helm",
  terraform: "terraform",
  ansible: "ansible",
  nginx: "nginx",
  traefik: "traefik",

  // CI/CD
  githubactions: "githubactions",
  "github actions": "githubactions",
  gitlabci: "gitlab",
  jenkins: "jenkins",
  circleci: "circleci",

  // Monitoring
  prometheus: "prometheus",
  grafana: "grafana",
  datadog: "datadog",
  sentry: "sentry",
  opentelemetry: "opentelemetry",
  langfuse: "langfuse",

  // Messaging
  kafka: "apachekafka",
  rabbitmq: "rabbitmq",
  nats: "natsdotio",

  // AI
  openai: "openai",
  anthropic: "anthropic",
  langchain: "langchain",
  llamaindex: "llamaindex",
  ollama: "ollama",

  // Mobile
  flutter: "flutter",
  reactnative: "react",
  expo: "expo",

  // Tools
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  vscode: "visualstudiocode",
  postman: "postman",
  insomnia: "insomnia",
  linux: "linux",

  // Package Managers
  npm: "npm",
  yarn: "yarn",
  pnpm: "pnpm",
  bun: "bun",

  // Auth
  auth0: "auth0",
  clerk: "clerk",
  keycloak: "keycloak",

  // Payments
  stripe: "stripe",
  paypal: "paypal",
  paystack: "paystack",

  // CMS
  strapi: "strapi",
  contentful: "contentful",
  sanity: "sanity",

  // Testing
  jest: "jest",
  vitest: "vitest",
  playwright: "playwright",
  cypress: "cypress",
};

// Icons that render black-on-transparent and disappear on our dark UI —
// request the white variant from simpleicons.org for these.
const DARK_ICON_SLUGS = new Set(["nextdotjs", "vercel", "github", "openjdk", "express"]);

function matchSimpleIconSlug(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  if (SIMPLE_ICON_SLUGS[normalized]) return SIMPLE_ICON_SLUGS[normalized];

  const tokens = normalized.split(/[^a-z0-9.#+]+/).filter(Boolean);
  for (const token of tokens) {
    if (SIMPLE_ICON_SLUGS[token]) return SIMPLE_ICON_SLUGS[token];
  }

  const keys = Object.keys(SIMPLE_ICON_SLUGS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length < 3) continue;
    if (normalized.includes(key)) return SIMPLE_ICON_SLUGS[key];
  }

  return null;
}

function simpleIconUrl(slug: string): string {
  return DARK_ICON_SLUGS.has(slug)
    ? `https://cdn.simpleicons.org/${slug}/ffffff`
    : `https://cdn.simpleicons.org/${slug}`;
}

// ---------------------------------------------------------------------------

export type ResolvedTech = {
  entry: TechEntry | null;
  /** Icon image url — from job-stack.json (devicon) or the simpleicons fallback */
  iconUrl: string | null;
  label: string;
  color: string;
};

/**
 * Resolve a free-typed tech name to something renderable, checked in order:
 *  1. job-stack.json exact match, type "icon"  -> devicon image
 *  2. job-stack.json exact match, type "text"  -> no real icon; use its label/color badge
 *  3. no dataset match, but matches the old fuzzy slug map -> simpleicons image
 *  4. nothing matches                          -> generated two-letter badge/color
 */
export function resolveTech(name: string): ResolvedTech {
  const entry = BY_NORMALIZED_NAME.get(normalize(name)) ?? null;

  if (entry && entry.type === "icon") {
    return {
      entry,
      iconUrl: `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${entry.name}/${entry.name}-original.svg`,
      label: entry.label,
      color: entry.color,
    };
  }

  if (entry) {
    // type === "text": dataset has no real icon, use its label/color as the badge
    return { entry, iconUrl: null, label: entry.label, color: entry.color };
  }

  const slug = matchSimpleIconSlug(name);
  if (slug) {
    return {
      entry: null,
      iconUrl: simpleIconUrl(slug),
      label: fallbackLabel(name),
      color: fallbackColor(name),
    };
  }

  // Not found anywhere — generate a stable fallback badge.
  return {
    entry: null,
    iconUrl: null,
    label: fallbackLabel(name),
    color: fallbackColor(name),
  };
}

export function searchTech(query: string, limit = 8): TechEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const starts: TechEntry[] = [];
  const contains: TechEntry[] = [];
  for (const entry of STACK) {
    const n = normalize(entry.name);
    if (n.startsWith(q)) starts.push(entry);
    else if (n.includes(q)) contains.push(entry);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

function fallbackLabel(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned.slice(0, 2) || "?").toUpperCase();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackColor(name: string): string {
  const hue = hashString(name.trim().toLowerCase()) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}
